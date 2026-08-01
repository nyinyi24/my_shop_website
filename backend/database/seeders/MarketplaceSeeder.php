<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class MarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'AI Tools', 'slug' => 'ai', 'icon' => 'AI', 'sort_order' => 1],
            ['name' => 'VPN Services', 'slug' => 'vpn', 'icon' => 'VPN', 'sort_order' => 2],
            ['name' => 'Mobile Apps', 'slug' => 'apps', 'icon' => 'APP', 'sort_order' => 3],
            ['name' => 'Streaming', 'slug' => 'streaming', 'icon' => 'TV', 'sort_order' => 4],
            ['name' => 'Music Premium', 'slug' => 'music', 'icon' => 'MUSIC', 'sort_order' => 5],
            ['name' => 'Games', 'slug' => 'games', 'icon' => 'GAME', 'sort_order' => 6],
            ['name' => 'Digital Services', 'slug' => 'services', 'icon' => 'PRO', 'sort_order' => 7],
        ];

        foreach ($categories as $attributes) {
            Category::updateOrCreate(['slug' => $attributes['slug']], $attributes + ['is_active' => true]);
        }

        $products = [
            ['category' => 'ai', 'name' => 'Gemini Pro 18 Months', 'slug' => 'gemini-pro-18-months', 'description' => 'Gemini Pro access with 5 TB storage. Terms apply.', 'price' => 8000, 'stock' => 20, 'warranty_type' => 'none', 'delivery_time' => 'After payment verification', 'is_featured' => true],
            ['category' => 'ai', 'name' => 'SuperGrok 12 Months', 'slug' => 'supergrok-12-months', 'description' => 'One-year SuperGrok access.', 'price' => 25000, 'stock' => 7, 'warranty_type' => 'none', 'delivery_time' => 'Estimated 15–30 minutes', 'is_featured' => true],
            ['category' => 'ai', 'name' => 'SuperGrok Full Warranty', 'slug' => 'supergrok-full-warranty', 'description' => 'SuperGrok plan with replacement support under the stated warranty terms.', 'price' => 130000, 'stock' => 5, 'warranty_type' => 'full', 'delivery_time' => 'Estimated 15–30 minutes', 'is_featured' => false],
            ['category' => 'vpn', 'name' => 'Outline VPN SG Key', 'slug' => 'outline-vpn-sg-key', 'description' => 'Singapore server access key with 100 GB data.', 'price' => 3000, 'stock' => 9, 'warranty_type' => 'standard', 'delivery_time' => 'After payment verification', 'is_featured' => true],
            ['category' => 'vpn', 'name' => 'Outline VPN Unlimited', 'slug' => 'outline-vpn-unlimited', 'description' => 'Singapore VPN key subject to fair-use terms.', 'price' => 5000, 'stock' => 2, 'warranty_type' => 'standard', 'delivery_time' => 'After payment verification', 'is_featured' => false],
            ['category' => 'apps', 'name' => 'CapCut Pro Team', 'slug' => 'capcut-pro-team', 'description' => 'One-month CapCut Pro Team access.', 'price' => 10000, 'stock' => 10, 'warranty_type' => 'full', 'delivery_time' => 'Estimated 30 minutes', 'is_featured' => true],
            ['category' => 'ai', 'name' => 'ChatGPT Plus', 'slug' => 'chatgpt-plus', 'description' => 'One-month ChatGPT Plus plan.', 'price' => 40000, 'stock' => 0, 'warranty_type' => 'standard', 'delivery_time' => 'Currently unavailable', 'status' => 'sold_out', 'is_featured' => false],
            ['category' => 'services', 'name' => 'Coursera 12 Months', 'slug' => 'coursera-12-months', 'description' => 'Twelve-month Coursera access with setup assistance.', 'price' => 80000, 'stock' => 1, 'warranty_type' => 'full', 'delivery_time' => 'Estimated 1 hour', 'is_featured' => false],
        ];

        foreach ($products as $attributes) {
            $category = Category::where('slug', $attributes['category'])->firstOrFail();
            unset($attributes['category']);
            Product::updateOrCreate(['slug' => $attributes['slug']], $attributes + ['category_id' => $category->id, 'status' => $attributes['status'] ?? 'active']);
        }
    }
}
