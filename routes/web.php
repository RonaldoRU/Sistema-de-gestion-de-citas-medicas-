<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Rutas Web de Autenticación
Route::get('/login', function () {
    return response()->json([
        'message' => 'Endpoint de inicio de sesión de la Clínica Vida Salud.',
        'instrucciones' => 'Envíe sus credenciales vía POST a /api/auth/login o /login.',
    ]);
})->name('login');

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
