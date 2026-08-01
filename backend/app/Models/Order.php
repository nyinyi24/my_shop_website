<?php
namespace App\Models;
use App\Notifications\StoreNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
class Order extends Model
{
    protected $fillable=['order_number','idempotency_key','user_id','total_amount','payment_method','payment_status','status','customer_name','phone','telegram_username','note','admin_note','stock_released_at','expires_at'];
    protected $casts=['total_amount'=>'decimal:2','stock_released_at'=>'datetime','expires_at'=>'datetime'];
    public function user(): BelongsTo{return $this->belongsTo(User::class);}
    public function items(): HasMany{return $this->hasMany(OrderItem::class);}
    public function payments(): HasMany{return $this->hasMany(Payment::class);}
    public function statusHistory(): HasMany{return $this->hasMany(OrderStatusHistory::class)->oldest();}
    public function review(): HasOne{return $this->hasOne(Review::class);}

    protected static function booted(): void
    {
        static::creating(function (Order $order) {
            if ($order->payment_status === 'pending' && $order->status === 'pending') $order->expires_at = now()->addMinutes(app(\App\Services\StoreSettings::class)->get()->order_expiry_minutes);
        });
        static::updating(function (Order $order) {
            if ($order->isDirty('status') && $order->status === 'rejected') $order->expires_at = now()->addMinutes(app(\App\Services\StoreSettings::class)->get()->order_expiry_minutes);
        });
    }

    public function recordStatus(string $event, string $message, ?int $actorId = null): OrderStatusHistory
    {
        $history = $this->statusHistory()->create([
            'actor_id' => $actorId,
            'event' => $event,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'message' => $message,
        ]);

        $titles = [
            'order_created' => 'Order တင်ပြီးပါပြီ',
            'payment_submitted' => 'Payment စစ်ဆေးနေပါသည်',
            'payment_approved' => 'Payment အတည်ပြုပြီးပါပြီ',
            'payment_rejected' => 'Payment ပယ်ချခံရပါသည်',
            'status_updated' => 'Order အခြေအနေပြောင်းလဲပါပြီ',
            'order_completed' => 'Order Delivery ရပါပြီ',
            'order_cancelled' => 'Order ပယ်ဖျက်ထားပါသည်',
            'order_cancelled_by_customer' => 'Order ပယ်ဖျက်ပြီးပါပြီ',
            'order_expired' => 'Order သက်တမ်းကုန်သွားပါပြီ',
        ];

        if (isset($titles[$event])) {
            $this->user?->notify(new StoreNotification(
                $titles[$event],
                $message,
                'order',
                '/dashboard?tab=orders&order='.$this->id,
                $this->order_number,
            ));
        }

        return $history;
    }
}
