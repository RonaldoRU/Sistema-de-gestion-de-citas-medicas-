<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/Frontend/stitch/html/inicio.html');
})->name('home');

Route::get('/inicio', function () {
    return redirect('/Frontend/stitch/html/inicio.html');
})->name('inicio');

// Rutas Web de Autenticación
Route::get('/login', function () {
    return redirect('/Frontend/stitch/html/P1%20Seguridad%20y%20Autenticaci%C3%B3n/cu01-iniciar-sesion.html');
})->name('login');

Route::post('/login', function (\Illuminate\Http\Request $request) {
    $controller = app(\App\Http\Controllers\AuthController::class);
    $resp = $controller->login($request);
    if ($request->wantsJson() || $request->ajax()) {
        return $resp;
    }
    if ($resp->getStatusCode() === 200) {
        return redirect('/Frontend/stitch/html/inicio.html');
    }
    return redirect('/Frontend/stitch/html/P1%20Seguridad%20y%20Autenticaci%C3%B3n/cu01-iniciar-sesion.html?error=credenciales');
});

Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Captura de redirección defensiva para formularios con action="inicio.html" relativo
Route::any('/Frontend/stitch/html/{pkg}/inicio.html', function () {
    return redirect('/Frontend/stitch/html/inicio.html');
})->where('pkg', 'P[0-9].*');

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
