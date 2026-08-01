<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('throttle:api')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])->middleware('signed')->name('verification.verify');
    Route::post('/telegram/login', [AuthController::class, 'telegramLogin']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show'])->whereNumber('product');
    Route::get('/announcements', [AdminController::class, 'announcements']);
    Route::get('/reviews', [OrderController::class, 'reviews']);
    Route::get('/store-settings', [AdminController::class, 'publicStoreSettings']);
    Route::get('/orders/track/{orderNumber}', [OrderController::class, 'track'])->middleware('throttle:20,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/sessions', [AuthController::class, 'sessions']);
        Route::delete('/sessions/others', [AuthController::class, 'logoutOtherSessions']);
        Route::delete('/sessions/{tokenId}', [AuthController::class, 'revokeSession'])->whereNumber('tokenId');
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/profile', [AuthController::class, 'updateProfile']);
        Route::patch('/password', [AuthController::class, 'changePassword'])->middleware('throttle:5,1');
        Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])->middleware('throttle:3,1');
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/saved-products', [ProductController::class, 'saved']);
        Route::get('/notifications', [AdminController::class, 'userNotifications']);
        Route::patch('/notifications/read-all', [AdminController::class, 'readAllNotifications']);
        Route::patch('/notifications/{notification}/read', [AdminController::class, 'readNotification']);
        Route::post('/orders', [OrderController::class, 'store'])->middleware(['store.open','throttle:10,1']);
        Route::patch('/orders/{order}/cancel', [OrderController::class, 'cancel'])->middleware('throttle:10,1');
        Route::post('/orders/{order}/payment', [OrderController::class, 'submitPayment']);
        Route::post('/products/{product}/save', [ProductController::class, 'toggleSaved']);
        Route::post('/orders/{order}/review', [OrderController::class, 'review']);
        Route::patch('/reviews/{review}', [OrderController::class, 'updateReview']);
        Route::delete('/reviews/{review}', [OrderController::class, 'deleteReview']);
    });

    Route::prefix('admin')->middleware(['auth:sanctum', 'role:staff,admin', 'audit.admin'])->group(function () {
        Route::get('/products', [ProductController::class, 'adminIndex']);
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/orders', [AdminController::class, 'orders']);
        Route::patch('/orders/{order}/status', [AdminController::class, 'updateOrderStatus']);
        Route::get('/payments/{payment}/proof', [AdminController::class, 'paymentProof']);
        Route::post('/orders/{order}/delivery', [AdminController::class, 'uploadDelivery']);
        Route::patch('/orders/{order}/subscription-expiry', [AdminController::class, 'setSubscriptionExpiry']);
        Route::get('/announcements', [AdminController::class, 'adminAnnouncements']);
        Route::post('/notifications', [AdminController::class, 'sendNotification']);

        Route::middleware('role:admin')->group(function () {
            Route::apiResource('products', ProductController::class)->except(['index', 'show']);
            Route::apiResource('categories', CategoryController::class)->except(['index', 'show']);
            Route::get('/reports', [AdminController::class, 'reports']);
            Route::patch('/payments/{payment}/verify', [AdminController::class, 'verifyPayment']);
            Route::apiResource('announcements', AdminController::class)->only(['store', 'update', 'destroy']);
            Route::get('/users', [AdminController::class, 'users']);
            Route::patch('/users/{user}', [AdminController::class, 'updateUser']);
            Route::get('/activity-logs', [AdminController::class, 'activityLogs']);
            Route::get('/store-settings', [AdminController::class, 'storeSettings']);
            Route::patch('/store-settings', [AdminController::class, 'updateStoreSettings']);
        });
    });
});
