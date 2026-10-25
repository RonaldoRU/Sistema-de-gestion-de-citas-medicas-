<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // =========================================================================
        // 1. PAQUETE P1 Y P2: SEGURIDAD, USUARIOS Y ROLES (RBAC)
        // =========================================================================

        // 1. Persona (Superclase)
        Schema::create('persona', function (Blueprint $table) {
            $table->id('id_persona');
            $table->string('ci', 20)->unique();
            $table->string('nombres', 80);
            $table->string('apellidos', 80);
            $table->string('telefono', 20)->nullable();
            $table->string('email', 150)->unique()->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamp('fecha_registro')->useCurrent();
        });

        // 3. Rol
        Schema::create('rol', function (Blueprint $table) {
            $table->id('id_rol');
            $table->string('nombre', 50)->unique();
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });

        // 4. Permiso
        Schema::create('permiso', function (Blueprint $table) {
            $table->id('id_permiso');
            $table->string('nombre', 80)->unique();
            $table->string('modulo', 60);
            $table->string('ruta_menu', 150)->nullable();
            $table->timestamps();
        });

        // 5. RolPermiso (Clase de Asociación)
        Schema::create('rol_permiso', function (Blueprint $table) {
            $table->foreignId('id_rol')->constrained('rol', 'id_rol')->cascadeOnDelete();
            $table->foreignId('id_permiso')->constrained('permiso', 'id_permiso')->cascadeOnDelete();
            $table->timestamp('fecha_asignacion')->useCurrent();
            $table->primary(['id_rol', 'id_permiso']);
        });

        // 2. Usuario
        Schema::create('usuario', function (Blueprint $table) {
            $table->id('id_usuario');
            $table->foreignId('id_persona')->unique()->constrained('persona', 'id_persona')->cascadeOnDelete();
            $table->foreignId('id_rol')->constrained('rol', 'id_rol');
            $table->string('nombre_usuario', 50)->unique();
            $table->string('hash_contrasena', 255);
            $table->string('estado', 20)->default('ACTIVO'); // ACTIVO, INACTIVO, BLOQUEADO
            $table->smallInteger('intentos_fallidos')->default(0);
            $table->timestamp('bloqueado_hasta')->nullable();
            $table->timestamp('ultimo_acceso')->nullable();
            $table->timestamp('fecha_creacion')->useCurrent();
            $table->rememberToken();
        });

        // 6. Sesion
        Schema::create('sesion', function (Blueprint $table) {
            $table->string('id_sesion', 128)->primary();
            $table->foreignId('id_usuario')->constrained('usuario', 'id_usuario')->cascadeOnDelete();
            $table->timestamp('fecha_inicio')->useCurrent();
            $table->timestamp('ultima_actividad')->useCurrent();
            $table->timestamp('fecha_cierre')->nullable();
            $table->boolean('activa')->default(true);
            $table->string('ip', 45)->nullable();
        });

        // 7. TokenRecuperacion
        Schema::create('token_recuperacion', function (Blueprint $table) {
            $table->id('id_token');
            $table->foreignId('id_usuario')->constrained('usuario', 'id_usuario')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('fecha_generacion')->useCurrent();
            $table->timestamp('fecha_expiracion');
            $table->boolean('usado')->default(false);
        });

        // 8. PersonalAdministrativo (Subclase de Persona)
        Schema::create('personal_administrativo', function (Blueprint $table) {
            $table->foreignId('id_persona')->primary()->constrained('persona', 'id_persona')->cascadeOnDelete();
            $table->string('cargo', 60);
            $table->timestamps();
        });

        // =========================================================================
        // 2. PAQUETE P3: AUDITORÍA Y BITÁCORA
        // =========================================================================

        // 9. Bitacora
        Schema::create('bitacora', function (Blueprint $table) {
            $table->id('id_bitacora');
            $table->foreignId('id_usuario')->nullable()->constrained('usuario', 'id_usuario')->nullOnDelete();
            $table->timestamp('fecha_hora')->useCurrent();
            $table->string('modulo', 60);
            $table->string('tipo_accion', 30); // CREAR, MODIFICAR, ELIMINAR, LOGIN, LOGOUT, BLOQUEO
            $table->string('tabla_afectada', 60)->nullable();
            $table->bigInteger('id_registro_afectado')->nullable();
            $table->text('detalle')->nullable();
            $table->string('ip', 45)->nullable();
        });

        // =========================================================================
        // 3. PAQUETE P4: GESTIÓN DE PACIENTES
        // =========================================================================

        // 10. Paciente (Subclase de Persona)
        Schema::create('paciente', function (Blueprint $table) {
            $table->foreignId('id_persona')->primary()->constrained('persona', 'id_persona')->cascadeOnDelete();
            $table->string('codigo', 15)->unique(); // PAC-0001
            $table->char('sexo', 1); // M / F
            $table->date('fecha_nacimiento');
            $table->string('direccion', 200)->nullable();
            $table->timestamps();
        });

        // 11. InformacionMedica
        Schema::create('informacion_medica', function (Blueprint $table) {
            $table->id('id_informacion');
            $table->foreignId('id_paciente')->unique()->constrained('paciente', 'id_persona')->cascadeOnDelete();
            $table->string('tipo_sangre', 3)->nullable();
            $table->text('alergias')->nullable();
            $table->text('enfermedades_cronicas')->nullable();
            $table->text('medicamentos_habituales')->nullable();
            $table->text('antecedentes_relevantes')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamp('fecha_actualizacion')->useCurrent();
        });

        // 12. ContactoEmergencia
        Schema::create('contacto_emergencia', function (Blueprint $table) {
            $table->id('id_contacto');
            $table->foreignId('id_paciente')->constrained('paciente', 'id_persona')->cascadeOnDelete();
            $table->string('nombre_completo', 150);
            $table->string('parentesco', 40);
            $table->string('telefono', 20);
            $table->timestamps();
        });

        // =========================================================================
        // 4. PAQUETE P5: GESTIÓN MÉDICA Y HORARIOS
        // =========================================================================

        // 13. Medico (Subclase de Persona)
        Schema::create('medico', function (Blueprint $table) {
            $table->foreignId('id_persona')->primary()->constrained('persona', 'id_persona')->cascadeOnDelete();
            $table->string('codigo', 15)->unique(); // MED-001
            $table->string('matricula', 30)->unique();
            $table->timestamps();
        });

        // 14. Especialidad
        Schema::create('especialidad', function (Blueprint $table) {
            $table->id('id_especialidad');
            $table->string('nombre', 80)->unique();
            $table->string('descripcion', 200)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // 15. MedicoEspecialidad (Clase de Asociación)
        Schema::create('medico_especialidad', function (Blueprint $table) {
            $table->foreignId('id_medico')->constrained('medico', 'id_persona')->cascadeOnDelete();
            $table->foreignId('id_especialidad')->constrained('especialidad', 'id_especialidad')->cascadeOnDelete();
            $table->timestamp('fecha_asignacion')->useCurrent();
            $table->primary(['id_medico', 'id_especialidad']);
        });

        // 16. Horario
        Schema::create('horario', function (Blueprint $table) {
            $table->id('id_horario');
            $table->foreignId('id_medico')->constrained('medico', 'id_persona')->cascadeOnDelete();
            $table->smallInteger('dia_semana'); // 1 = Lunes, ..., 7 = Domingo
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->smallInteger('duracion_bloque_min')->default(30);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // 17. BloqueoAgenda
        Schema::create('bloqueo_agenda', function (Blueprint $table) {
            $table->id('id_bloqueo');
            $table->foreignId('id_medico')->nullable()->constrained('medico', 'id_persona')->cascadeOnDelete();
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->string('motivo', 200);
            $table->string('tipo', 30); // FERIADO, LICENCIA, OTRO
            $table->boolean('aplica_a_todos')->default(false);
            $table->timestamps();
        });

        // =========================================================================
        // 5. PAQUETE P6: GESTIÓN DE CITAS MÉDICAS
        // =========================================================================

        // 18. Cita
        Schema::create('cita', function (Blueprint $table) {
            $table->id('id_cita');
            $table->string('codigo', 12)->unique(); // CM-0001
            $table->foreignId('id_paciente')->constrained('paciente', 'id_persona')->cascadeOnDelete();
            $table->foreignId('id_medico')->constrained('medico', 'id_persona')->cascadeOnDelete();
            $table->foreignId('id_especialidad')->constrained('especialidad', 'id_especialidad')->cascadeOnDelete();
            $table->foreignId('id_usuario_registro')->constrained('usuario', 'id_usuario');
            $table->foreignId('id_cita_origen')->nullable()->constrained('cita', 'id_cita')->nullOnDelete();
            $table->date('fecha');
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->string('motivo_consulta', 200);
            $table->string('estado', 30)->default('PROGRAMADA'); // PROGRAMADA, CONFIRMADA, ATENDIDA, CANCELADA, INASISTENCIA
            $table->string('motivo_cancelacion', 200)->nullable();
            $table->text('observacion_atencion')->nullable();
            $table->timestamp('fecha_hora_atencion')->nullable();
            $table->timestamp('fecha_creacion')->useCurrent();
            $table->timestamps();
        });

        // 19. HistorialEstadoCita
        Schema::create('historial_estado_cita', function (Blueprint $table) {
            $table->id('id_historial');
            $table->foreignId('id_cita')->constrained('cita', 'id_cita')->cascadeOnDelete();
            $table->foreignId('id_usuario')->constrained('usuario', 'id_usuario');
            $table->string('estado_anterior', 30)->nullable();
            $table->string('estado_nuevo', 30);
            $table->date('fecha_anterior')->nullable();
            $table->time('hora_anterior')->nullable();
            $table->string('motivo', 200)->nullable();
            $table->timestamp('fecha_cambio')->useCurrent();
        });

        // 20. Notificacion
        Schema::create('notificacion', function (Blueprint $table) {
            $table->id('id_notificacion');
            $table->foreignId('id_cita')->constrained('cita', 'id_cita')->cascadeOnDelete();
            $table->foreignId('id_usuario_gestion')->nullable()->constrained('usuario', 'id_usuario')->nullOnDelete();
            $table->text('mensaje');
            $table->timestamp('fecha_programada');
            $table->timestamp('fecha_envio')->nullable();
            $table->string('estado', 30)->default('PENDIENTE'); // PENDIENTE, ENVIADA, FALLIDA
            $table->smallInteger('intentos')->default(0);
            $table->timestamps();
        });

        // =========================================================================
        // 6. PAQUETE P7: REPORTES ADMINISTRATIVOS
        // =========================================================================

        // 21. Reporte
        Schema::create('reporte', function (Blueprint $table) {
            $table->id('id_reporte');
            $table->foreignId('id_usuario')->constrained('usuario', 'id_usuario')->cascadeOnDelete();
            $table->string('tipo', 60); // CITAS_PERIODO, ATENCIONES_MEDICO_ESPECIALIDAD, CONTROL_ASISTENCIA, PACIENTES_REGISTRADOS
            $table->date('fecha_desde')->nullable();
            $table->date('fecha_hasta')->nullable();
            $table->json('filtros')->nullable();
            $table->string('formato', 4)->nullable(); // PDF, CSV
            $table->timestamp('fecha_generacion')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reporte');
        Schema::dropIfExists('notificacion');
        Schema::dropIfExists('historial_estado_cita');
        Schema::dropIfExists('cita');
        Schema::dropIfExists('bloqueo_agenda');
        Schema::dropIfExists('horario');
        Schema::dropIfExists('medico_especialidad');
        Schema::dropIfExists('especialidad');
        Schema::dropIfExists('medico');
        Schema::dropIfExists('contacto_emergencia');
        Schema::dropIfExists('informacion_medica');
        Schema::dropIfExists('paciente');
        Schema::dropIfExists('bitacora');
        Schema::dropIfExists('personal_administrativo');
        Schema::dropIfExists('token_recuperacion');
        Schema::dropIfExists('sesion');
        Schema::dropIfExists('usuario');
        Schema::dropIfExists('rol_permiso');
        Schema::dropIfExists('permiso');
        Schema::dropIfExists('rol');
        Schema::dropIfExists('persona');
    }
};
