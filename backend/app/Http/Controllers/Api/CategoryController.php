<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(): JsonResponse { return response()->json(Category::withCount('products')->orderBy('sort_order')->get()); }
    public function show(Category $category): JsonResponse { return response()->json($category->loadCount('products')); }
    public function store(Request $request): JsonResponse { return response()->json(Category::create($this->validated($request)), 201); }
    public function update(Request $request, Category $category): JsonResponse { $category->update($this->validated($request, $category)); return response()->json($category->fresh()->loadCount('products')); }
    public function destroy(Category $category): JsonResponse { abort_if($category->products()->exists(), 422, 'Products ရှိနေသော category ကို ဖျက်၍မရပါ။'); $category->delete(); return response()->json(status: 204); }

    private function validated(Request $request, ?Category $category = null): array
    {
        return $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:110|unique:categories,slug,'.($category?->id ?? 'NULL'),
            'icon' => 'nullable|string|max:30',
            'sort_order' => 'required|integer|min:0|max:999',
            'is_active' => 'required|boolean',
        ]);
    }
}
