<?php
namespace Tests\Feature;
use App\Models\Order;use App\Models\User;use App\Notifications\StoreNotification;use Illuminate\Foundation\Testing\RefreshDatabase;use Illuminate\Support\Carbon;use Illuminate\Support\Facades\Notification;use Tests\TestCase;
class SubscriptionReminderTest extends TestCase
{
 use RefreshDatabase;
 public function test_it_sends_due_reminder_once():void
 {
  Notification::fake();Carbon::setTestNow(Carbon::parse('2026-07-21 09:00:00',config('app.timezone')));$user=User::factory()->create();$order=Order::create(['order_number'=>'ENI-REMINDER-1','user_id'=>$user->id,'total_amount'=>1000,'payment_method'=>'kbzpay','payment_status'=>'approved','status'=>'completed','customer_name'=>$user->name,'phone'=>'091234567']);$item=$order->items()->create(['product_name'=>'Netflix Premium','unit_price'=>1000,'quantity'=>1,'warranty_snapshot'=>'standard','service_expires_at'=>now()->addDays(7)->endOfDay()->utc()]);
  $this->artisan('subscriptions:remind')->assertSuccessful();Notification::assertSentToTimes($user,StoreNotification::class,1);$this->assertDatabaseHas('subscription_reminders',['order_item_id'=>$item->id,'reminder_key'=>'day_7']);
  $this->artisan('subscriptions:remind')->assertSuccessful();Notification::assertSentToTimes($user,StoreNotification::class,1);
 }
 public function test_it_sends_expired_notice_after_a_missed_schedule():void
 {
  Notification::fake();$user=User::factory()->create();$order=Order::create(['order_number'=>'ENI-REMINDER-2','user_id'=>$user->id,'total_amount'=>1000,'payment_method'=>'wavepay','payment_status'=>'approved','status'=>'completed','customer_name'=>$user->name,'phone'=>'091234567']);$item=$order->items()->create(['product_name'=>'VPN','unit_price'=>1000,'quantity'=>1,'warranty_snapshot'=>'standard','service_expires_at'=>now()->subDay()]);
  $this->artisan('subscriptions:remind')->assertSuccessful();$this->assertDatabaseHas('subscription_reminders',['order_item_id'=>$item->id,'reminder_key'=>'expired']);Notification::assertSentToTimes($user,StoreNotification::class,1);
 }
}
