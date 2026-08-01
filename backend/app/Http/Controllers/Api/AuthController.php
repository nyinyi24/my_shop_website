<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminAuditLogger;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'string', 'min:8', 'confirmed', 'regex:/[A-Za-z]/', 'regex:/[0-9]/'],
        ]);
        $email = Str::lower($data['email']);
        $isMainAdmin = config('app.main_admin_email') && strcasecmp($email, (string) config('app.main_admin_email')) === 0;
        $user = User::create(['name' => $data['name'], 'email' => $email, 'password' => $data['password'], 'role' => $isMainAdmin ? 'admin' : 'customer']);
        $user->sendEmailVerificationNotification();
        return response()->json(['user' => $user, 'token' => $this->createSessionToken($user, $request)], 201);
    }

    public function login(Request $request, AdminAuditLogger $audit): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string', 'remember' => 'sometimes|boolean']);
        $email = Str::lower(trim($data['email']));
        $key = 'login:'.hash('sha256', $email.'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Login ကြိုးစားမှုများလွန်းနေပါတယ်။ {$seconds} စက္ကန့်နောက် ပြန်ကြိုးစားပါ။",
                'retry_after' => $seconds,
            ], 429)->header('Retry-After', (string) $seconds);
        }

        $user = User::where('email', $email)->first();
        // The dummy hash keeps unknown-email and wrong-password response timing similar.
        $hash = $user?->password ?? Hash::make(Str::random(32));
        $passwordMatches = Hash::check($data['password'], $hash);

        if (! $user || ! $passwordMatches) {
            RateLimiter::hit($key, 60);
            return response()->json([
                'message' => 'Email သို့မဟုတ် password မှားနေပါတယ်။',
                'attempts_remaining' => max(0, 5 - RateLimiter::attempts($key)),
            ], 401);
        }

        RateLimiter::clear($key);
        if (in_array($user->role, ['staff', 'admin'], true)) {
            $audit->record($request, 'auth.login', 'Staff/Admin account ဝင်ရောက်ခဲ့သည်။', $user);
        }
        return response()->json(['user' => $user, 'token' => $this->createSessionToken($user, $request, (bool) ($data['remember'] ?? false))]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email']);
        $status = Password::sendResetLink(['email' => $data['email']]);
        if ($status === Password::RESET_THROTTLED) {
            return response()->json(['message' => 'Reset link ကို ခဏခဏတောင်းထားပါတယ်။ ခဏနားပြီး ပြန်ကြိုးစားပါ။'], 429);
        }
        return response()->json(['message' => 'ဒီ email နဲ့ account ရှိပါက password reset link ပို့ထားပါတယ်။']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string', 'email' => 'required|email',
            'password' => ['required', 'string', 'min:8', 'confirmed', 'regex:/[A-Za-z]/', 'regex:/[0-9]/'],
        ]);
        $status = Password::reset($data, function (User $user, string $password): void {
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
            $user->tokens()->delete();
            event(new PasswordReset($user));
        });
        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Reset link မှားနေသည် သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ။ အသစ်ပြန်တောင်းပါ။'], 422);
        }
        return response()->json(['message' => 'Password အသစ်ပြောင်းပြီးပါပြီ။']);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) return response()->json(['message' => 'Email verify လုပ်ပြီးသားဖြစ်ပါသည်။']);
        $request->user()->sendEmailVerificationNotification();
        return response()->json(['message' => 'Verification link ကို email ထဲပြန်ပို့ပြီးပါပြီ။']);
    }

    public function verifyEmail(Request $request, int $id, string $hash)
    {
        $user = User::findOrFail($id);
        abort_unless(hash_equals($hash, sha1($user->getEmailForVerification())), 403, 'Verification link မမှန်ပါ။');
        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) event(new Verified($user));
        return redirect(rtrim((string) config('app.frontend_url'), '/').'/email-verified?status=success');
    }

    public function telegramLogin(Request $request): JsonResponse
    {
        $request->validate(['init_data' => 'required|string']);
        return response()->json(['message' => 'Telegram verification adapter must be configured.'], 501);
    }

    public function me(Request $request): JsonResponse { return response()->json($request->user()); }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|min:2|max:100',
            'avatar' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'remove_avatar' => 'nullable|boolean',
        ]);
        $user = $request->user();
        $user->name = trim($data['name']);
        if ($request->boolean('remove_avatar') && $user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->avatar_path = null;
        }
        if ($request->hasFile('avatar')) {
            if ($user->avatar_path) Storage::disk('public')->delete($user->avatar_path);
            $user->avatar_path = $request->file('avatar')->store('avatars', 'public');
        }
        $user->save();
        return response()->json(['message' => 'Profile ပြင်ပြီးပါပြီ။', 'user' => $user->fresh()]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => 'required|string|current_password',
            'password' => ['required', 'string', 'min:8', 'confirmed', 'different:current_password', 'regex:/[A-Za-z]/', 'regex:/[0-9]/'],
        ]);
        $user = $request->user();
        $user->forceFill(['password' => Hash::make($data['password']), 'remember_token' => Str::random(60)])->save();
        $currentId = $user->currentAccessToken()->id;
        $user->tokens()->where('id', '!=', $currentId)->delete();
        return response()->json(['message' => 'Password ပြောင်းပြီးပါပြီ။ အခြား devices များမှ logout လုပ်ထားပါတယ်။']);
    }

    public function sessions(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()->id;
        $sessions = $request->user()->tokens()->latest()->get()->map(fn ($token) => [
            'id' => $token->id,
            'device' => $token->name,
            'ip_address' => $token->ip_address,
            'last_used_at' => $token->last_used_at,
            'created_at' => $token->created_at,
            'current' => $token->id === $currentId,
        ]);
        return response()->json(['data' => $sessions]);
    }

    public function revokeSession(Request $request, int $tokenId): JsonResponse
    {
        $token = $request->user()->tokens()->whereKey($tokenId)->firstOrFail();
        $current = $token->id === $request->user()->currentAccessToken()->id;
        $token->delete();
        return response()->json(['message' => 'Session ကို logout လုပ်ပြီးပါပြီ။', 'current' => $current]);
    }

    public function logoutOtherSessions(Request $request): JsonResponse
    {
        $deleted = $request->user()->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();
        return response()->json(['message' => 'အခြား device များမှ logout လုပ်ပြီးပါပြီ။', 'deleted' => $deleted]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'အကောင့်မှ ထွက်ပြီးပါပြီ။']);
    }

    private function createSessionToken(User $user, Request $request, bool $remember = false): string
    {
        $agent = (string) $request->userAgent();
        $browser = str_contains($agent, 'Edg/') ? 'Edge' : (str_contains($agent, 'Chrome/') ? 'Chrome' : (str_contains($agent, 'Firefox/') ? 'Firefox' : (str_contains($agent, 'Safari/') ? 'Safari' : 'Browser')));
        $device = preg_match('/Mobile|Android|iPhone/i', $agent) ? 'Mobile' : 'Desktop';
        $token = $user->createToken("{$browser} · {$device}", ['*'], $remember ? now()->addDays(30) : null);
        $token->accessToken->forceFill(['ip_address' => $request->ip(), 'user_agent' => Str::limit($agent, 1000, '')])->save();
        return $token->plainTextToken;
    }
}
