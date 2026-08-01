<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\StoreNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_see_unread_count_and_mark_all_notifications_as_read(): void
    {
        $user = User::factory()->create();
        $user->notify(new StoreNotification('Order update', 'Your order changed.', 'order'));
        $user->notify(new StoreNotification('Service update', 'Store maintenance.', 'service'));

        $this->actingAs($user, 'sanctum');
        $this->getJson('/api/v1/notifications')->assertOk()->assertJsonPath('unread_count', 2);
        $this->patchJson('/api/v1/notifications/read-all')->assertOk()->assertJsonPath('updated', 2)->assertJsonPath('unread_count', 0);
        $this->assertSame(0, $user->fresh()->unreadNotifications()->count());
    }

    public function test_customer_cannot_read_another_customers_notification(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $owner->notify(new StoreNotification('Private', 'Owner only.'));

        $this->actingAs($other, 'sanctum');
        $this->patchJson('/api/v1/notifications/'.$owner->notifications()->firstOrFail()->id.'/read')->assertForbidden();
    }
}
