<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('payments')->whereIn('status', ['approved', 'rejected'])->orderBy('id')->get()->each(function ($payment): void {
            $order = DB::table('orders')->where('id', $payment->order_id)->first();
            if (!$order || in_array($order->status, ['completed', 'cancelled'], true)) {
                return;
            }
            DB::table('orders')->where('id', $order->id)->update([
                'payment_status' => $payment->status,
                'status' => $payment->status,
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        // Status history cannot be safely inferred in reverse.
    }
};
