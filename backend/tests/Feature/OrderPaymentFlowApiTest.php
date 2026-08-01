<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderPaymentFlowApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_cancel_unpaid_order_and_stock_is_released_once(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $category = Category::create(['name' => 'Customer Cancel', 'slug' => 'customer-cancel', 'sort_order' => 1, 'is_active' => true]);
        $product = Product::create(['category_id' => $category->id, 'name' => 'Cancelable Product', 'slug' => 'cancelable-product', 'description' => 'Test', 'price' => 4000, 'stock' => 2, 'warranty_type' => 'standard', 'delivery_time' => '10 minutes', 'status' => 'active']);

        $this->actingAs($customer, 'sanctum');
        $order = $this->postJson('/api/v1/orders', ['product_id' => $product->id, 'quantity' => 1, 'customer_name' => 'Customer', 'phone' => '09912345678', 'payment_method' => 'kbzpay'])->assertCreated()->json();
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 1]);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $customer->id]);

        $this->patchJson('/api/v1/orders/'.$order['id'].'/cancel')->assertOk()->assertJsonPath('status', 'cancelled');
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 2]);
        $this->assertDatabaseHas('order_status_histories', ['order_id' => $order['id'], 'event' => 'order_cancelled_by_customer']);
        $latestNotification = $customer->notifications()->latest()->firstOrFail();
        $this->assertSame('order', $latestNotification->data['category']);
        $this->assertSame($order['order_number'], $latestNotification->data['order_number']);
        $this->assertSame('/dashboard?tab=orders&order='.$order['id'], $latestNotification->data['action_url']);
        $this->patchJson('/api/v1/orders/'.$order['id'].'/cancel')->assertUnprocessable();
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 2]);
    }

    public function test_customer_payment_admin_verification_and_delivery_flow(): void
    {
        Storage::fake('private');
        $customer = User::factory()->create(['role' => 'customer']);
        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::create(['name' => 'AI', 'slug' => 'ai', 'sort_order' => 1, 'is_active' => true]);
        $product = Product::create(['category_id' => $category->id, 'name' => 'Test Account', 'slug' => 'test-account', 'description' => 'Test', 'price' => 8000, 'stock' => 2, 'warranty_type' => 'standard', 'delivery_time' => '10 minutes', 'status' => 'active']);

        $this->actingAs($customer, 'sanctum');
        $order = $this->postJson('/api/v1/orders', ['product_id' => $product->id, 'quantity' => 1, 'customer_name' => 'Customer', 'phone' => '09912345678', 'payment_method' => 'kbzpay', 'note' => 'Please deliver after 6 PM.'])->assertCreated()->json();
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 1]);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
        $payment = $this->post('/api/v1/orders/'.$order['id'].'/payment', ['proof' => UploadedFile::fake()->createWithContent('payment.png', $png)], ['Accept' => 'application/json'])->assertCreated()->json();
        $this->post('/api/v1/orders/'.$order['id'].'/payment', ['proof' => UploadedFile::fake()->createWithContent('again.png', $png)], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->actingAs($admin, 'sanctum');
        $this->getJson('/api/v1/admin/orders')->assertOk()->assertJsonPath('data.0.note', 'Please deliver after 6 PM.')->assertJsonPath('data.0.phone', '09912345678');
        $this->patchJson('/api/v1/admin/orders/'.$order['id'].'/status', ['status' => 'processing'])->assertUnprocessable();
        $this->get('/api/v1/admin/payments/'.$payment['id'].'/proof')->assertOk();
        $this->patchJson('/api/v1/admin/payments/'.$payment['id'].'/verify', ['status' => 'approved'])->assertOk();
        $this->getJson('/api/v1/admin/reports?month='.now()->format('Y-m'))->assertOk()->assertJsonPath('monthly_summary.orders', 1)->assertJsonPath('monthly_summary.quantity', 1)->assertJsonPath('monthly_summary.revenue', 8000)->assertJsonPath('product_breakdown.0.product_name', 'Test Account')->assertJsonPath('product_breakdown.0.total', 8000);
        $this->patchJson('/api/v1/admin/payments/'.$payment['id'].'/verify', ['status' => 'approved'])->assertUnprocessable();
        $deliveryResponse = $this->postJson('/api/v1/admin/orders/'.$order['id'].'/delivery', ['delivery_text' => "Email: buyer@example.com\nPassword: secret"]);
        $deliveryResponse->assertOk();

        $this->actingAs($customer, 'sanctum');
        $this->getJson('/api/v1/orders')->assertOk()->assertJsonPath('data.0.status', 'completed')->assertJsonPath('data.0.items.0.delivery_payload', "Email: buyer@example.com\nPassword: secret")->assertJsonPath('data.0.status_history.0.event', 'order_created')->assertJsonPath('data.0.status_history.3.event', 'order_completed');
        $review = $this->postJson('/api/v1/orders/'.$order['id'].'/review', ['rating' => 5, 'comment' => 'Fast delivery and working account.'])->assertCreated()->json();
        $this->postJson('/api/v1/orders/'.$order['id'].'/review', ['rating' => 4, 'comment' => 'Duplicate review.'])->assertUnprocessable();
        $this->getJson('/api/v1/reviews')->assertOk()->assertJsonPath('data.0.rating', 5)->assertJsonPath('data.0.order.items.0.product_name', 'Test Account')->assertJsonMissingPath('data.0.order.phone');
        $this->patchJson('/api/v1/reviews/'.$review['id'], ['rating' => 4, 'comment' => 'Updated after another check.'])->assertOk()->assertJsonPath('rating', 4);

        $otherCustomer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($otherCustomer, 'sanctum');
        $this->deleteJson('/api/v1/reviews/'.$review['id'])->assertForbidden();

        $this->actingAs($customer, 'sanctum');
        $this->deleteJson('/api/v1/reviews/'.$review['id'])->assertNoContent();
        $this->assertDatabaseMissing('reviews', ['id' => $review['id']]);
    }

    public function test_cancelling_an_unpaid_order_releases_stock_only_once(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::create(['name' => 'Streaming', 'slug' => 'streaming', 'sort_order' => 1, 'is_active' => true]);
        $product = Product::create(['category_id' => $category->id, 'name' => 'Reserved Account', 'slug' => 'reserved-account', 'description' => 'Test', 'price' => 5000, 'stock' => 3, 'warranty_type' => 'standard', 'delivery_time' => '10 minutes', 'status' => 'active']);

        $this->actingAs($customer, 'sanctum');
        $order = $this->postJson('/api/v1/orders', ['product_id' => $product->id, 'quantity' => 2, 'customer_name' => 'Customer', 'phone' => '09912345678', 'payment_method' => 'kbzpay'])->assertCreated()->json();
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 1]);

        $this->actingAs($admin, 'sanctum');
        $this->patchJson('/api/v1/admin/orders/'.$order['id'].'/status', ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonPath('status', 'cancelled');
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 3]);
        $this->assertDatabaseMissing('orders', ['id' => $order['id'], 'stock_released_at' => null]);

        $this->patchJson('/api/v1/admin/orders/'.$order['id'].'/status', ['status' => 'cancelled'])->assertOk();
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 3]);
    }

    public function test_customer_can_resubmit_a_rejected_payment(): void
    {
        Storage::fake('private');
        $customer = User::factory()->create(['role' => 'customer']);
        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::create(['name' => 'VPN', 'slug' => 'vpn', 'sort_order' => 1, 'is_active' => true]);
        $product = Product::create(['category_id' => $category->id, 'name' => 'VPN Account', 'slug' => 'vpn-account', 'description' => 'Test', 'price' => 3000, 'stock' => 2, 'warranty_type' => 'standard', 'delivery_time' => '10 minutes', 'status' => 'active']);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');

        $this->actingAs($customer, 'sanctum');
        $order = $this->postJson('/api/v1/orders', ['product_id' => $product->id, 'quantity' => 1, 'customer_name' => 'Customer', 'phone' => '09912345678', 'payment_method' => 'wavepay'])->assertCreated()->json();
        $firstPayment = $this->post('/api/v1/orders/'.$order['id'].'/payment', ['proof' => UploadedFile::fake()->createWithContent('first.png', $png)], ['Accept' => 'application/json'])->assertCreated()->json();

        $this->actingAs($admin, 'sanctum');
        $this->patchJson('/api/v1/admin/payments/'.$firstPayment['id'].'/verify', ['status' => 'rejected', 'rejection_reason' => 'Screenshot is unclear.'])->assertOk();

        $this->actingAs($customer, 'sanctum');
        $this->getJson('/api/v1/orders')->assertOk()->assertJsonPath('data.0.payments.0.rejection_reason', 'Screenshot is unclear.');
        $this->post('/api/v1/orders/'.$order['id'].'/payment', ['proof' => UploadedFile::fake()->createWithContent('retry.png', $png)], ['Accept' => 'application/json'])->assertCreated();
        $this->assertDatabaseHas('orders', ['id' => $order['id'], 'payment_status' => 'pending', 'status' => 'pending']);
        $this->assertDatabaseCount('payments', 2);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 1]);
    }

    public function test_unpaid_order_expires_and_releases_stock_only_once(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $category = Category::create(['name' => 'Games', 'slug' => 'games', 'sort_order' => 1, 'is_active' => true]);
        $product = Product::create(['category_id' => $category->id, 'name' => 'Game Pass', 'slug' => 'game-pass', 'description' => 'Test', 'price' => 7000, 'stock' => 3, 'warranty_type' => 'standard', 'delivery_time' => '10 minutes', 'status' => 'active']);

        $this->actingAs($customer, 'sanctum');
        $order = $this->postJson('/api/v1/orders', ['product_id' => $product->id, 'quantity' => 2, 'customer_name' => 'Customer', 'phone' => '09912345678', 'payment_method' => 'kbzpay'])
            ->assertCreated()->assertJsonPath('status', 'pending')->json();
        $this->assertNotNull($order['expires_at']);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 1]);

        $this->travel(31)->minutes();
        $this->artisan('orders:expire')->assertSuccessful();
        $this->assertDatabaseHas('orders', ['id' => $order['id'], 'status' => 'cancelled']);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 3]);
        $this->assertDatabaseHas('order_status_histories', ['order_id' => $order['id'], 'event' => 'order_expired']);

        $this->artisan('orders:expire')->assertSuccessful();
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 3]);
    }

    public function test_submitted_payment_stops_order_expiry(): void
    {
        Storage::fake('private');
        $customer = User::factory()->create(['role' => 'customer']);
        $category = Category::create(['name' => 'Cloud', 'slug' => 'cloud', 'sort_order' => 1, 'is_active' => true]);
        $product = Product::create(['category_id' => $category->id, 'name' => 'Cloud Plan', 'slug' => 'cloud-plan', 'description' => 'Test', 'price' => 6000, 'stock' => 2, 'warranty_type' => 'standard', 'delivery_time' => '10 minutes', 'status' => 'active']);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');

        $this->actingAs($customer, 'sanctum');
        $order = $this->postJson('/api/v1/orders', ['product_id' => $product->id, 'quantity' => 1, 'customer_name' => 'Customer', 'phone' => '09912345678', 'payment_method' => 'wavepay'])->assertCreated()->json();
        $this->post('/api/v1/orders/'.$order['id'].'/payment', ['proof' => UploadedFile::fake()->createWithContent('proof.png', $png)], ['Accept' => 'application/json'])->assertCreated();
        $this->assertDatabaseHas('orders', ['id' => $order['id'], 'expires_at' => null]);

        $this->travel(31)->minutes();
        $this->artisan('orders:expire')->assertSuccessful();
        $this->assertDatabaseHas('orders', ['id' => $order['id'], 'status' => 'pending']);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 1]);
    }

    public function test_repeated_checkout_with_same_idempotency_key_creates_one_order(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $category = Category::create(['name' => 'Design', 'slug' => 'design', 'sort_order' => 1, 'is_active' => true]);
        $product = Product::create(['category_id' => $category->id, 'name' => 'Design Tool', 'slug' => 'design-tool', 'description' => 'Test', 'price' => 4000, 'stock' => 3, 'warranty_type' => 'standard', 'delivery_time' => '10 minutes', 'status' => 'active']);
        $payload = ['product_id' => $product->id, 'quantity' => 1, 'customer_name' => 'Customer', 'phone' => '09912345678', 'payment_method' => 'kbzpay'];
        $key = (string) Str::uuid();

        $this->actingAs($customer, 'sanctum');
        $first = $this->withHeader('Idempotency-Key', $key)->postJson('/api/v1/orders', $payload)->assertCreated()->json();
        $second = $this->withHeader('Idempotency-Key', $key)->postJson('/api/v1/orders', $payload)->assertOk()->json();

        $this->assertSame($first['id'], $second['id']);
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 2]);
        $this->withHeader('Idempotency-Key', 'not-a-uuid')->postJson('/api/v1/orders', $payload)->assertUnprocessable();
    }
}
