<?php

use App\Http\Controllers\BitacoraController;
use App\Http\Controllers\BloqueoAgendaController;
use App\Http\Controllers\CitaController;
use App\Http\Controllers\ContactoEmergenciaController;
use App\Http\Controllers\EspecialidadController;
use App\Http\Controllers\HistorialEstadoCitaController;
use App\Http\Controllers\HorarioController;
use App\Http\Controllers\InformacionMedicaController;
use App\Http\Controllers\MedicoController;
use App\Http\Controllers\MedicoEspecialidadController;
use App\Http\Controllers\NotificacionController;
use App\Http\Controllers\PacienteController;
use App\Http\Controllers\PagoController;
use App\Http\Controllers\PermisoController;
use App\Http\Controllers\PersonaController;
use App\Http\Controllers\PersonalAdministrativoController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\RolController;
use App\Http\Controllers\RolPermisoController;
use App\Http\Controllers\SesionController;
use App\Http\Controllers\TokenRecuperacionController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Citas Médicas Clínica Vida Salud (Paquetes P1 a P7)
|--------------------------------------------------------------------------
*/

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Clinica Vida Salud API',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// =========================================================================
// PAQUETE P1: SEGURIDAD, SESIONES Y TOKENS DE RECUPERACIÓN (CU01–CU04)
// =========================================================================
Route::prefix('auth')->group(function (): void {
    // CU01 & CU04: Iniciar Sesión y Bloqueo Automático -> SesionController
    Route::post('/login', [SesionController::class, 'login'])->name('api.auth.login');

    // CU03: Recuperar / Restablecer Contraseña -> TokenRecuperacionController
    Route::post('/recuperar-clave/solicitar', [TokenRecuperacionController::class, 'solicitarRecuperacion'])->name('api.auth.recuperar.solicitar');
    Route::post('/recuperar-clave/restablecer', [TokenRecuperacionController::class, 'restablecerContrasena'])->name('api.auth.recuperar.restablecer');

    // CU02: Resumen y Cierre de Sesión -> SesionController
    Route::get('/logout-summary', [SesionController::class, 'logoutSummary'])->name('api.auth.logout-summary');
    Route::post('/logout', [SesionController::class, 'logout'])->name('api.auth.logout');

    // CU37: Auto-Registro de Cuenta de Paciente Web -> PacienteController
    Route::post('/autoregistro-paciente', [PacienteController::class, 'autoRegistroWeb'])->name('api.auth.autoregistro-paciente');

    // Rutas protegidas de sesión
    Route::middleware('auth')->group(function (): void {
        Route::get('/me', [SesionController::class, 'me'])->name('api.auth.me');
    });
});

// Rutas protegidas que requieren sesión activa
Route::middleware('auth')->group(function (): void {

    // =====================================================================
    // PAQUETE P1 / P2: PERSONAS, PERSONAL ADMINISTRATIVO Y SESIONES
    // =====================================================================
    Route::prefix('personas')->middleware('rol:ADMINISTRADOR')->group(function (): void {
        Route::get('/', [PersonaController::class, 'index'])->name('api.personas.index');
        Route::get('/{id}', [PersonaController::class, 'show'])->name('api.personas.show');
        Route::post('/', [PersonaController::class, 'store'])->name('api.personas.store');
        Route::put('/{id}', [PersonaController::class, 'update'])->name('api.personas.update');
    });

    Route::prefix('personal-administrativo')->middleware('rol:ADMINISTRADOR')->group(function (): void {
        Route::get('/', [PersonalAdministrativoController::class, 'index'])->name('api.personal-administrativo.index');
        Route::get('/{id}', [PersonalAdministrativoController::class, 'show'])->name('api.personal-administrativo.show');
        Route::post('/', [PersonalAdministrativoController::class, 'store'])->name('api.personal-administrativo.store');
        Route::put('/{id}', [PersonalAdministrativoController::class, 'update'])->name('api.personal-administrativo.update');
    });

    Route::prefix('sesiones')->middleware('rol:ADMINISTRADOR')->group(function (): void {
        Route::get('/', [SesionController::class, 'index'])->name('api.sesiones.index');
    });

    Route::prefix('tokens-recuperacion')->middleware('rol:ADMINISTRADOR')->group(function (): void {
        Route::get('/', [TokenRecuperacionController::class, 'index'])->name('api.tokens-recuperacion.index');
    });

    // =====================================================================
    // PAQUETE P2: USUARIOS, ROLES, PERMISOS Y ROL_PERMISO (RBAC) (CU05–CU09)
    // =====================================================================
    Route::prefix('usuarios')->group(function (): void {
        Route::get('/', [UsuarioController::class, 'index'])->middleware('rol:ADMINISTRADOR')->name('api.usuarios.index');
        Route::get('/{id}', [UsuarioController::class, 'show'])->name('api.usuarios.show');
        Route::post('/', [UsuarioController::class, 'store'])->middleware('rol:ADMINISTRADOR')->name('api.usuarios.store');
        Route::put('/{id}', [UsuarioController::class, 'update'])->name('api.usuarios.update');
        Route::put('/{id}/cambiar-rol', [UsuarioController::class, 'cambiarRol'])->middleware('rol:ADMINISTRADOR')->name('api.usuarios.cambiarRol');
        Route::put('/{id}/inactivar', [UsuarioController::class, 'inactivar'])->middleware('rol:ADMINISTRADOR')->name('api.usuarios.inactivar');
        Route::put('/{id}/reactivar', [UsuarioController::class, 'reactivar'])->middleware('rol:ADMINISTRADOR')->name('api.usuarios.reactivar');
    });

    Route::prefix('permisos')->middleware('rol:ADMINISTRADOR')->group(function (): void {
        Route::get('/', [PermisoController::class, 'index'])->name('api.permisos.index');
        Route::get('/{id}', [PermisoController::class, 'show'])->name('api.permisos.show');
        Route::post('/', [PermisoController::class, 'store'])->name('api.permisos.store');
    });

    Route::prefix('roles')->middleware('rol:ADMINISTRADOR')->group(function (): void {
        Route::get('/', [RolController::class, 'index'])->name('api.roles.index');
        Route::get('/permisos', [PermisoController::class, 'index'])->name('api.roles.permisos');
        Route::get('/{id}', [RolController::class, 'show'])->name('api.roles.show');
        Route::post('/', [RolController::class, 'store'])->name('api.roles.store');
        Route::put('/{id}', [RolController::class, 'update'])->name('api.roles.update');
        Route::get('/{id}/permisos', [RolPermisoController::class, 'index'])->name('api.roles.permisos.index');
        Route::put('/{id}/permisos', [RolPermisoController::class, 'sincronizarPermisos'])->name('api.roles.sincronizarPermisos');
    });

    // =====================================================================
    // PAQUETE P3: AUDITORÍA Y BITÁCORA (CU10–CU11)
    // =====================================================================
    Route::prefix('bitacora')->middleware('rol:ADMINISTRADOR')->group(function (): void {
        Route::get('/', [BitacoraController::class, 'index'])->name('api.bitacora.index');
        Route::get('/live', [BitacoraController::class, 'live'])->name('api.bitacora.live');
        Route::get('/resumen', [BitacoraController::class, 'resumen'])->name('api.bitacora.resumen');
        Route::get('/{id}', [BitacoraController::class, 'show'])->name('api.bitacora.show');
    });

    // =====================================================================
    // PAQUETE P4: PACIENTES, INFORMACIÓN MÉDICA Y CONTACTOS DE EMERGENCIA
    // =====================================================================
    Route::prefix('pacientes')->group(function (): void {
        Route::get('/', [PacienteController::class, 'index'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO')->name('api.pacientes.index');
        Route::get('/{id}', [PacienteController::class, 'show'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO,PACIENTE')->name('api.pacientes.show');
        Route::post('/', [PacienteController::class, 'store'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.store');
        Route::put('/{id}', [PacienteController::class, 'update'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.update');
        Route::put('/{id}/inactivar', [PacienteController::class, 'inactivar'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.inactivar');
        Route::put('/{id}/reactivar', [PacienteController::class, 'reactivar'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.reactivar');

        // Información Médica -> InformacionMedicaController
        Route::get('/{id}/informacion-medica', [InformacionMedicaController::class, 'show'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO,PACIENTE')->name('api.pacientes.infoMedica.show');
        Route::post('/{id}/informacion-medica', [InformacionMedicaController::class, 'guardarInfoMedica'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO')->name('api.pacientes.infoMedica');

        // Contactos de Emergencia -> ContactoEmergenciaController
        Route::get('/{id}/contactos-emergencia', [ContactoEmergenciaController::class, 'index'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO,PACIENTE')->name('api.pacientes.contactos.index');
        Route::post('/{id}/contactos-emergencia', [ContactoEmergenciaController::class, 'agregarContactoEmergencia'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.contactos.store');
        Route::delete('/{id}/contactos-emergencia/{contactoId}', [ContactoEmergenciaController::class, 'eliminarContactoEmergencia'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.pacientes.contactos.destroy');

        // Historial de Citas del Paciente -> CitaController
        Route::get('/{id}/historial-citas', [CitaController::class, 'historialCitas'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO,PACIENTE')->name('api.pacientes.historialCitas');
    });

    // =====================================================================
    // PAQUETE P5: ESPECIALIDADES, MÉDICOS, HORARIOS Y BLOQUEOS DE AGENDA
    // =====================================================================
    Route::prefix('especialidades')->group(function (): void {
        Route::get('/', [EspecialidadController::class, 'index'])->name('api.especialidades.index');
        Route::get('/{id}', [EspecialidadController::class, 'show'])->name('api.especialidades.show');
        Route::post('/', [EspecialidadController::class, 'store'])->middleware('rol:ADMINISTRADOR')->name('api.especialidades.store');
        Route::put('/{id}', [EspecialidadController::class, 'update'])->middleware('rol:ADMINISTRADOR')->name('api.especialidades.update');
        Route::delete('/{id}', [EspecialidadController::class, 'destroy'])->middleware('rol:ADMINISTRADOR')->name('api.especialidades.destroy');
    });

    Route::prefix('medicos')->group(function (): void {
        Route::get('/', [MedicoController::class, 'index'])->name('api.medicos.index');
        Route::get('/{id}', [MedicoController::class, 'show'])->name('api.medicos.show');
        Route::post('/', [MedicoController::class, 'store'])->middleware('rol:ADMINISTRADOR')->name('api.medicos.store');
        Route::put('/{id}', [MedicoController::class, 'update'])->middleware('rol:ADMINISTRADOR')->name('api.medicos.update');
        Route::put('/{id}/inactivar', [MedicoController::class, 'inactivar'])->middleware('rol:ADMINISTRADOR')->name('api.medicos.inactivar');
        Route::put('/{id}/reactivar', [MedicoController::class, 'reactivar'])->middleware('rol:ADMINISTRADOR')->name('api.medicos.reactivar');

        // Especialidades del Médico -> MedicoEspecialidadController
        Route::get('/{id}/especialidades', [MedicoEspecialidadController::class, 'index'])->name('api.medicos.especialidades.index');
        Route::put('/{id}/especialidades', [MedicoEspecialidadController::class, 'sincronizar'])->middleware('rol:ADMINISTRADOR')->name('api.medicos.especialidades.sincronizar');

        // Horarios del Médico -> HorarioController
        Route::post('/{id}/horarios', [HorarioController::class, 'configurarHorarios'])->middleware('rol:ADMINISTRADOR,MEDICO')->name('api.medicos.horarios.configurar');
        Route::delete('/{id}/horarios/{horarioId}', [HorarioController::class, 'eliminarHorario'])->middleware('rol:ADMINISTRADOR,MEDICO')->name('api.medicos.horarios.eliminar');
        Route::get('/{id}/horarios', [HorarioController::class, 'obtenerHorarios'])->name('api.medicos.horarios.obtener');
    });

    Route::prefix('bloqueos-agenda')->group(function (): void {
        Route::get('/', [BloqueoAgendaController::class, 'index'])->name('api.bloqueos.index');
        Route::post('/', [BloqueoAgendaController::class, 'store'])->middleware('rol:ADMINISTRADOR')->name('api.bloqueos.store');
        Route::delete('/{id}', [BloqueoAgendaController::class, 'destroy'])->middleware('rol:ADMINISTRADOR')->name('api.bloqueos.destroy');
    });

    // =====================================================================
    // PAQUETE P6: CITAS MÉDICAS, HISTORIAL DE ESTADOS Y NOTIFICACIONES
    // =====================================================================
    Route::prefix('citas')->group(function (): void {
        Route::get('/', [CitaController::class, 'index'])->name('api.citas.index');
        Route::get('/disponibilidad', [CitaController::class, 'disponibilidad'])->name('api.citas.disponibilidad');
        Route::get('/proximo-libre', [CitaController::class, 'proximoLibre'])->name('api.citas.proximoLibre');
        Route::post('/', [CitaController::class, 'store'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,PACIENTE')->name('api.citas.store');
        Route::put('/{id}/reprogramar', [CitaController::class, 'reprogramar'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->name('api.citas.reprogramar');
        Route::put('/{id}/cancelar', [CitaController::class, 'cancelar'])->name('api.citas.cancelar');
        Route::put('/{id}/atender', [CitaController::class, 'registrarAtencion'])->middleware('rol:ADMINISTRADOR,MEDICO,RECEPCIONISTA')->name('api.citas.atender');
        Route::put('/{id}/estado', [CitaController::class, 'cambiarEstado'])->middleware('rol:ADMINISTRADOR,RECEPCIONISTA,MEDICO')->name('api.citas.estado');

        // Historial de Estados de Cita -> HistorialEstadoCitaController
        Route::get('/{id}/historial-estados', [HistorialEstadoCitaController::class, 'index'])->name('api.citas.historialEstados.index');
        Route::post('/{id}/historial-estados', [HistorialEstadoCitaController::class, 'store'])->name('api.citas.historialEstados.store');
    });

    Route::prefix('notificaciones')->middleware('rol:ADMINISTRADOR,RECEPCIONISTA')->group(function (): void {
        Route::get('/', [NotificacionController::class, 'index'])->name('api.notificaciones.index');
        Route::post('/', [NotificacionController::class, 'store'])->name('api.notificaciones.store');
        Route::post('/regenerar', [NotificacionController::class, 'regenerarLista'])->name('api.notificaciones.regenerar');
        Route::put('/{id}/gestion', [NotificacionController::class, 'registrarGestion'])->name('api.notificaciones.gestion');
    });

    // =====================================================================
    // PAQUETE P7: REPORTES ADMINISTRATIVOS
    // =====================================================================
    Route::prefix('reportes')->middleware('rol:ADMINISTRADOR')->group(function (): void {
        Route::get('/', [ReporteController::class, 'index'])->name('api.reportes.index');
        Route::post('/', [ReporteController::class, 'store'])->name('api.reportes.store');
    });

    // =====================================================================
    // PAQUETE P8: PAGOS, COMPROBANTES Y REEMBOLSOS (STRIPE / QR / TARJETA)
    // =====================================================================
    Route::prefix('pagos')->group(function (): void {
        Route::get('/', [PagoController::class, 'index'])->name('api.pagos.index');
        Route::post('/', [PagoController::class, 'store'])->name('api.pagos.store');
        Route::get('/{id}', [PagoController::class, 'show'])->name('api.pagos.show');
        Route::post('/{id}/reembolso', [PagoController::class, 'reembolsar'])->name('api.pagos.reembolso');
        Route::post('/stripe/crear-sesion', [PagoController::class, 'crearIntentoStripe'])->name('api.pagos.stripe.session');
    });

});
