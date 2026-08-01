<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\AdminActivityLog;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Models\StoreSetting;
use App\Services\StoreSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Notifications\StoreNotification;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Notification;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse{$threshold=app(StoreSettings::class)->get()->low_stock_threshold;return response()->json(['sales_today'=>Order::whereDate('created_at',today())->where('payment_status','approved')->sum('total_amount'),'new_orders'=>Order::whereDate('created_at',today())->count(),'users'=>User::count(),'low_stock'=>Product::whereBetween('stock',[1,$threshold])->count(),'low_stock_threshold'=>$threshold]);}
    public function publicStoreSettings(StoreSettings $settings): JsonResponse{return response()->json($settings->publicData());}
    public function storeSettings(Request $request,StoreSettings $settings): JsonResponse{abort_unless($request->user()->is_main_admin,403,'Store Settings ကို Main Admin သာ စီမံနိုင်ပါသည်။');return response()->json($settings->get());}
    public function updateStoreSettings(Request $request,StoreSettings $settings): JsonResponse
    {
        abort_unless($request->user()->is_main_admin,403,'Store Settings ကို Main Admin သာ စီမံနိုင်ပါသည်။');
        $data=$request->validate(['store_open'=>'required|boolean','store_closed_message'=>'required|string|max:250','support_opens_at'=>'required|date_format:H:i','support_closes_at'=>'required|date_format:H:i|different:support_opens_at','order_expiry_minutes'=>'required|integer|between:10,1440','low_stock_threshold'=>'required|integer|between:1,100']);
        $setting=StoreSetting::query()->firstOrCreate();$setting->update($data);$settings->forget();return response()->json(['message'=>'Store Settings သိမ်းပြီးပါပြီ။','settings'=>$setting->fresh()]);
    }
    public function reports(Request $request): JsonResponse
    {
        $validated = $request->validate(['month' => ['nullable', 'date_format:Y-m']]);
        $selectedMonth = isset($validated['month'])
            ? \Carbon\Carbon::createFromFormat('Y-m', $validated['month'], config('app.timezone'))->startOfMonth()
            : now()->startOfMonth();
        $end = now()->startOfMonth();
        $start = $end->copy()->subMonths(11);
        $sales = Order::query()
            ->where('payment_status', 'approved')
            ->where('created_at', '>=', $start)
            ->get(['id', 'total_amount', 'created_at'])
            ->groupBy(fn (Order $order) => $order->created_at->format('Y-m'));

        $months = collect(range(0, 11))->map(function (int $offset) use ($start, $sales) {
            $month = $start->copy()->addMonths($offset);
            $orders = $sales->get($month->format('Y-m'), collect());

            return [
                'month' => $month->format('Y-m'),
                'sales' => (float) $orders->sum('total_amount'),
                'orders' => $orders->count(),
            ];
        });

        $current = $months->last();
        $lifetimeSales = (float) Order::where('payment_status', 'approved')->sum('total_amount');
        $approvedOrders = Order::where('payment_status', 'approved')->count();
        $selectedOrders = Order::with('items')
            ->where('payment_status', 'approved')
            ->whereBetween('created_at', [$selectedMonth->copy()->startOfMonth(), $selectedMonth->copy()->endOfMonth()])
            ->get();
        $productBreakdown = $selectedOrders->flatMap(fn (Order $order) => $order->items->map(fn ($item) => [
            'order_id' => $order->id,
            'product_name' => $item->product_name,
            'quantity' => $item->quantity,
            'total' => (float) $item->unit_price * $item->quantity,
        ]))->groupBy('product_name')->map(function ($items, string $productName) {
            return [
                'product_name' => $productName,
                'quantity' => (int) $items->sum('quantity'),
                'orders' => $items->pluck('order_id')->unique()->count(),
                'total' => (float) $items->sum('total'),
            ];
        })->sortByDesc('total')->values();

        return response()->json([
            'lifetime_sales' => $lifetimeSales,
            'current_month_sales' => $current['sales'],
            'current_month_orders' => $current['orders'],
            'average_order_value' => $approvedOrders ? round($lifetimeSales / $approvedOrders, 2) : 0,
            'months' => $months,
            'selected_month' => $selectedMonth->format('Y-m'),
            'monthly_summary' => [
                'orders' => $selectedOrders->count(),
                'quantity' => (int) $selectedOrders->flatMap->items->sum('quantity'),
                'revenue' => (float) $selectedOrders->sum('total_amount'),
            ],
            'product_breakdown' => $productBreakdown,
        ]);
    }
    public function orders(): JsonResponse{return response()->json(Order::with(['user','items','payments'])->latest()->paginate(30));}
    public function users(Request $request): JsonResponse{$query=User::latest();if($request->filled('search')){$term=$request->string('search');$query->where(fn($q)=>$q->where('name','like','%'.$term.'%')->orWhere('email','like','%'.$term.'%'));}return response()->json($query->paginate(50));}
    public function activityLogs(Request $request): JsonResponse
    {
        abort_unless($request->user()->is_main_admin, 403, 'Activity Log ကို Main Admin သာ ကြည့်နိုင်ပါသည်။');
        $data = $request->validate([
            'search' => 'nullable|string|max:100', 'event' => 'nullable|string|max:100',
            'date_from' => 'nullable|date', 'date_to' => 'nullable|date|after_or_equal:date_from',
            'page' => 'nullable|integer|min:1',
        ]);
        $query = AdminActivityLog::with('actor:id,name,email,role')->latest('id');
        if (!empty($data['search'])) {
            $term = $data['search'];
            $query->where(function ($q) use ($term) {
                $q->where('description', 'like', "%{$term}%")->orWhere('event', 'like', "%{$term}%")
                    ->orWhere('ip_address', 'like', "%{$term}%")
                    ->orWhereHas('actor', fn ($actor) => $actor->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"));
            });
        }
        if (!empty($data['event'])) $query->where('event', 'like', $data['event'].'.%');
        if (!empty($data['date_from'])) $query->where('created_at', '>=', \Carbon\Carbon::parse($data['date_from'], config('app.timezone'))->startOfDay()->utc());
        if (!empty($data['date_to'])) $query->where('created_at', '<=', \Carbon\Carbon::parse($data['date_to'], config('app.timezone'))->endOfDay()->utc());
        return response()->json($query->paginate(25));
    }
    public function updateUser(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['role' => 'required|in:customer,staff,admin']);
        $actor = $request->user();
        abort_if($user->is_main_admin, 422, 'Main Admin role ကို ပြောင်းလဲ၍မရပါ။');
        abort_if($actor->is($user) && $data['role'] !== 'admin', 422, 'ကိုယ်ပိုင် admin role ကို ဖယ်၍မရပါ။');
        if (! $actor->is_main_admin) {
            abort_if($user->role === 'admin' || $data['role'] === 'admin', 403, 'Admin role ကို Main Admin သာ စီမံနိုင်ပါသည်။');
        }
        $user->update($data);
        return response()->json($user->fresh());
    }
    public function announcements(): JsonResponse{return response()->json(DB::table('announcements')->where('is_active',true)->latest()->get());}
    public function adminAnnouncements(): JsonResponse{return response()->json(DB::table('announcements')->latest()->get());}
    public function userNotifications(Request $request): JsonResponse{$notifications=$request->user()->notifications()->latest()->paginate(30)->toArray();$notifications['unread_count']=$request->user()->unreadNotifications()->count();return response()->json($notifications);}
    public function readAllNotifications(Request $request): JsonResponse{$count=$request->user()->unreadNotifications()->count();$request->user()->unreadNotifications()->update(['read_at'=>now()]);return response()->json(['message'=>'အသိပေးချက်အားလုံးကို ဖတ်ပြီးအဖြစ် သတ်မှတ်ပြီးပါပြီ။','updated'=>$count,'unread_count'=>0]);}
    public function readNotification(Request $request,DatabaseNotification $notification): JsonResponse{abort_unless($notification->notifiable_id===$request->user()->id&&$notification->notifiable_type===User::class,403);$notification->markAsRead();return response()->json($notification->fresh());}
    public function sendNotification(Request $request): JsonResponse{$data=$request->validate(['user_id'=>'nullable|exists:users,id','title'=>'required|string|max:180','message'=>'required|string|max:2000']);$users=isset($data['user_id'])?User::whereKey($data['user_id'])->get():User::where('role','customer')->get();abort_if($users->isEmpty(),422,'ပို့ရန် Customer မရှိပါ။');Notification::send($users,new StoreNotification($data['title'],$data['message']));return response()->json(['message'=>$users->count().' ယောက်ထံ အသိပေးချက်ပို့ပြီးပါပြီ။','sent'=>$users->count()],201);}
    public function updateOrderStatus(Request $request,Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:pending,processing,cancelled',
            'admin_note' => 'nullable|string|max:1000',
        ]);

        abort_if($data['status'] === 'processing' && $order->payment_status !== 'approved', 422, 'Payment အတည်ပြုပြီးမှ Processing ပြောင်းနိုင်ပါသည်။');

        if ($data['status'] !== 'cancelled') {
            $order->update($data);
            $order->recordStatus('status_updated', $data['status'] === 'processing' ? 'Order ကို ပြင်ဆင်ပေးနေပါသည်။' : 'Order အခြေအနေ ပြောင်းလဲထားပါသည်။', $request->user()->id);

            return response()->json($order);
        }

        abort_if(in_array($order->status, ['approved', 'processing', 'completed'], true), 422, 'Payment အတည်ပြုပြီးသော Order ကို refund မလုပ်ဘဲ Cancel မလုပ်နိုင်ပါ။');

        $order = DB::transaction(function () use ($order, $data, $request) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);

            if ($lockedOrder->stock_released_at) {
                abort_unless($lockedOrder->status === 'cancelled', 409, 'Order stock ကို ပြန်ဖြည့်ပြီးသားဖြစ်ပါသည်။');

                return $lockedOrder;
            }

            foreach ($lockedOrder->items()->get() as $item) {
                if ($item->product_id) {
                    Product::query()->whereKey($item->product_id)->increment('stock', $item->quantity);
                }
            }

            $lockedOrder->update([
                ...$data,
                'stock_released_at' => now(),
                'expires_at' => null,
            ]);
            $lockedOrder->recordStatus('order_cancelled', 'Order ကို ပယ်ဖျက်ပြီး reserved stock ပြန်ဖြည့်ထားပါသည်။', $request->user()->id);

            return $lockedOrder->fresh();
        });

        return response()->json($order);
    }
    public function verifyPayment(Request $request,Payment $payment): JsonResponse{$data=$request->validate(['status'=>'required|in:approved,rejected','rejection_reason'=>'nullable|required_if:status,rejected|string|max:500']);abort_unless($payment->status==='pending',422,'ဒီ Payment ကို စစ်ဆေးပြီးသားဖြစ်ပါသည်။');return DB::transaction(function()use($data,$payment,$request){$payment->update([...$data,'verified_by'=>$request->user()->id,'verified_at'=>now()]);$payment->order?->update(['payment_status'=>$data['status'],'status'=>$data['status']==='approved'?'approved':'rejected','expires_at'=>$data['status']==='rejected'?now()->addMinutes(30):null]);$payment->order?->recordStatus($data['status']==='approved'?'payment_approved':'payment_rejected',$data['status']==='approved'?'Payment အတည်ပြုပြီးပါပြီ။':('Payment ပယ်ချခံရပါသည်။ 30 မိနစ်အတွင်း screenshot အသစ်ပြန်တင်နိုင်ပါသည်။ '.$data['rejection_reason']),$request->user()->id);return response()->json($payment);});}
    public function paymentProof(Payment $payment){abort_unless($payment->proof_path&&Storage::disk('private')->exists($payment->proof_path),404,'Payment screenshot မတွေ့ပါ။');return response()->file(Storage::disk('private')->path($payment->proof_path),['Cache-Control'=>'private, max-age=300']);}
    public function uploadDelivery(Request $request,Order $order): JsonResponse{$data=$request->validate(['delivery_file'=>'nullable|file|max:10240','delivery_text'=>'nullable|string|max:5000']);abort_unless(in_array($order->payment_status,['approved']),422,'Payment အတည်ပြုပြီးမှ account info ပို့နိုင်ပါသည်။');abort_if(!$request->hasFile('delivery_file')&&!$request->filled('delivery_text'),422,'Delivery data လိုအပ်ပါသည်။');$payload=$request->hasFile('delivery_file')?$data['delivery_file']->store('deliveries','private'):$data['delivery_text'];$order->items()->update(['delivery_payload'=>encrypt($payload)]);$order->update(['status'=>'completed']);$order->recordStatus('order_completed','Account info ပို့ပြီး Order ပြီးမြောက်ပါပြီ။',$request->user()->id);return response()->json(['message'=>'Account info ပို့ပြီးပါပြီ။']);}
    public function store(Request $request): JsonResponse{$data=$request->validate(['title'=>'required|string|max:180','message'=>'required|string','is_active'=>'boolean']);$now=now();$id=DB::table('announcements')->insertGetId([...$data,'created_at'=>$now,'updated_at'=>$now]);return response()->json(DB::table('announcements')->find($id),201);}
    public function update(Request $request,int $id): JsonResponse{$data=$request->validate(['title'=>'sometimes|string|max:180','message'=>'sometimes|string','is_active'=>'boolean']);DB::table('announcements')->where('id',$id)->update([...$data,'updated_at'=>now()]);return response()->json(DB::table('announcements')->find($id));}
    public function setSubscriptionExpiry(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['service_expires_at' => 'nullable|date|after_or_equal:today']);
        abort_unless($order->payment_status === 'approved', 422, 'Payment အတည်ပြုပြီးသော Order ကိုသာ သက်တမ်းသတ်မှတ်နိုင်ပါသည်။');
        $expiresAt = !empty($data['service_expires_at']) ? \Carbon\Carbon::parse($data['service_expires_at'], config('app.timezone'))->endOfDay()->utc() : null;
        $order->items()->update(['service_expires_at' => $expiresAt]);
        return response()->json(['message' => $expiresAt ? 'Service သက်တမ်းကုန်ဆုံးရက် သတ်မှတ်ပြီးပါပြီ။' : 'Service သက်တမ်းကုန်ဆုံးရက် ဖယ်ရှားပြီးပါပြီ။']);
    }
    public function destroy(int $id): JsonResponse{DB::table('announcements')->where('id',$id)->delete();return response()->json(status:204);}
}
