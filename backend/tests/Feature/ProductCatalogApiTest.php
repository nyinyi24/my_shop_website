<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductCatalogApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_filters_sorts_searches_and_paginates_on_the_server(): void
    {
        $streaming = Category::create(['name' => 'Streaming', 'slug' => 'streaming', 'sort_order' => 1, 'is_active' => true]);
        $tools = Category::create(['name' => 'AI Tools', 'slug' => 'ai-tools', 'sort_order' => 2, 'is_active' => true]);
        $cinema = $this->product($streaming->id, 'Cinema Plus', 5000, 3, true);
        $this->product($streaming->id, 'Music Premium', 2000, 0, false);
        $this->product($tools->id, 'Writing Assistant', 9000, 5, false, 'Smart writing workspace');
        $this->product($tools->id, 'Hidden Tool', 1000, 5, false, 'Hidden', 'hidden');

        $this->getJson('/api/v1/products?category=streaming&availability=available')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.name', 'Cinema Plus')
            ->assertJsonPath('category_counts.streaming', 2)->assertJsonPath('all_products_count', 3);

        $this->getJson('/api/v1/products?search=workspace')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.name', 'Writing Assistant');
        $this->getJson('/api/v1/products?sort=price-low&per_page=2')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.name', 'Music Premium')->assertJsonPath('last_page', 2);
        $this->getJson('/api/v1/products?sort=invalid')->assertUnprocessable();
        $this->getJson('/api/v1/products/'.$cinema->id)->assertOk()->assertJsonPath('name', 'Cinema Plus')->assertJsonPath('related_products.0.name', 'Music Premium');
        $hidden = Product::where('name', 'Hidden Tool')->firstOrFail();
        $this->getJson('/api/v1/products/'.$hidden->id)->assertNotFound();
    }

    private function product(int $categoryId, string $name, int $price, int $stock, bool $featured, string $description = 'Digital product', string $status = 'active'): Product
    {
        return Product::create(['category_id' => $categoryId, 'name' => $name, 'slug' => str($name)->slug(), 'description' => $description, 'price' => $price, 'stock' => $stock, 'warranty_type' => 'standard', 'delivery_time' => '10 minutes', 'status' => $status, 'is_featured' => $featured]);
    }
}
