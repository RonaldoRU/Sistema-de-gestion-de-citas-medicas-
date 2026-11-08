<?php

namespace Tests\Feature;

use App\Models\Bitacora;
use App\Models\Cita;
use App\Models\Especialidad;
use App\Models\Horario;
use App\Models\Medico;
use App\Models\Paciente;
use App\Models\Rol;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ClinicaCasosDeUsoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * MÓDULO 1: CU01 y CU04 - Login y Bloqueo por 3 Intentos Fallidos
     */
    public function test_cu01_cu04_login_and_blocking_after_three_failed_attempts(): void
    {
        // 1. Intento fallido 1
        $res1 = $this->postJson('/api/auth/login', [
            'identificador' => 'admin@vidasalud.com',
            'password' => 'clave_incorrecta',
        ]);
        $res1->assertStatus(401);

        $usuario = Usuario::where('nombre_usuario', 'admin')->first();
        $this->assertEquals(1, $usuario->intentos_fallidos);

        // 2. Intento fallido 2
        $res2 = $this->postJson('/api/auth/login', [
            'identificador' => 'admin@vidasalud.com',
            'password' => 'clave_incorrecta_2',
        ]);
        $res2->assertStatus(401);

        $usuario->refresh();
        $this->assertEquals(2, $usuario->intentos_fallidos);

        // 3. Intento fallido 3 -> Bloqueo automático por 1 minuto
        $res3 = $this->postJson('/api/auth/login', [
            'identificador' => 'admin@vidasalud.com',
            'password' => 'clave_incorrecta_3',
        ]);
        $res3->assertStatus(423);
        $res3->assertJsonFragment(['bloqueado' => true]);

        // Verificar registro de auditoría de BLOQUEO (CU10)
        $this->assertDatabaseHas('bitacora', [
            'tipo_accion' => 'BLOQUEO',
            'modulo' => 'P1_SEGURIDAD',
        ]);

        // Desbloquear para probar login exitoso
        Usuario::where('nombre_usuario', 'admin')->update([
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
            'estado' => 'ACTIVO',
        ]);

        // Login exitoso
        $resSuccess = $this->postJson('/api/auth/login', [
            'identificador' => 'admin@vidasalud.com',
            'password' => 'Admin123*',
        ]);
        $resSuccess->assertStatus(200);
        $resSuccess->assertJsonFragment(['success' => true]);
        $this->assertAuthenticated();

        // Verificar auditoría de LOGIN en bitácora
        $this->assertDatabaseHas('bitacora', [
            'tipo_accion' => 'LOGIN',
            'modulo' => 'P1_SEGURIDAD',
        ]);
    }

    /**
     * MÓDULO 1: CU02 - Cerrar Sesión y Revocar Sesión
     */
    public function test_cu02_logout(): void
    {
        $admin = Usuario::where('nombre_usuario', 'admin')->first();
        $this->actingAs($admin);

        $response = $this->postJson('/api/auth/logout');
        $response->assertStatus(200);
        $this->assertGuest();

        // Verificar auditoría de LOGOUT
        $this->assertDatabaseHas('bitacora', [
            'tipo_accion' => 'LOGOUT',
            'modulo' => 'P1_SEGURIDAD',
        ]);
    }

    /**
     * MÓDULO 1: CU03 - Recuperar y Restablecer Contraseña Olvidada (Código 6 dígitos)
     */
    public function test_cu03_password_recovery_with_six_digit_code(): void
    {
        // 1. Solicitar recuperación
        $resSolicitud = $this->postJson('/api/auth/recuperar-clave/solicitar', [
            'identificador' => 'admin@vidasalud.com',
        ]);
        $resSolicitud->assertStatus(200);

        $codigoDemo = $resSolicitud->json('codigo_demo');
        $this->assertEquals(6, strlen($codigoDemo));

        // 2. Restablecer con nueva clave
        $resRestablecer = $this->postJson('/api/auth/recuperar-clave/restablecer', [
            'identificador' => 'admin@vidasalud.com',
            'codigo' => $codigoDemo,
            'password' => 'NuevaClave2026*',
            'password_confirmation' => 'NuevaClave2026*',
        ]);
        $resRestablecer->assertStatus(200);

        // Verificar que la clave se actualizó
        $admin = Usuario::where('nombre_usuario', 'admin')->first();
        $this->assertTrue(Hash::check('NuevaClave2026*', $admin->hash_contrasena));
    }

    /**
     * MÓDULO 2: CU05 - CU09 - Gestión de Usuarios y RBAC
     */
    public function test_cu05_cu09_usuarios_management(): void
    {
        $admin = Usuario::where('nombre_usuario', 'admin')->first();
        $this->actingAs($admin);

        // CU05: Registrar Nuevo Usuario
        $resCrear = $this->postJson('/api/usuarios', [
            'ci' => '4567890',
            'nombres' => 'María',
            'apellidos' => 'Carmen Recepcionista',
            'email' => 'maria.recepcion@vidasalud.com',
            'telefono' => '78912345',
            'id_rol' => 2, // RECEPCIONISTA
            'password' => 'Password123*',
        ]);
        $resCrear->assertStatus(201);
        $nuevoUserId = $resCrear->json('usuario.id_usuario');

        // CU06: Consultar Catálogo con Filtros
        $resIndex = $this->getJson('/api/usuarios?buscar=Carmen');
        $resIndex->assertStatus(200);
        $this->assertCount(1, $resIndex->json('data.data'));

        // CU07: Modificar Datos
        $resUpdate = $this->putJson("/api/usuarios/{$nuevoUserId}", [
            'nombres' => 'María Del Carmen',
            'apellidos' => 'Flores Tarde',
            'email' => 'maria.florestarde@vidasalud.com',
            'telefono' => '78999999',
        ]);
        $resUpdate->assertStatus(200);

        // CU08: Cambiar Rol
        $resRol = $this->putJson("/api/usuarios/{$nuevoUserId}/cambiar-rol", [
            'id_rol' => 1, // Ascender a ADMIN
        ]);
        $resRol->assertStatus(200);

        // CU08 / A1: Regla de Autoprotección
        $resAutoDegradarse = $this->putJson("/api/usuarios/{$admin->id_usuario}/cambiar-rol", [
            'id_rol' => 2,
        ]);
        $resAutoDegradarse->assertStatus(422);

        // CU09: Inactivar Cuenta (Baja Lógica)
        $resInactivar = $this->putJson("/api/usuarios/{$nuevoUserId}/inactivar");
        $resInactivar->assertStatus(200);
        $this->assertDatabaseHas('usuario', ['id_usuario' => $nuevoUserId, 'estado' => 'INACTIVO']);
    }

    /**
     * MÓDULO 3: CU10 y CU11 - Bitácora de Auditoría
     */
    public function test_cu10_cu11_bitacora(): void
    {
        $admin = Usuario::where('nombre_usuario', 'admin')->first();
        $this->actingAs($admin);

        $resBitacora = $this->getJson('/api/bitacora');
        $resBitacora->assertStatus(200);

        $resResumen = $this->getJson('/api/bitacora/resumen');
        $resResumen->assertStatus(200);

        // Verificar que la bitácora es exclusiva para ADMINISTRADOR (Recepcionista recibe 403)
        $recepcionista = Usuario::where('nombre_usuario', 'recepcion')->first();
        $this->actingAs($recepcionista);
        $resDenegado = $this->getJson('/api/bitacora');
        $resDenegado->assertStatus(403);
    }

    /**
     * MÓDULO 6: Disponibilidad horaria, transición de estados de cita y recordatorios con registro en bitácora
     */
    public function test_cu22_cu28_cu29_disponibilidad_estados_y_bitacora_completa(): void
    {
        $admin = Usuario::where('nombre_usuario', 'admin')->first();
        $this->actingAs($admin);

        $medico = Medico::first();
        $paciente = Paciente::first();
        $especialidad = Especialidad::first();

        // Consultar disponibilidad horaria (CU22)
        $resDisp = $this->getJson('/api/citas/disponibilidad?id_medico='.$medico->id_persona.'&fecha=2026-11-10');
        $resDisp->assertStatus(200);
        $resDisp->assertJsonStructure(['success', 'fecha', 'slots']);

        // Programar cita (CU24)
        $resCita = $this->postJson('/api/citas', [
            'id_paciente' => $paciente->id_persona,
            'id_medico' => $medico->id_persona,
            'id_especialidad' => $especialidad->id_especialidad,
            'fecha' => '2026-11-10',
            'hora_inicio' => '09:30',
            'motivo_consulta' => 'Chequeo preventivo anual',
        ]);
        $resCita->assertStatus(201);
        $idCita = $resCita->json('cita.id_cita');

        // Cambiar estado a CONFIRMADA (CU29)
        $resEstado = $this->putJson("/api/citas/{$idCita}/estado", [
            'estado' => 'CONFIRMADA',
            'motivo' => 'Paciente llegó a sala de espera',
        ]);
        $resEstado->assertStatus(200);
        $this->assertDatabaseHas('cita', ['id_cita' => $idCita, 'estado' => 'CONFIRMADA']);
        $this->assertDatabaseHas('bitacora', [
            'tabla_afectada' => 'cita',
            'id_registro_afectado' => $idCita,
            'tipo_accion' => 'MODIFICAR',
        ]);

        // Regenerar lista de recordatorios (CU28)
        $resRegen = $this->postJson('/api/notificaciones/regenerar');
        $resRegen->assertStatus(200);
    }

    /**
     * MÓDULO 4: CU12 - CU17 - Gestión de Pacientes
     */
    public function test_cu12_cu17_pacientes_crud(): void
    {
        $recepcionista = Usuario::where('nombre_usuario', 'recepcion')->first();
        $this->actingAs($recepcionista);

        // CU12: Registrar Paciente con correlativo PAC-XXXX
        $resPaciente = $this->postJson('/api/pacientes', [
            'ci' => '9876543',
            'nombres' => 'Juan Alberto',
            'apellidos' => 'Mamani Flores',
            'sexo' => 'M',
            'fecha_nacimiento' => '1990-05-15',
            'telefono' => '71122334',
            'email' => 'juan.mamani@correo.com',
            'direccion' => 'Av. Siempre Viva 123',
        ]);
        $resPaciente->assertStatus(201);
        $pacienteId = $resPaciente->json('paciente.id_persona');
        $this->assertStringStartsWith('PAC-', $resPaciente->json('paciente.codigo'));

        // CU13: Registrar Información Médica Básica
        $resInfoMed = $this->postJson("/api/pacientes/{$pacienteId}/informacion-medica", [
            'tipo_sangre' => 'O+',
            'alergias' => 'Penicilina',
            'enfermedades_cronicas' => 'Hipertensión',
            'medicamentos_habituales' => 'Enalapril 10mg',
            'antecedentes_relevantes' => 'Cirugía apéndice 2018',
        ]);
        $resInfoMed->assertStatus(200);

        // CU14: Registrar Contacto de Emergencia
        $resContacto = $this->postJson("/api/pacientes/{$pacienteId}/contactos-emergencia", [
            'nombre_completo' => 'Rosa Flores',
            'parentesco' => 'Madre',
            'telefono' => '72233445',
        ]);
        $resContacto->assertStatus(201);

        // CU15: Buscar Paciente
        $resBuscar = $this->getJson('/api/pacientes?buscar=Mamani');
        $resBuscar->assertStatus(200);

        // CU16: Consultar Historial de Citas (Sin citas previas)
        $resHistorial = $this->getJson("/api/pacientes/{$pacienteId}/historial-citas");
        $resHistorial->assertStatus(200);
        $resHistorial->assertJsonFragment(['message' => 'El paciente no registra citas previas en la clínica.']);

        // CU17: Inactivar Paciente (Baja Lógica)
        $resInactivar = $this->putJson("/api/pacientes/{$pacienteId}/inactivar");
        $resInactivar->assertStatus(200);
        $this->assertDatabaseHas('persona', ['id_persona' => $pacienteId, 'activo' => false]);
    }

    /**
     * MÓDULO 5: CU18 - Especialidades Médicas
     */
    public function test_cu18_especialidades(): void
    {
        $admin = Usuario::where('nombre_usuario', 'admin')->first();
        $this->actingAs($admin);

        Especialidad::where('nombre', 'Dermatología')->delete();

        // Crear especialidad
        $resCrear = $this->postJson('/api/especialidades', [
            'nombre' => 'Dermatología',
            'descripcion' => 'Cuidado de la piel',
        ]);
        $resCrear->assertStatus(201);

        // CU18 / A1: Nombre duplicado
        $resDuplicado = $this->postJson('/api/especialidades', [
            'nombre' => 'Dermatología',
            'descripcion' => 'Intento duplicado',
        ]);
        $resDuplicado->assertStatus(422);
    }

    /**
     * MÓDULO 5: CU19, CU20, CU21 - Médicos y Horarios
     */
    public function test_cu19_cu20_cu21_medicos(): void
    {
        $admin = Usuario::where('nombre_usuario', 'admin')->first();
        $this->actingAs($admin);

        $esp = Especialidad::first();

        // CU19: Registrar Médico
        $resMedico = $this->postJson('/api/medicos', [
            'ci' => '55443322',
            'nombres' => 'Laura',
            'apellidos' => 'Mendoza Vargas',
            'matricula' => 'MP-77889',
            'telefono' => '76543210',
            'email' => 'dra.mendoza@vidasalud.com',
            'especialidades' => [$esp->id_especialidad],
        ]);
        $resMedico->assertStatus(201);
        $medicoId = $resMedico->json('medico.id_persona');

        // CU20: Configurar Horarios (1 = Lunes) y Bloques de 30 min
        $resHorario = $this->postJson("/api/medicos/{$medicoId}/horarios", [
            'dia_semana' => 1,
            'hora_inicio' => '08:00',
            'hora_fin' => '12:00',
            'duracion_bloque_min' => 30,
        ]);
        $resHorario->assertStatus(200);
        $this->assertEquals(8, $resHorario->json('total_bloques'));

        // CU20 / A1: Rango Horario Inválido
        $resRangoInvalido = $this->postJson("/api/medicos/{$medicoId}/horarios", [
            'dia_semana' => 2,
            'hora_inicio' => '14:00',
            'hora_fin' => '10:00',
        ]);
        $resRangoInvalido->assertStatus(422);

        // CU21: Inactivar Médico
        $resInactivar = $this->putJson("/api/medicos/{$medicoId}/inactivar");
        $resInactivar->assertStatus(200);
        $this->assertDatabaseHas('persona', ['id_persona' => $medicoId, 'activo' => false]);
    }

    /**
     * MÓDULO 5: CU22 - Bloqueo de Agenda por Feriado o Licencia
     */
    public function test_cu22_bloqueo_agenda(): void
    {
        $admin = Usuario::where('nombre_usuario', 'admin')->first();
        $this->actingAs($admin);

        $resBloqueo = $this->postJson('/api/bloqueos-agenda', [
            'tipo' => 'FERIADO',
            'fecha_inicio' => '2026-12-25',
            'fecha_fin' => '2026-12-25',
            'motivo' => 'Feriado de Navidad',
            'aplica_a_todos' => true,
        ]);
        $resBloqueo->assertStatus(201);
        $this->assertDatabaseHas('bloqueo_agenda', [
            'tipo' => 'FERIADO',
            'motivo' => 'Feriado de Navidad',
        ]);
    }

    /**
     * PAQUETE P7: Reportes Administrativos
     */
    public function test_p7_reportes_administrativos(): void
    {
        $admin = Usuario::where('nombre_usuario', 'admin')->first();
        $this->actingAs($admin);

        $resReporte = $this->postJson('/api/reportes', [
            'tipo' => 'CITAS_PERIODO',
            'fecha_desde' => '2026-01-01',
            'fecha_hasta' => '2026-12-31',
            'formato' => 'PDF',
        ]);
        $resReporte->assertStatus(201);
        $this->assertDatabaseHas('reporte', [
            'tipo' => 'CITAS_PERIODO',
            'formato' => 'PDF',
        ]);
    }

    /**
     * INTEGRACIÓN FRONTEND & BACKEND: Token Bearer y Assets Estáticos de Stitch
     */
    public function test_frontend_stitch_integration_and_bearer_token_authentication(): void
    {
        // 1. Iniciar sesión usando las claves del frontend (usuario y clave)
        $loginRes = $this->postJson('/api/auth/login', [
            'usuario' => 'admin',
            'clave' => 'Admin123*',
        ]);
        $loginRes->assertOk();
        $loginRes->assertJsonStructure([
            'success',
            'token',
            'redireccion',
            'usuario',
        ]);

        $token = $loginRes->json('token');
        $this->assertNotEmpty($token);

        // 2. Acceder a un endpoint protegido usando Bearer token
        $usuariosRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/usuarios');
        $usuariosRes->assertOk();

        // 3. Verificar que las rutas de assets de Frontend se sirven correctamente
        $htmlRes = $this->get('/Frontend/nueva_interfaces/index.html');
        $htmlRes->assertOk();
        $this->assertStringContainsString('text/html', $htmlRes->headers->get('Content-Type'));

        $jsRes = $this->get('/Frontend/nueva_interfaces/js/api.js');
        $jsRes->assertOk();
        $this->assertStringContainsString('application/javascript', $jsRes->headers->get('Content-Type'));

        // 4. Revocar token vía logout
        $logoutRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout');
        $logoutRes->assertOk();
    }

    /**
     * NUEVOS CASOS DE USO Y CLASES SEPARADAS (CU37 - CU43) Y VISTAS STITCH
     */
    public function test_cu37_a_cu43_nuevos_casos_de_uso_y_clases_separadas(): void
    {
        $admin = Usuario::where('nombre_usuario', 'admin')->first();
        $this->actingAs($admin);

        // CU37: Auto-registro web de paciente y monitoreo de sesiones y tokens
        $resAuto = $this->postJson('/api/auth/autoregistro-paciente', [
            'ci' => '66778899',
            'nombres' => 'Valeria',
            'apellidos' => 'Justiniano Roca',
            'fecha_nacimiento' => '1997-08-20',
            'sexo' => 'F',
            'telefono' => '75544332',
            'email' => 'valeria.justiniano@correo.bo',
            'direccion' => 'Av. Beni 3er Anillo',
            'nombre_usuario' => 'vjustiniano',
            'password' => 'Paciente123*',
        ]);
        $resAuto->assertStatus(201);
        $this->assertDatabaseHas('usuario', ['nombre_usuario' => 'vjustiniano']);

        $this->getJson('/api/sesiones')->assertOk();
        $this->getJson('/api/tokens-recuperacion')->assertOk();

        // CU38: Personal administrativo y matriz RBAC
        $this->getJson('/api/personas')->assertOk();
        $this->getJson('/api/personal-administrativo')->assertOk();
        $this->getJson('/api/roles/1/permisos')->assertOk();

        // CU39: Asignación múltiple médico-especialidad
        $medico = Medico::first();
        $esp = Especialidad::first();
        $this->getJson("/api/medicos/{$medico->id_persona}/especialidades")->assertOk();
        $this->putJson("/api/medicos/{$medico->id_persona}/especialidades", [
            'especialidades' => [$esp->id_especialidad],
        ])->assertOk();

        // CU43: Catálogo de reportes en BD
        $this->getJson('/api/reportes')->assertOk();
    }

    /**
     * MÓDULO 8: CU41 y CU42 - Pagos, Comprobantes Digitales, Stripe y Reembolsos.
     */
    public function test_cu41_cu42_pagos_comprobantes_reembolsos_y_stripe(): void
    {
        $admin = Usuario::where('id_rol', 1)->first();
        $this->actingAs($admin);

        $medico = Medico::first();
        $paciente = Paciente::first();
        $especialidad = Especialidad::first();

        $resCita = $this->postJson('/api/citas', [
            'id_paciente' => $paciente->id_persona,
            'id_medico' => $medico->id_persona,
            'id_especialidad' => $especialidad->id_especialidad,
            'fecha' => '2026-11-20',
            'hora_inicio' => '10:00',
            'motivo_consulta' => 'Consulta para pago y comprobante',
        ]);
        $cita = Cita::findOrFail($resCita->json('cita.id_cita'));

        // 1. Endpoint Stripe Session
        $resStripe = $this->postJson('/api/pagos/stripe/crear-sesion', [
            'id_cita' => $cita->id_cita,
            'monto' => 150.00,
        ]);
        $resStripe->assertOk();
        $this->assertNotEmpty($resStripe->json('payment_intent_id'));

        // 2. Registrar Pago (CU41)
        $resPago = $this->postJson('/api/pagos', [
            'id_cita' => $cita->id_cita,
            'monto' => 150.00,
            'metodo' => 'STRIPE',
            'nit_ci' => '12181643',
            'referencia_externa' => $resStripe->json('payment_intent_id'),
        ]);
        $resPago->assertStatus(201);
        $idPago = $resPago->json('data.id_pago');

        $this->assertDatabaseHas('pago', [
            'id_pago' => $idPago,
            'estado' => 'APROBADO',
        ]);
        $this->assertDatabaseHas('comprobante_pago', [
            'id_pago' => $idPago,
        ]);

        // La cita debe quedar en CONFIRMADA
        $this->assertEquals('CONFIRMADA', $cita->fresh()->estado);

        // 3. Listar Historial de Pagos (CU42)
        $resList = $this->getJson('/api/pagos');
        $resList->assertOk();
        $this->assertGreaterThan(0, count($resList->json('data.data')));

        // 4. Procesar Reembolso y Cancelación (CU42)
        $resReemb = $this->postJson("/api/pagos/{$idPago}/reembolso", [
            'motivo' => 'Paciente solicitó cancelación con 24h de anticipación',
        ]);
        $resReemb->assertOk();

        $this->assertDatabaseHas('pago', [
            'id_pago' => $idPago,
            'estado' => 'REEMBOLSADO',
        ]);
        $this->assertDatabaseHas('reembolso', [
            'id_pago' => $idPago,
            'estado' => 'PROCESADO',
        ]);

        // La cita debe pasar a CANCELADA liberando el bloque horario
        $this->assertEquals('CANCELADA', $cita->fresh()->estado);
    }

    /**
     * MÓDULO 6: CU22 - Disponibilidad de 15 Minutos y Restricción Anti-duplicados de Bitácora.
     */
    public function test_cu22_disponibilidad_15_minutos_y_antiduplicados_bitacora(): void
    {
        $admin = Usuario::where('id_rol', 1)->first();
        $this->actingAs($admin);

        $medico = Medico::first();

        // 1. Disponibilidad con bloques de 15 minutos en un día de atención del médico
        $horarioMedico = Horario::where('id_medico', $medico->id_persona)->where('activo', true)->first();
        $diaSem = $horarioMedico ? $horarioMedico->dia_semana : 1;
        $fechaTest = Carbon::now()->addDays(3)->next($diaSem)->toDateString();

        $resDisp = $this->getJson("/api/citas/disponibilidad?id_medico={$medico->id_persona}&fecha={$fechaTest}");
        $resDisp->assertOk();
        $this->assertEquals(15, $resDisp->json('duracion_bloque_min'));

        $slots = $resDisp->json('slots');
        $this->assertNotEmpty($slots);
        $this->assertEquals('08:00', $slots[0]['hora_inicio']);
        $this->assertEquals('08:15', $slots[0]['hora_fin']);

        // 2. Restricción Anti-duplicados de Bitácora
        $countAntes = Bitacora::count();

        // Primer registro
        AuditoriaService::registrar(
            'P6_CITAS',
            'MODIFICAR',
            'cita',
            9999,
            'Prueba de deduplicación exacta para evitar entradas dobles'
        );
        $this->assertEquals($countAntes + 1, Bitacora::count());

        // Segundo registro IDÉNTICO en el mismo segundo/ventana: NO debe insertarse
        AuditoriaService::registrar(
            'P6_CITAS',
            'MODIFICAR',
            'cita',
            9999,
            'Prueba de deduplicación exacta para evitar entradas dobles'
        );
        $this->assertEquals($countAntes + 1, Bitacora::count());

        // Registro con un campo DIFERENTE (detalle distinto): SÍ debe insertarse
        AuditoriaService::registrar(
            'P6_CITAS',
            'MODIFICAR',
            'cita',
            9999,
            'Detalle diferente para comprobar que la restricción no se levanta si cambia un campo'
        );
        $this->assertEquals($countAntes + 2, Bitacora::count());
    }
}
