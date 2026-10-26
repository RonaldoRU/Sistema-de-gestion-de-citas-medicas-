<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    $path = base_path('Frontend/stitch/html/inicio.html');
    if (file_exists($path)) {
        return response()->file($path, ['Content-Type' => 'text/html; charset=UTF-8']);
    }
    return redirect('/Frontend/stitch/html/inicio.html');
})->name('home');

Route::get('/inicio', function () {
    return redirect('/Frontend/stitch/html/inicio.html');
})->name('inicio');

// Rutas Web de Autenticación
Route::get('/login', function () {
    return redirect('/Frontend/stitch/html/P1%20Seguridad%20y%20Autenticaci%C3%B3n/cu01-iniciar-sesion.html');
})->name('login');

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Ruta para servir archivos estáticos de Frontend si se solicita con minúscula o mayúscula
Route::get('/frontend/{path?}', function ($path = 'stitch/html/inicio.html') {
    $fullPath = base_path('Frontend/' . $path);
    if (!file_exists($fullPath) || is_dir($fullPath)) {
        abort(404);
    }
    $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
    $mimeType = match ($ext) {
        'html' => 'text/html; charset=UTF-8',
        'css' => 'text/css; charset=UTF-8',
        'js' => 'application/javascript; charset=UTF-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        'json' => 'application/json',
        default => 'text/plain',
    };
    return response()->file($fullPath, ['Content-Type' => $mimeType]);
})->where('path', '.*');
