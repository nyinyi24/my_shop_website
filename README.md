# ENI Premium Store

ENI Premium Store is a Next.js frontend with a Laravel API and MySQL database.

## Requirements

- Node.js 22 or newer
- PHP 8.2 or newer
- Composer
- MySQL (XAMPP is supported)

## Run locally

1. Start Apache and MySQL from XAMPP.
2. Make sure the Laravel database settings in `backend/.env` match MySQL.
3. Start the backend:

   ```powershell
   cd backend
   php artisan serve
   ```

4. In another terminal, start the frontend from the project root:

   ```powershell
   npm run dev
   ```

5. Open `http://localhost:3000`. The admin page is at
   `http://localhost:3000/admin`.

The frontend API address is configured in `.env.local`. The Laravel API normally
runs at `http://127.0.0.1:8000`.

## Useful commands

```powershell
npm run lint
npm run build

cd backend
php artisan migrate
php artisan test
```

Do not commit `.env.local` or `backend/.env`; they can contain local credentials.
