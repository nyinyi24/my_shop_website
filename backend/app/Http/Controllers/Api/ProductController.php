<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function adminIndex(Request $request): JsonResponse { $q=Product::with('category')->latest(); if($request->filled('search'))$q->where('name','like','%'.$request->string('search').'%'); if($request->filled('status'))$q->where('status',$request->string('status')); return response()->json($q->paginate(50)); }
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'category' => ['nullable', 'string', 'max:100'],
            'search' => ['nullable', 'string', 'max:100'],
            'availability' => ['nullable', 'in:available'],
            'sort' => ['nullable', 'in:featured,price-low,price-high,stock'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,24'],
        ]);

        $query = Product::query()->with('category')->where('status', 'active');
        if (!empty($filters['category'])) {
            $query->whereHas('category', fn ($category) => $category->where('slug', $filters['category']));
        }
        if (!empty($filters['search'])) {
            $term = '%'.addcslashes(trim($filters['search']), '%_\\').'%';
            $query->where(function ($product) use ($term) {
                $product->where('name', 'like', $term)
                    ->orWhere('description', 'like', $term)
                    ->orWhereHas('category', fn ($category) => $category->where('name', 'like', $term));
            });
        }
        if (($filters['availability'] ?? null) === 'available') {
            $query->where('stock', '>', 0);
        }

        match ($filters['sort'] ?? 'featured') {
            'price-low' => $query->orderBy('price')->orderBy('id'),
            'price-high' => $query->orderByDesc('price')->orderBy('id'),
            'stock' => $query->orderByDesc('stock')->orderBy('id'),
            default => $query->orderByDesc('is_featured')->latest('id'),
        };

        $categoryCounts = Product::query()
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->where('products.status', 'active')
            ->selectRaw('categories.slug, COUNT(*) as total')
            ->groupBy('categories.slug')
            ->pluck('total', 'slug');

        $products = $query->paginate($filters['per_page'] ?? 12)->withQueryString();

        return response()->json([
            ...$products->toArray(),
            'category_counts' => $categoryCounts,
            'all_products_count' => (int) $categoryCounts->sum(),
        ]);
    }
    public function show(Product $product): JsonResponse
    {
        abort_unless($product->status === 'active' && $product->category()->where('is_active', true)->exists(), 404);
        $product->load('category');
        $product->setAttribute('related_products', Product::query()
            ->with('category')
            ->where('status', 'active')
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->id)
            ->orderByDesc('is_featured')
            ->limit(3)
            ->get());

        return response()->json($product);
    }
    public function store(Request $request): JsonResponse{$data=$this->validated($request);return response()->json(Product::create($data),201);}
    public function update(Request $request,Product $product): JsonResponse{$product->update($this->validated($request));return response()->json($product);}
    public function destroy(Product $product): JsonResponse{$product->update(['status'=>'hidden']);return response()->json(['message'=>'Product ကို ဖျောက်ထားပြီးပါပြီ။']);}
    public function toggleSaved(Request $request,Product $product): JsonResponse{$request->user()->savedProducts()->toggle($product->id);return response()->json(['saved'=>$request->user()->savedProducts()->whereKey($product->id)->exists()]);}
    public function saved(Request $request): JsonResponse{return response()->json($request->user()->savedProducts()->with('category')->where('status','active')->orderByDesc('product_user.product_id')->get());}
    private function validated(Request $request): array{return $request->validate(['category_id'=>'required|exists:categories,id','name'=>'required|string|max:180','slug'=>'required|string|max:190|unique:products,slug,'.optional($request->route('product'))->id,'description'=>'required|string','purchase_note'=>'nullable|string|max:5000','price'=>'required|numeric|min:0','stock'=>'required|integer|min:0','warranty_type'=>'required|in:full,none,standard','delivery_time'=>'required|string|max:100','status'=>'required|in:active,hidden,sold_out','is_featured'=>'boolean']);}
}
