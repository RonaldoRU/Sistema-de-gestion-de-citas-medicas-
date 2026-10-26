<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BitacoraController;
use App\Http\Controllers\BloqueoAgendaController;
use App\Http\Controllers\CitaController;
use App\Http\Controllers\EspecialidadController;
use App\Http\Controllers\MedicoController;
use App\Http\Controllers\NotificacionController;
use App\Http\Controllers\PacienteController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\RolController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Citas Médicas Clínica Vida Salud (Paquetes P1 a P7)
|--------------------------------------------------------------------------
*/

// =========================================================================
// PAQUETE P1 Y P2: SEGURIDAD Y AUTENTICACIÓN (CU01–CU04)
// =========================================================================
Route::prefix('auth')->group(function () {
    // CU01 & CU04: Iniciar Sesión y Bloqueo Automático
    Route::post('/login', [AuthController::class, 'login'])->name('api.auth.login');

    // CU03: Recuperar / Restablecer Contraseña (Token 6 dígitos, 15 min)
    Route::post('/recuperar-clave/solicitar', [AuthController::class, 'solicitarRecuperacion'])->name('api.auth.recuperar.solicitar');
    Route::post('/recuperar-clave/restablecer', [AuthController::class, 'restablecerContrasena'])->name('api.auth.recuperar.restablecer');

    // Rutas protegidas de sesión
    Route::middleware('auth')->group(function () {
        // CU02: Cerrar Sesión y Revocar Sesión
        Route::post('/logout', [AuthController::class, 'logout'])->name('api.auth.logout');
        Route::get('/me', [AuthController::class, 'me'])->name('api.auth.me');
    });
});

// Rutas protegidas que requieren sesión activa
Route::middleware('auth')->group(function () {

    // =====================================================================
    // PAQUETE P2: ADMINISTRACIÓN DE USUARIOS Y ROLES (RBAC) (CU05–CU09)
    // =====================================================================
    Route::prefix('usuarios')->group(function () {
        Route::get('/', [UsuarioController::class, 'index'])->middleware('rol:ADMINISTRADOR')->name('api.usuarios.index');
        Route::get('/{id}', [UsuarioController::class, 'show'])->name('api.usuarios.show');
        Route::post('/', [UsuarioController::class, 'store'])->middleware('rol:ADMINISTRADOR')->name('api.usuarios.store');
        Route::put('/{id}', [UsuarioController::class, 'update'])->name('api.usuarios.update');
        Route::put('/{id}/cambiar-rol', [UsuarioController::class, 'cambiarRol'])->middleware('rol:ADMINISTRADOR')->name('api.usuarios.cambiarRol');
        Route::put('/{id}/inactivar', [UsuarioController::class, 'inactivar'])->middleware('rol:ADMINISTRADOR')->name('api.usuarios.inactivar');
        Route::put('/{id}/reactivar', [UsuarioController::class, 'reactivar'])->middleware('rol:ADMINISTRADOR')->name('api.usuarios.reactivar');
    });

    Route::prefix('roles')->middleware('rol:ADMINISTRADOR')->group(function () {
        Route::get('/', [RolController::class, 'index'])->name('api.roles.index');
        Route::get('/permisos', [RolController::class, 'permisos'])->name('api.roles.permisos');
        Route::get('/{id}', [RolController::class, 'show'])->name('api.roles.show');
        Route::post('/', [RolController::class, 'store'])->name('api.roles.store');
        Route::put('/{id}/permisos', [RolController::class, 'sincronizarPermisos'])->name('api.roles.sincronizarPermisos');
    });

    // =====================================================================
    // PAQUETE P3: AUDITORÍA Y BITÁCORA (CU10–CU11)
    // =====================================================================
    Route::prefix('bitacora')->middleware('rol:ADMINISTRADOR')->group(function () {
        Route::get('/', [BitacoraController::class, 'index'])->name('api.bitacora.index');
        Route::get('/live', [BitacoraController::class, 'live'])->name('api.bitacora.live');
        Route::get('/resumen', [BitacoraController::class, 'resumen'])->name('api.bitacora.resumen');
        Route::get('/{id}', [BitacoraController::class, 'show'])->name('api.bitacora.show');
    });

    // =====================================================================
    // PAQUETE P4: GESTIÓN DE PACIENTES (CU12–CU17)
    // =====================================================================
    Route::prefix('pacientes')->group(function () {
        Route::get('/', [PacienteController::class, 'index'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO')->name('api.pacientes.index');
        Route::get('/{id}', [PacienteController::class, 'show'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO')->name('api.pacientes.show');
        Route::post('/', [PacienteController::class, 'store'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.store');
        Route::put('/{id}', [PacienteController::class, 'update'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.update');

        Route::post('/{id}/informacion-medica', [PacienteController::class, 'guardarInfoMedica'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO')->name('api.pacientes.infoMedica');

        Route::post('/{id}/contactos-emergencia', [PacienteController::class, 'agregarContactoEmergencia'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.contactos.store');
        Route::delete('/{id}/contactos-emergencia/{contactoId}', [PacienteController::class, 'eliminarContactoEmergencia'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.contactos.destroy');

        Route::get('/{id}/historial-citas', [PacienteController::class, 'historialCitas'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO')->name('api.pacientes.historialCitas');
        Route::put('/{id}/inactivar', [PacienteController::class, 'inactivar'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.inactivar');
        Route::put('/{id}/reactivar', [PacienteController::class, 'reactivar'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.reactivar');
    });

    // =====================================================================
    // PAQUETE P5: GESTIÓN MÉDICA Y HORARIOS (CU18–CU22)
    // =====================================================================
    Route::prefix('especialidades')->group(function () {
        Route::get('/', [EspecialidadController::class, 'index'])->name('api.especialidades.index');
        Route::post('/', [EspecialidadController::class, 'store'])->middleware('rol:ADMINISTRADOR')->name('api.especialidades.store');
        Route::put('/{id}', [EspecialidadController::class, 'update'])->middleware('rol:ADMINISTRADOR')->name('api.especialidades.update');
        Route::delete('/{id}', [EspecialidadController::class, 'destroy'])->middleware('rol:ADMINISTRADOR')->name('api.especialidades.destroy');
    });

    Route::prefix('medicos')->group(function () {
        Route::get('/', [MedicoController::class, 'index'])->name('api.medicos.index');
        Route::get('/{id}', [MedicoController::class, 'show'])->name('api.medicos.show');
        Route::post('/', [MedicoController::class, 'store'])->middleware('rol:ADMINISTRADOR')->name('api.medicos.store');
        Route::put('/{id}', [MedicoController::class, 'update'])->middleware('rol:ADMINISTRADOR')->name('api.medicos.update');

        Route::post('/{id}/horarios', [MedicoController::class, 'configurarHorarios'])->middleware('rol:ADMINISTRADOR')->name('api.medicos.horarios.configurar');
        Route::get('/{id}/horarios', [MedicoController::class, 'obtenerHorarios'])->name('api.medicos.horarios.obtener');

        Route::put('/{id}/inactivar', [MedicoController::class, 'inactivar'])->middleware('rol:ADMINISTRADOR')->name('api.medicos.inactivar');
        Route::put('/{id}/reactivar', [MedicoController::class, 'reactivar'])->middleware('rol:ADMINISTRADOR')->name('api.medicos.reactivar');
    });

    Route::prefix('bloqueos-agenda')->group(function () {
        Route::get('/', [BloqueoAgendaController::class, 'index'])->name('api.bloqueos.index');
        Route::post('/', [BloqueoAgendaController::class, 'store'])->middleware('rol:ADMINISTRADOR')->name('api.bloqueos.store');
        Route::delete('/{id}', [BloqueoAgendaController::class, 'destroy'])->middleware('rol:ADMINISTRADOR')->name('api.bloqueos.destroy');
    });

    // =====================================================================
    // PAQUETE P6: GESTIÓN DE CITAS MÉDICAS Y NOTIFICACIONES
    // =====================================================================
    Route::prefix('citas')->group(function () {
        Route::get('/', [CitaController::class, 'index'])->name('api.citas.index');
        Route::post('/', [CitaController::class, 'store'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.citas.store');
        Route::put('/{id}/reprogramar', [CitaController::class, 'reprogramar'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.citas.reprogramar');
        Route::put('/{id}/cancelar', [CitaController::class, 'cancelar'])->name('api.citas.cancelar');
        Route::put('/{id}/atender', [CitaController::class, 'registrarAtencion'])->middleware('rol:ADMINISTRADOR,MEDICO')->name('api.citas.atender');
    });

    Route::prefix('notificaciones')->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->group(function () {
        Route::get('/', [NotificacionController::class, 'index'])->name('api.notificaciones.index');
        Route::post('/', [NotificacionController::class, 'store'])->name('api.notificaciones.store');
        Route::put('/{id}/gestion', [NotificacionController::class, 'registrarGestion'])->name('api.notificaciones.gestion');
    });

    // =====================================================================
    // PAQUETE P7: REPORTES ADMINISTRATIVOS
    // =====================================================================
    Route::prefix('reportes')->middleware('rol:ADMINISTRADOR')->group(function () {
        Route::get('/', [ReporteController::class, 'index'])->name('api.reportes.index');
        Route::post('/', [ReporteController::class, 'store'])->name('api.reportes.store');
    });

});
