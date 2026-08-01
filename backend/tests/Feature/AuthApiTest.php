<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_register_access_profile_and_logout(): void
    {
        $register = $this->postJson('/api/v1/register', [
            'name' => 'Test Customer',
            'email' => 'customer@example.test',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
        ]);

        $register->assertCreated()->assertJsonPath('user.email', 'customer@example.test')->assertJsonStructure(['user', 'token']);
        $token = $register->json('token');

        $this->withToken($token)->getJson('/api/v1/me')->assertOk()->assertJsonPath('email', 'customer@example.test');
        $this->withToken($token)->postJson('/api/v1/logout')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_registration_validates_email_and_password(): void
    {
        $this->postJson('/api/v1/register', ['name' => 'A', 'email' => 'bad', 'password' => 'short'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_customer_can_request_and_use_a_password_reset_link_once(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'reset@example.test', 'password' => 'OldPassword1']);
        $user->createToken('old-session');

        $this->postJson('/api/v1/forgot-password', ['email' => $user->email])->assertOk();

        $token = '';
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;
            return true;
        });

        $payload = [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewPassword2',
            'password_confirmation' => 'NewPassword2',
        ];

        $this->postJson('/api/v1/reset-password', $payload)->assertOk();
        $this->assertTrue(Hash::check('NewPassword2', $user->fresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->postJson('/api/v1/reset-password', $payload)->assertUnprocessable();
    }

    public function test_forgot_password_does_not_reveal_unknown_email(): void
    {
        Notification::fake();
        $this->postJson('/api/v1/forgot-password', ['email' => 'unknown@example.test'])->assertOk();
        Notification::assertNothingSent();
    }

    public function test_login_is_temporarily_locked_after_five_failed_attempts(): void
    {
        $user = User::factory()->create(['email' => 'lockout@example.test', 'password' => 'CorrectPassword1']);
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'WrongPassword1'])
                ->assertUnauthorized()->assertJsonPath('attempts_remaining', 5 - $attempt);
        }
        $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'CorrectPassword1'])
            ->assertTooManyRequests()->assertJsonStructure(['message', 'retry_after']);
        $this->travel(61)->seconds();
        $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'CorrectPassword1'])
            ->assertOk()->assertJsonStructure(['user', 'token']);
    }

    public function test_successful_login_clears_failed_attempts(): void
    {
        $user = User::factory()->create(['email' => 'clear@example.test', 'password' => 'CorrectPassword1']);
        $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'WrongPassword1'])->assertUnauthorized();
        $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'CorrectPassword1'])->assertOk();
        $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'WrongPassword1'])
            ->assertUnauthorized()->assertJsonPath('attempts_remaining', 4);
    }

    public function test_user_can_view_and_revoke_only_their_own_sessions(): void
    {
        $user = User::factory()->create();
        $current = $user->createToken('Chrome · Desktop');
        $other = $user->createToken('Mobile Safari · Mobile');
        $stranger = User::factory()->create()->createToken('Firefox · Desktop');

        $this->withToken($current->plainTextToken)->getJson('/api/v1/sessions')
            ->assertOk()->assertJsonCount(2, 'data');

        $this->withToken($current->plainTextToken)->deleteJson('/api/v1/sessions/'.$stranger->accessToken->id)
            ->assertNotFound();
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $stranger->accessToken->id]);

        $this->withToken($current->plainTextToken)->deleteJson('/api/v1/sessions/'.$other->accessToken->id)
            ->assertOk()->assertJsonPath('current', false);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $other->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $current->accessToken->id]);
    }

    public function test_logout_other_sessions_keeps_the_current_session(): void
    {
        $user = User::factory()->create();
        $current = $user->createToken('Current');
        $user->createToken('Other one');
        $user->createToken('Other two');

        $this->withToken($current->plainTextToken)->deleteJson('/api/v1/sessions/others')
            ->assertOk()->assertJsonPath('deleted', 2);
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->withToken($current->plainTextToken)->getJson('/api/v1/me')->assertOk();
    }

    public function test_user_can_update_profile_and_avatar(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['name' => 'Old Name']);
        $token = $user->createToken('Current')->plainTextToken;
        $response = $this->withToken($token)->post('/api/v1/profile', [
            'name' => 'New Name',
            'avatar' => UploadedFile::fake()->createWithContent('avatar.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')),
        ], ['Accept' => 'application/json']);
        $response->assertOk()->assertJsonPath('user.name', 'New Name');
        Storage::disk('public')->assertExists($user->fresh()->avatar_path);
    }

    public function test_password_change_requires_current_password_and_revokes_other_sessions(): void
    {
        $user = User::factory()->create(['password' => 'CurrentPassword1']);
        $current = $user->createToken('Current');
        $user->createToken('Other');
        $payload = ['current_password' => 'wrong', 'password' => 'NewPassword2', 'password_confirmation' => 'NewPassword2'];
        $this->withToken($current->plainTextToken)->patchJson('/api/v1/password', $payload)->assertUnprocessable();
        $payload['current_password'] = 'CurrentPassword1';
        $this->withToken($current->plainTextToken)->patchJson('/api/v1/password', $payload)->assertOk();
        $this->assertTrue(Hash::check('NewPassword2', $user->fresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_remembered_login_token_expires_in_thirty_days(): void
    {
        $user = User::factory()->create(['email' => 'remember@example.test', 'password' => 'SecurePassword1']);
        $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'SecurePassword1',
            'remember' => true,
        ])->assertOk();

        $token = $user->tokens()->latest()->first();
        $this->assertNotNull($token->expires_at);
        $this->assertTrue($token->expires_at->between(now()->addDays(29), now()->addDays(31)));
    }
}
