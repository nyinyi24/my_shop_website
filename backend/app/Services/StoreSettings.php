<?php
namespace App\Services;
use App\Models\StoreSetting;use Illuminate\Support\Facades\Cache;
class StoreSettings
{
 public function get():StoreSetting{return Cache::remember('store.settings',300,fn()=>StoreSetting::query()->firstOrCreate([],['store_open'=>true,'support_opens_at'=>'09:00','support_closes_at'=>'22:00','order_expiry_minutes'=>30,'low_stock_threshold'=>3]));}
 public function forget():void{Cache::forget('store.settings');}
 public function publicData():array{$s=$this->get();return $s->only(['store_open','store_closed_message','support_opens_at','support_closes_at','order_expiry_minutes']);}
}
