<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MigrateLegacySqliteUsers extends Command
{
    protected $signature = 'eni:migrate-sqlite-users {path=database/database.sqlite.backup}';
    protected $description = 'Copy users from the legacy SQLite database into the configured database';

    public function handle(): int
    {
        $path = base_path($this->argument('path'));
        if (!is_file($path)) {
            throw new RuntimeException("Legacy SQLite database not found: {$path}");
        }

        config(['database.connections.legacy_sqlite' => [
            'driver' => 'sqlite',
            'database' => $path,
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]]);

        $columns = ['id', 'name', 'email', 'email_verified_at', 'password', 'remember_token', 'created_at', 'updated_at', 'phone', 'telegram_username', 'telegram_id', 'role'];
        $users = DB::connection('legacy_sqlite')->table('users')->select($columns)->orderBy('id')->get();

        DB::transaction(function () use ($users, $columns): void {
            foreach ($users as $user) {
                $values = [];
                foreach ($columns as $column) {
                    $values[$column] = $user->{$column};
                }
                DB::table('users')->updateOrInsert(['email' => $user->email], $values);
            }
        });

        $this->info("Migrated {$users->count()} users without changing password hashes or roles.");
        return self::SUCCESS;
    }
}
