# ENI Premium Store API

Runnable Laravel 12 + Sanctum API for the ENI marketplace frontend.

## Local development

Requirements: PHP 8.2+ and Composer.

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

For the quickest local setup, set `DB_CONNECTION=sqlite`, create `database/database.sqlite`, then run:

```powershell
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

The frontend `.env.local` must contain:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run backend tests with:

```powershell
php artisan test
```

## Production notes

- Use MySQL/PostgreSQL and `APP_DEBUG=false`.
- Set a private `APP_KEY`, HTTPS `APP_URL`, exact `FRONTEND_URL`, and production Sanctum domains.
- Store payment proofs and delivery files on private disks.
- Run queues for notifications and delivery work.
- Configure backups, monitoring, log rotation, and a process manager.
- Never commit `.env`, database files, payment proofs, tokens, or delivery secrets.
