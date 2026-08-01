<?php

namespace App\Console\Commands;

use App\Services\OrderExpiryService;
use Illuminate\Console\Command;

class ExpireUnpaidOrders extends Command
{
    protected $signature = 'orders:expire {--limit=100 : Maximum orders to process}';
    protected $description = 'Cancel expired unpaid orders and release their reserved stock';

    public function handle(OrderExpiryService $expiry): int
    {
        $count = $expiry->expireDue(limit: max(1, (int) $this->option('limit')));
        $this->info("Expired {$count} unpaid order(s).");

        return self::SUCCESS;
    }
}
