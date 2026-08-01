<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'avatar_path', 'phone', 'telegram_username', 'telegram_id', 'role'];
    protected $hidden = ['password', 'remember_token'];
    protected $appends = ['avatar_url', 'is_main_admin'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'password' => 'hashed'];
    }

    public function orders(): HasMany { return $this->hasMany(Order::class); }
    public function savedProducts(): BelongsToMany { return $this->belongsToMany(Product::class); }
    public function reviews(): HasMany { return $this->hasMany(Review::class); }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path ? url('storage/'.$this->avatar_path) : null;
    }

    public function getIsMainAdminAttribute(): bool
    {
        $email = config('app.main_admin_email');
        return $this->role === 'admin' && $email && strcasecmp($this->email, $email) === 0;
    }
}
