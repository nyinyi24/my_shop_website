<?php
namespace App\Http\Middleware;
use App\Services\AdminAuditLogger;use Closure;use Illuminate\Database\Eloquent\Model;use Illuminate\Http\Request;use Symfony\Component\HttpFoundation\Response;
class AuditAdminAction
{
 public function __construct(private AdminAuditLogger $logger){}
 public function handle(Request $request,Closure $next):Response
 {
  $response=$next($request);if($request->isMethodSafe()||$response->getStatusCode()>=400)return $response;
  [$event,$description]=$this->describe($request);$subject=collect($request->route()?->parameters()??[])->first(fn($value)=>$value instanceof Model);
  $safe=collect($request->only(['status','role','service_expires_at','title','name']))->filter(fn($value)=>$value!==null&&$value!=='')->all();
  $this->logger->record($request,$event,$description,$subject,$safe);return $response;
 }
 private function describe(Request $request):array
 {
  if(str_contains($request->path(),'/store-settings'))return ['store.settings_updated','Store Settings ပြောင်းခဲ့သည်။'];
  $path=$request->path();$method=$request->method();return match(true){str_contains($path,'/payments/')=>['payment.'.$request->input('status','updated'),'Payment ကို '.$request->input('status','update').' လုပ်ခဲ့သည်။'],str_contains($path,'/delivery')=>['order.delivery_sent','Order delivery ပို့ခဲ့သည်။'],str_contains($path,'/subscription-expiry')=>['order.expiry_updated','Service expiry date ပြောင်းခဲ့သည်။'],str_contains($path,'/orders/')=>['order.status_updated','Order status ပြောင်းခဲ့သည်။'],str_contains($path,'/users/')=>['user.role_updated','User role ကို '.$request->input('role').' ပြောင်းခဲ့သည်။'],str_contains($path,'/products')=>['product.'.strtolower($method),$method==='POST'?'Product အသစ်ထည့်ခဲ့သည်။':'Product ပြင်/ဖျက်ခဲ့သည်။'],str_contains($path,'/categories')=>['category.'.strtolower($method),$method==='POST'?'Category အသစ်ထည့်ခဲ့သည်။':'Category ပြင်/ဖျက်ခဲ့သည်။'],str_contains($path,'/announcements')=>['announcement.'.strtolower($method),'Announcement စီမံခဲ့သည်။'],str_contains($path,'/notifications')=>['notification.sent','Customer notification ပို့ခဲ့သည်။'],default=>['admin.'.$method,'Admin action လုပ်ခဲ့သည်။']};
 }
}
