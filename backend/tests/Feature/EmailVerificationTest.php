<?php
namespace Tests\Feature;
use App\Models\User;use Illuminate\Auth\Notifications\VerifyEmail;use Illuminate\Foundation\Testing\RefreshDatabase;use Illuminate\Support\Facades\Notification;use Tests\TestCase;
class EmailVerificationTest extends TestCase
{
 use RefreshDatabase;
 public function test_registration_sends_signed_verification_link_and_user_can_verify():void
 {
  Notification::fake();$this->postJson('/api/v1/register',['name'=>'Verify User','email'=>'verify@example.test','password'=>'Secure123','password_confirmation'=>'Secure123'])->assertCreated();$user=User::where('email','verify@example.test')->firstOrFail();$url='';Notification::assertSentTo($user,VerifyEmail::class,function(VerifyEmail $notification)use($user,&$url){$url=$notification->toMail($user)->actionUrl;return true;});
  $this->get($url)->assertRedirect(config('app.frontend_url').'/email-verified?status=success');$this->assertNotNull($user->fresh()->email_verified_at);
 }
 public function test_unverified_user_can_reach_order_creation_and_can_resend_email():void
 {
  Notification::fake();$user=User::factory()->create(['email_verified_at'=>null]);$this->actingAs($user,'sanctum');
  $this->postJson('/api/v1/orders',[])->assertUnprocessable()->assertJsonMissing(['code'=>'EMAIL_NOT_VERIFIED']);
  $this->postJson('/api/v1/email/verification-notification')->assertOk();Notification::assertSentTo($user,VerifyEmail::class);
 }
 public function test_tampered_verification_link_is_rejected():void
 {
  $user=User::factory()->unverified()->create();$url=\Illuminate\Support\Facades\URL::temporarySignedRoute('verification.verify',now()->addHour(),['id'=>$user->id,'hash'=>'wrong']);$this->get($url)->assertForbidden();$this->assertNull($user->fresh()->email_verified_at);
 }
}
