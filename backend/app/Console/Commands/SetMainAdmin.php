<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class SetMainAdmin extends Command
{
    protected $signature = 'admin:set-main {email}';
    protected $description = 'Promote the configured main-admin account to admin';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email address.');
            return self::FAILURE;
        }
        if (strcasecmp((string) config('app.main_admin_email'), $email) !== 0) {
            $this->error('MAIN_ADMIN_EMAIL in .env does not match this email.');
            return self::FAILURE;
        }
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();
        if (! $user) {
            $this->error('No registered account was found for this email.');
            return self::FAILURE;
        }
        $user->update(['role' => 'admin']);
        $this->info("{$user->email} is now the Main Admin with full access.");
        return self::SUCCESS;
    }
}
