<?php

namespace Tests\Feature;

use App\Models\Bitacora;
use App\Models\BloqueoAgenda;
use App\Models\Cita;
use App\Models\Especialidad;
use App\Models\Horario;
use App\Models\Medico;
use App\Models\Notificacion;
use App\Models\Paciente;
use App\Models\Persona;
use App\Models\Reporte;
use App\Models\Rol;
use App\Models\TokenRecuperacion;
use App\Models\Usuario;
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

        \App\Models\Especialidad::where('nombre', 'Dermatología')->delete();

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
        $usuariosRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/usuarios');
        $usuariosRes->assertOk();

        // 3. Verificar que las rutas de assets de Frontend se sirven correctamente
        $htmlRes = $this->get('/frontend/stitch/html/inicio.html');
        $htmlRes->assertOk();
        $this->assertStringContainsString('text/html', $htmlRes->headers->get('Content-Type'));

        $jsRes = $this->get('/frontend/stitch/js/vida-salud-api.js');
        $jsRes->assertOk();
        $this->assertStringContainsString('application/javascript', $jsRes->headers->get('Content-Type'));

        $cssRes = $this->get('/frontend/stitch/css/vida-salud-theme.css');
        $cssRes->assertOk();
        $this->assertStringContainsString('text/css', $cssRes->headers->get('Content-Type'));

        // 4. Revocar token vía logout
        $logoutRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/logout');
        $logoutRes->assertOk();
    }
}
