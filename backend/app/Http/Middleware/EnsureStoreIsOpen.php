<?php
namespace App\Http\Middleware;
use App\Services\StoreSettings;use Closure;use Illuminate\Http\Request;use Symfony\Component\HttpFoundation\Response;
class EnsureStoreIsOpen{public function __construct(private StoreSettings $settings){}public function handle(Request $request,Closure $next):Response{$settings=$this->settings->get();abort_unless($settings->store_open,422,$settings->store_closed_message);return $next($request);}}
