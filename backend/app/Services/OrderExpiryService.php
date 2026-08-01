<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class OrderExpiryService
{
    public function cancelByCustomer(int $orderId, int $userId): ?Order
    {
        return DB::transaction(function () use ($orderId, $userId) {
            $order = Order::query()->lockForUpdate()->find($orderId);
            if (!$order || $order->user_id !== $userId) return null;

            abort_unless(in_array($order->status, ['pending', 'rejected'], true), 422, 'ဒီ Order ကို ပယ်ဖျက်၍မရတော့ပါ။');
            abort_if($order->payments()->whereIn('status', ['pending', 'approved'])->exists(), 422, 'Payment တင်ထားပြီးဖြစ်သဖြင့် Admin စစ်ဆေးပြီးမှသာ ပယ်ဖျက်နိုင်ပါသည်။');

            if (!$order->stock_released_at) {
                foreach ($order->items()->get() as $item) {
                    if ($item->product_id) Product::query()->whereKey($item->product_id)->increment('stock', $item->quantity);
                }
            }

            $order->update(['status' => 'cancelled', 'stock_released_at' => $order->stock_released_at ?: now(), 'expires_at' => null]);
            $order->recordStatus('order_cancelled_by_customer', 'Customer မှ Order ကို ပယ်ဖျက်လိုက်ပြီး stock ပြန်ဖြည့်ထားပါသည်။', $userId);

            return $order->fresh(['items', 'payments', 'statusHistory']);
        });
    }

    public function expireDue(?int $userId = null, int $limit = 100): int
    {
        $ids = Order::query()
            ->whereIn('status', ['pending', 'rejected'])
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->whereNull('stock_released_at')
            ->when($userId, fn ($query) => $query->where('user_id', $userId))
            ->orderBy('id')
            ->limit($limit)
            ->pluck('id');

        return $ids->sum(fn (int $id) => $this->expire($id) ? 1 : 0);
    }

    public function expire(int $orderId): bool
    {
        return DB::transaction(function () use ($orderId) {
            $order = Order::query()->lockForUpdate()->find($orderId);
            if (!$order || $order->stock_released_at || !$order->expires_at?->isPast() || !in_array($order->status, ['pending', 'rejected'], true)) return false;
            if ($order->payments()->whereIn('status', ['pending', 'approved'])->exists()) {
                $order->update(['expires_at' => null]);
                return false;
            }

            foreach ($order->items()->get() as $item) {
                if ($item->product_id) Product::query()->whereKey($item->product_id)->increment('stock', $item->quantity);
            }

            $order->update([
                'status' => 'cancelled',
                'stock_released_at' => now(),
                'expires_at' => null,
                'admin_note' => $order->admin_note ?: 'Payment မတင်သဖြင့် Order အလိုအလျောက်ပယ်ဖျက်ထားပါသည်။',
            ]);
            $order->recordStatus('order_expired', 'Payment တင်ချိန်ကုန်သွားသဖြင့် Order ပယ်ဖျက်ပြီး stock ပြန်ဖြည့်ထားပါသည်။');

            return true;
        });
    }
}
