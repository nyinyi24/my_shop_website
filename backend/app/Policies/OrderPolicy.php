<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function update(User $user, Order $order): bool
    {
        return $user->id === $order->user_id || in_array($user->role, ['staff', 'admin'], true);
    }
}
