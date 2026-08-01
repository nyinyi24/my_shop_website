<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;use Illuminate\Database\Eloquent\Relations\BelongsTo;
class OrderItem extends Model{protected $fillable=['order_id','product_id','product_name','unit_price','quantity','warranty_snapshot','delivery_payload','service_expires_at'];protected $casts=['unit_price'=>'decimal:2','service_expires_at'=>'datetime'];public function order():BelongsTo{return $this->belongsTo(Order::class);}}
