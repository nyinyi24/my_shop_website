<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\OrderExpiryService;

class OrderController extends Controller
{
    public function reviews(): JsonResponse{return response()->json(Review::with(['user:id,name','order:id','order.items:id,order_id,product_name'])->where('is_visible',true)->latest()->paginate(20));}
    public function index(Request $request): JsonResponse{
        app(OrderExpiryService::class)->expireDue($request->user()->id, 20);
        $orders=$request->user()->orders()->with(['items','review','payments:id,order_id,status,rejection_reason,created_at','statusHistory:id,order_id,event,status,payment_status,message,created_at'])->latest()->paginate();
        $orders->through(function(Order $order){
            $order->items->each(function($item)use($order){
                if($order->status!=='completed'||!$item->delivery_payload){$item->delivery_payload=null;return;}
                try{$item->delivery_payload=decrypt($item->delivery_payload);}catch(\Throwable){$item->delivery_payload=null;}
            });
            return $order;
        });
        return response()->json($orders);
    }
    public function store(Request $request): JsonResponse{
        $data=$request->validate(['product_id'=>'required|exists:products,id','quantity'=>'required|integer|min:1|max:10','customer_name'=>'required|string|max:100','phone'=>'required|string|max:30','telegram_username'=>'nullable|string|max:100','payment_method'=>'required|in:kbzpay,wavepay,ayapay','note'=>'nullable|string|max:500']);
        $idempotencyKey = $request->header('Idempotency-Key');
        abort_if($idempotencyKey && !Str::isUuid($idempotencyKey), 422, 'Invalid checkout idempotency key.');
        if ($idempotencyKey) {
            $existing = $request->user()->orders()->where('idempotency_key', $idempotencyKey)->first();
            if ($existing) return response()->json($existing->load('items'));
        }
        $order=DB::transaction(function()use($data,$request,$idempotencyKey){if($idempotencyKey){$existing=Order::where('idempotency_key',$idempotencyKey)->lockForUpdate()->first();if($existing){abort_unless($existing->user_id===$request->user()->id,409);return $existing;}}$product=Product::with('category')->lockForUpdate()->findOrFail($data['product_id']);abort_unless($product->status==='active'&&$product->category?->is_active,422,'ဒီ Product ကို လက်ရှိဝယ်ယူ၍မရပါ။');abort_if($product->stock<$data['quantity'],422,'Stock မလုံလောက်ပါ။');$product->decrement('stock',$data['quantity']);$order=Order::create(['order_number'=>'ENI-'.now()->format('ymd').'-'.strtoupper(Str::random(5)),'idempotency_key'=>$idempotencyKey,'user_id'=>$request->user()->id,'total_amount'=>$product->price*$data['quantity'],'payment_method'=>$data['payment_method'],'payment_status'=>'pending','status'=>'pending','expires_at'=>now()->addMinutes(30),...collect($data)->only(['customer_name','phone','telegram_username','note'])->all()]);$order->items()->create(['product_id'=>$product->id,'product_name'=>$product->name,'unit_price'=>$product->price,'quantity'=>$data['quantity'],'warranty_snapshot'=>$product->warranty_type]);$order->recordStatus('order_created','Order တင်ပြီးပါပြီ။ Payment ကို 30 မိနစ်အတွင်းတင်ပေးပါ။',$request->user()->id);return $order;});
        return response()->json($order->load('items'),$order->wasRecentlyCreated?201:200);
    }
    public function submitPayment(Request $request, Order $order, OrderExpiryService $expiry): JsonResponse
    {
        $this->authorize('update', $order);
        if ($order->expires_at?->isPast()) {
            $expiry->expire($order->id);
            abort(422, 'Payment တင်ချိန်ကုန်သွားသဖြင့် Order ပယ်ဖျက်ပြီးပါပြီ။');
        }
        $data = $request->validate(['proof' => 'required|image|max:5120']);

        $payment = DB::transaction(function () use ($order, $data) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            abort_if(in_array($lockedOrder->status, ['approved', 'processing', 'completed', 'cancelled'], true), 422, 'ဒီ Order အတွက် Payment ပြန်တင်၍မရပါ။');
            abort_if($lockedOrder->payments()->whereIn('status', ['pending', 'approved'])->exists(), 422, 'ဒီ Order အတွက် Payment screenshot တင်ပြီးသားဖြစ်ပါသည်။');

            $path = $data['proof']->store('payment-proofs', 'private');
            $payment = $lockedOrder->payments()->create([
                'method' => $lockedOrder->payment_method,
                'amount' => $lockedOrder->total_amount,
                'proof_path' => $path,
                'status' => 'pending',
            ]);
            $lockedOrder->update(['payment_status' => 'pending', 'status' => 'pending', 'expires_at' => null]);
            $lockedOrder->recordStatus('payment_submitted', 'Payment screenshot တင်ပြီး စစ်ဆေးရန်စောင့်နေပါသည်.', $lockedOrder->user_id);

            return $payment;
        });

        return response()->json($payment, 201);
    }
    public function cancel(Request $request, Order $order, OrderExpiryService $expiry): JsonResponse
    {
        $this->authorize('update', $order);
        $cancelled = $expiry->cancelByCustomer($order->id, $request->user()->id);
        abort_unless($cancelled, 404);
        return response()->json($cancelled);
    }
    public function track(string $orderNumber): JsonResponse{$order=Order::where('order_number',$orderNumber)->firstOrFail();return response()->json($order->only(['order_number','status','payment_status','created_at']));}
    public function review(Request $request,Order $order): JsonResponse{$this->authorize('update',$order);$data=$this->validatedReview($request);abort_unless($order->status==='completed',422,'ပြီးမြောက်သော Order ကိုသာ Review ပေးနိုင်ပါသည်။');abort_if($order->review()->exists(),422,'ဒီ Order အတွက် Review ရေးပြီးသားဖြစ်ပါသည်။');return response()->json($order->review()->create([...$data,'user_id'=>$request->user()->id,'verified_buyer'=>true]),201);}
    public function updateReview(Request $request,Review $review): JsonResponse{$this->authorizeReviewOwner($request,$review);$review->update($this->validatedReview($request));return response()->json($review->fresh());}
    public function deleteReview(Request $request,Review $review): JsonResponse{$this->authorizeReviewOwner($request,$review);$review->delete();return response()->json(status:204);}
    private function validatedReview(Request $request): array{return $request->validate(['rating'=>'required|integer|between:1,5','comment'=>'required|string|min:3|max:1000']);}
    private function authorizeReviewOwner(Request $request,Review $review): void{abort_unless($review->user_id===$request->user()->id,403,'ကိုယ်ပိုင် Review ကိုသာ ပြင်ဆင်နိုင်ပါသည်။');}
}
