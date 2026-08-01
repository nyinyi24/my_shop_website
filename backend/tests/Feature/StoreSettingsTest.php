<?php
namespace Tests\Feature;
use App\Models\Order;use App\Models\StoreSetting;use App\Models\User;use App\Services\StoreSettings;use Illuminate\Foundation\Testing\RefreshDatabase;use Illuminate\Support\Facades\Cache;use Tests\TestCase;
class StoreSettingsTest extends TestCase
{
 use RefreshDatabase;
 protected function setUp():void{parent::setUp();Cache::forget('store.settings');}
 public function test_only_main_admin_can_update_store_settings():void
 {
  config(['app.main_admin_email'=>'owner@example.test']);$main=User::factory()->create(['email'=>'owner@example.test','role'=>'admin']);$admin=User::factory()->create(['role'=>'admin']);$payload=['store_open'=>false,'store_closed_message'=>'Maintenance လုပ်နေပါသည်။','support_opens_at'=>'10:00','support_closes_at'=>'21:00','order_expiry_minutes'=>45,'low_stock_threshold'=>5];
  $this->actingAs($admin,'sanctum')->patchJson('/api/v1/admin/store-settings',$payload)->assertForbidden();
  $this->actingAs($main,'sanctum')->patchJson('/api/v1/admin/store-settings',$payload)->assertOk()->assertJsonPath('settings.order_expiry_minutes',45);
  $this->getJson('/api/v1/store-settings')->assertOk()->assertJsonPath('store_open',false)->assertJsonMissingPath('low_stock_threshold');
  $this->assertDatabaseHas('admin_activity_logs',['actor_id'=>$main->id,'event'=>'store.settings_updated']);
 }
 public function test_closed_store_rejects_new_orders_and_setting_controls_expiry():void
 {
  $user=User::factory()->create();$this->actingAs($user,'sanctum');$setting=StoreSetting::first();$setting->update(['store_open'=>false,'store_closed_message'=>'ယာယီပိတ်ထားသည်။']);app(StoreSettings::class)->forget();
  $this->postJson('/api/v1/orders',[])->assertUnprocessable()->assertJsonPath('message','ယာယီပိတ်ထားသည်။');
  $setting->update(['store_open'=>true,'order_expiry_minutes'=>45]);app(StoreSettings::class)->forget();$order=Order::create(['order_number'=>'ENI-SETTING-1','user_id'=>$user->id,'total_amount'=>1000,'payment_method'=>'kbzpay','payment_status'=>'pending','status'=>'pending','customer_name'=>$user->name,'phone'=>'091234567']);
  $this->assertTrue($order->expires_at->between(now()->addMinutes(44),now()->addMinutes(46)));
 }
}
