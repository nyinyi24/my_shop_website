<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class StoreSetting extends Model{protected $fillable=['store_open','store_closed_message','support_opens_at','support_closes_at','order_expiry_minutes','low_stock_threshold'];protected $casts=['store_open'=>'boolean','order_expiry_minutes'=>'integer','low_stock_threshold'=>'integer'];}
