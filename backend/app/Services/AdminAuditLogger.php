<?php
namespace App\Services;
use App\Models\AdminActivityLog;use Illuminate\Http\Request;
class AdminAuditLogger
{
 public function record(Request $request,string $event,string $description,?object $subject=null,array $metadata=[]):void
 {
  $actor=$request->user();AdminActivityLog::create(['actor_id'=>$actor?->id,'actor_role'=>$actor?->role,'event'=>$event,'description'=>$description,'subject_type'=>$subject?->getMorphClass(),'subject_id'=>$subject?->getKey(),'ip_address'=>$request->ip(),'user_agent'=>mb_substr((string)$request->userAgent(),0,1000),'metadata'=>$metadata?:null,'created_at'=>now()]);
 }
}
