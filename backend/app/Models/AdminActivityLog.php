<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;use Illuminate\Database\Eloquent\Relations\BelongsTo;
class AdminActivityLog extends Model{public $timestamps=false;protected $fillable=['actor_id','actor_role','event','description','subject_type','subject_id','ip_address','user_agent','metadata','created_at'];protected $casts=['metadata'=>'array','created_at'=>'datetime'];public function actor():BelongsTo{return $this->belongsTo(User::class,'actor_id');}}
