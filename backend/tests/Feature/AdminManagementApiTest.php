<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminManagementApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_category_product_user_and_announcement(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($admin, 'sanctum');

        $category = $this->postJson('/api/v1/admin/categories', ['name' => 'Test', 'slug' => 'test', 'icon' => 'T', 'sort_order' => 1, 'is_active' => true])->assertCreated()->json();
        $product = $this->postJson('/api/v1/admin/products', ['category_id' => $category['id'], 'name' => 'Test Product', 'slug' => 'test-product', 'description' => 'Test description', 'price' => 1000, 'stock' => 5, 'warranty_type' => 'standard', 'delivery_time' => '10 minutes', 'status' => 'active', 'is_featured' => false])->assertCreated()->json();
        $this->patchJson('/api/v1/admin/products/'.$product['id'], ['category_id' => $category['id'], 'name' => 'Test Product', 'slug' => 'test-product', 'description' => 'Updated description', 'price' => 1200, 'stock' => 9, 'warranty_type' => 'standard', 'delivery_time' => '15 minutes', 'status' => 'active', 'is_featured' => true])->assertOk()->assertJsonPath('stock', 9);
        $this->patchJson('/api/v1/admin/users/'.$customer->id, ['role' => 'staff'])->assertOk()->assertJsonPath('role', 'staff');
        $announcement = $this->postJson('/api/v1/admin/announcements', ['title' => 'Notice', 'message' => 'Store notice', 'is_active' => true])->assertCreated()->assertJsonPath('title', 'Notice')->json();
        $this->assertNotNull($announcement['created_at']);
        $this->getJson('/api/v1/admin/products')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/admin/reports')->assertOk()->assertJsonCount(12, 'months')->assertJsonStructure(['lifetime_sales','current_month_sales','current_month_orders','average_order_value','months','selected_month','monthly_summary','product_breakdown']);
        $this->postJson('/api/v1/admin/notifications', ['user_id' => $customer->id, 'title' => 'Test notice', 'message' => 'Your notification is ready.'])->assertCreated()->assertJsonPath('sent', 1);

        $this->actingAs($customer, 'sanctum');
        $this->postJson('/api/v1/products/'.$product['id'].'/save')->assertOk()->assertJsonPath('saved', true);
        $this->getJson('/api/v1/saved-products')->assertOk()->assertJsonPath('0.id', $product['id']);
        $notification = $this->getJson('/api/v1/notifications')->assertOk()->assertJsonPath('data.0.data.title', 'Test notice')->json('data.0');
        $this->patchJson('/api/v1/notifications/'.$notification['id'].'/read')->assertOk()->assertJsonPath('id', $notification['id']);
    }

    public function test_customer_cannot_access_admin_management(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'customer']), 'sanctum');
        $this->getJson('/api/v1/admin/products')->assertForbidden();
        $this->getJson('/api/v1/admin/reports')->assertForbidden();
    }

    public function test_staff_has_only_operational_permissions(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        User::factory()->create(['role' => 'customer']);
        $this->actingAs($staff, 'sanctum');

        $this->getJson('/api/v1/admin/dashboard')->assertOk();
        $this->getJson('/api/v1/admin/orders')->assertOk();
        $this->getJson('/api/v1/admin/products')->assertOk();
        $this->postJson('/api/v1/admin/notifications', ['title' => 'Service notice', 'message' => 'Operational update'])->assertCreated();

        $this->getJson('/api/v1/admin/reports')->assertForbidden();
        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->postJson('/api/v1/admin/products', [])->assertForbidden();
        $this->postJson('/api/v1/admin/categories', [])->assertForbidden();
    }

    public function test_only_main_admin_can_promote_or_demote_admins(): void
    {
        config(['app.main_admin_email' => 'owner@example.test']);
        $main = User::factory()->create(['email' => 'owner@example.test', 'role' => 'admin']);
        $admin = User::factory()->create(['role' => 'admin']);
        $staff = User::factory()->create(['role' => 'staff']);

        $this->actingAs($admin, 'sanctum');
        $this->patchJson('/api/v1/admin/users/'.$staff->id, ['role' => 'admin'])->assertForbidden();

        $this->actingAs($main, 'sanctum');
        $this->patchJson('/api/v1/admin/users/'.$staff->id, ['role' => 'admin'])->assertOk()->assertJsonPath('role', 'admin');
        $this->patchJson('/api/v1/admin/users/'.$main->id, ['role' => 'staff'])->assertUnprocessable();
    }

    public function test_admin_actions_are_logged_and_only_main_admin_can_view_them(): void
    {
        config(['app.main_admin_email' => 'owner@example.test']);
        $main = User::factory()->create(['email' => 'owner@example.test', 'role' => 'admin']);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum');
        $this->postJson('/api/v1/admin/categories', [
            'name' => 'Audited Category', 'slug' => 'audited-category', 'icon' => 'A', 'sort_order' => 1, 'is_active' => true,
        ])->assertCreated();
        $this->assertDatabaseHas('admin_activity_logs', ['actor_id' => $admin->id, 'event' => 'category.post']);
        $this->getJson('/api/v1/admin/activity-logs')->assertForbidden();

        $this->actingAs($main, 'sanctum');
        $this->getJson('/api/v1/admin/activity-logs')->assertOk()
            ->assertJsonPath('data.0.actor.email', $admin->email)
            ->assertJsonPath('data.0.description', 'Category အသစ်ထည့်ခဲ့သည်။');
        $this->getJson('/api/v1/admin/activity-logs?event=category&search='.urlencode($admin->email).'&date_from='.now()->toDateString().'&date_to='.now()->toDateString())
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('per_page', 25);
        $this->getJson('/api/v1/admin/activity-logs?event=payment')->assertOk()->assertJsonCount(0, 'data');
    }
}
