<?php

use App\Models\Cita;
use App\Models\ComprobantePago;
use App\Models\Especialidad;
use App\Models\Horario;
use App\Models\Medico;
use App\Models\Paciente;
use App\Models\Pago;
use App\Models\Persona;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    if (DB::getDriverName() === 'pgsql') {
        DB::statement("SELECT setval(pg_get_serial_sequence('rol', 'id_rol'), coalesce(max(id_rol), 1)) FROM rol;");
    }

    $rolAdmin = Rol::where('nombre', 'Administrador')->first() ?: Rol::create(['nombre' => 'Administrador']);
    $rolPaciente = Rol::where('nombre', 'Paciente')->first() ?: Rol::create(['nombre' => 'Paciente']);
    $rolMed = Rol::where('nombre', 'Médico')->first() ?: Rol::create(['nombre' => 'Médico']);

    // Especialidad
    $this->esp = Especialidad::firstOrCreate(['id_especialidad' => 1], ['nombre' => 'Medicina General', 'activo' => true]);

    // Médico
    $pMed = Persona::firstOrCreate(['ci' => '2000001'], [
        'nombres' => 'Doctor',
        'apellidos' => 'Especialista',
        'telefono' => '70000010',
        'email' => 'doc_test@test.com',
        'activo' => true,
    ]);
    $this->medico = Medico::firstOrCreate(['id_persona' => $pMed->id_persona], [
        'codigo' => 'MED-901',
        'matricula' => 'MAT-901',
    ]);
    $this->medico->especialidades()->syncWithoutDetaching([$this->esp->id_especialidad]);

    // Horarios médicos para todos los días
    for ($d = 1; $d <= 7; $d++) {
        Horario::firstOrCreate([
            'id_medico' => $this->medico->id_persona,
            'dia_semana' => $d,
        ], [
            'hora_inicio' => '07:00',
            'hora_fin' => '20:00',
            'duracion_bloque_min' => 15,
            'activo' => true,
        ]);
    }

    // Paciente 1 (Carlos)
    $pPac1 = Persona::firstOrCreate(['ci' => '2000002'], [
        'nombres' => 'Carlos',
        'apellidos' => 'Mendoza',
        'telefono' => '70000020',
        'email' => 'carlos_test@test.com',
        'activo' => true,
    ]);
    $this->paciente1 = Paciente::firstOrCreate(['id_persona' => $pPac1->id_persona], [
        'codigo' => 'PAC-901',
        'sexo' => 'M',
        'fecha_nacimiento' => '1990-01-01',
    ]);
    $this->userPaciente1 = Usuario::firstOrCreate(['nombre_usuario' => 'paciente1_user'], [
        'id_persona' => $pPac1->id_persona,
        'id_rol' => $rolPaciente->id_rol,
        'hash_contrasena' => Hash::make('Paciente123*'),
        'estado' => 'ACTIVO',
    ]);

    // Paciente 2 (María)
    $pPac2 = Persona::firstOrCreate(['ci' => '2000003'], [
        'nombres' => 'María',
        'apellidos' => 'Gutiérrez',
        'telefono' => '70000030',
        'email' => 'maria_test@test.com',
        'activo' => true,
    ]);
    $this->paciente2 = Paciente::firstOrCreate(['id_persona' => $pPac2->id_persona], [
        'codigo' => 'PAC-902',
        'sexo' => 'F',
        'fecha_nacimiento' => '1992-05-10',
    ]);
    $this->userPaciente2 = Usuario::firstOrCreate(['nombre_usuario' => 'paciente2_user'], [
        'id_persona' => $pPac2->id_persona,
        'id_rol' => $rolPaciente->id_rol,
        'hash_contrasena' => Hash::make('Paciente123*'),
        'estado' => 'ACTIVO',
    ]);
});

test('un paciente solo puede ver sus propias citas y nunca las de otros pacientes', function (): void {
    $lunes = now()->next(Carbon::MONDAY)->format('Y-m-d');

    // Cita para paciente 1
    $cita1 = Cita::create([
        'codigo' => 'CM-9001',
        'id_paciente' => $this->paciente1->id_persona,
        'id_medico' => $this->medico->id_persona,
        'id_especialidad' => $this->esp->id_especialidad,
        'id_usuario_registro' => $this->userPaciente1->id_usuario,
        'fecha' => $lunes,
        'hora_inicio' => '08:30',
        'hora_fin' => '09:00',
        'motivo_consulta' => 'Control de rutina paciente 1',
        'estado' => 'PROGRAMADA',
    ]);

    // Cita para paciente 2
    $cita2 = Cita::create([
        'codigo' => 'CM-9002',
        'id_paciente' => $this->paciente2->id_persona,
        'id_medico' => $this->medico->id_persona,
        'id_especialidad' => $this->esp->id_especialidad,
        'id_usuario_registro' => $this->userPaciente2->id_usuario,
        'fecha' => $lunes,
        'hora_inicio' => '09:30',
        'hora_fin' => '10:00',
        'motivo_consulta' => 'Control privado paciente 2',
        'estado' => 'PROGRAMADA',
    ]);

    // Autenticado como paciente 1
    $this->actingAs($this->userPaciente1);

    $response = $this->getJson('/api/citas');
    $response->assertStatus(200);

    $data = $response->json('data.data') ?: $response->json('data');
    $idsPacientes = array_column($data, 'id_paciente');

    expect($idsPacientes)->toContain($this->paciente1->id_persona)
        ->and($idsPacientes)->not->toContain($this->paciente2->id_persona);
});

test('un paciente puede agendar una ficha médica para sí mismo pero se ignora si intenta poner id_paciente de otro', function (): void {
    $this->actingAs($this->userPaciente1);

    $response = $this->postJson('/api/citas', [
        'id_paciente' => $this->paciente2->id_persona, // Intento de usurpar
        'id_medico' => $this->medico->id_persona,
        'id_especialidad' => $this->esp->id_especialidad,
        'fecha' => now()->addDays(3)->format('Y-m-d'),
        'hora_inicio' => '08:00',
        'motivo_consulta' => 'Reserva web de prueba',
    ]);

    $response->assertStatus(201);
    $cita = Cita::find($response->json('data.id_cita'));

    // Debe ser obligatoriamente paciente 1
    expect($cita->id_paciente)->toBe($this->paciente1->id_persona);
});

test('un paciente no puede consultar el historial de citas de otro paciente', function (): void {
    $this->actingAs($this->userPaciente1);

    $response = $this->getJson('/api/pacientes/'.$this->paciente2->id_persona.'/historial-citas');
    $response->assertStatus(403);
});

test('un paciente no puede cancelar la cita médica de otro paciente', function (): void {
    $cita2 = Cita::create([
        'codigo' => 'CM-9003',
        'id_paciente' => $this->paciente2->id_persona,
        'id_medico' => $this->medico->id_persona,
        'id_especialidad' => $this->esp->id_especialidad,
        'id_usuario_registro' => $this->userPaciente2->id_usuario,
        'fecha' => now()->addDays(4)->format('Y-m-d'),
        'hora_inicio' => '10:00',
        'hora_fin' => '10:30',
        'motivo_consulta' => 'Consulta de María',
        'estado' => 'PROGRAMADA',
    ]);

    $this->actingAs($this->userPaciente1);

    $response = $this->putJson('/api/citas/'.$cita2->id_cita.'/cancelar', [
        'motivo_cancelacion' => 'Intento no autorizado de cancelación',
    ]);

    $response->assertStatus(403);
});

test('un paciente solo puede ver y pagar sus propios pagos y comprobantes', function (): void {
    $cita1 = Cita::create([
        'codigo' => 'CM-9004',
        'id_paciente' => $this->paciente1->id_persona,
        'id_medico' => $this->medico->id_persona,
        'id_especialidad' => $this->esp->id_especialidad,
        'id_usuario_registro' => $this->userPaciente1->id_usuario,
        'fecha' => now()->addDays(1)->format('Y-m-d'),
        'hora_inicio' => '08:00',
        'hora_fin' => '08:30',
        'motivo_consulta' => 'Consulta a pagar',
        'estado' => 'PROGRAMADA',
    ]);

    $cita2 = Cita::create([
        'codigo' => 'CM-9005',
        'id_paciente' => $this->paciente2->id_persona,
        'id_medico' => $this->medico->id_persona,
        'id_especialidad' => $this->esp->id_especialidad,
        'id_usuario_registro' => $this->userPaciente2->id_usuario,
        'fecha' => now()->addDays(1)->format('Y-m-d'),
        'hora_inicio' => '09:00',
        'hora_fin' => '09:30',
        'motivo_consulta' => 'Consulta de María para pagar',
        'estado' => 'PROGRAMADA',
    ]);

    $this->actingAs($this->userPaciente1);

    // Intento de pagar la cita de María -> Debe ser 403
    $respErr = $this->postJson('/api/pagos', [
        'id_cita' => $cita2->id_cita,
        'monto' => 150.00,
        'metodo' => 'QR',
    ]);
    $respErr->assertStatus(403);

    // Pago de su propia cita -> Debe ser 201
    $respOk = $this->postJson('/api/pagos', [
        'id_cita' => $cita1->id_cita,
        'monto' => 150.00,
        'metodo' => 'QR',
    ]);
    $respOk->assertStatus(201);

    $idPago = $respOk->json('data.id_pago');

    // Listar pagos como paciente 1
    $respList = $this->getJson('/api/pagos');
    $respList->assertStatus(200);
    $pagos = $respList->json('data.data') ?: $respList->json('data');
    expect(count($pagos))->toBe(1);

    // Ahora crear un pago para la cita 2
    $pago2 = Pago::create([
        'id_cita' => $cita2->id_cita,
        'id_usuario_registro' => $this->userPaciente2->id_usuario,
        'monto' => 150.00,
        'moneda' => 'BOB',
        'metodo' => 'TARJETA',
        'estado' => 'APROBADO',
        'referencia_externa' => 'TX-MARIA-001',
        'fecha_hora' => now(),
    ]);
    ComprobantePago::create([
        'id_pago' => $pago2->id_pago,
        'numero' => 'COMP-2026-9999',
        'monto_total' => 150.00,
        'ruta_archivo' => 'comprobantes/COMP-2026-9999.pdf',
        'fecha_emision' => now(),
    ]);

    // Paciente 1 NO debe poder ver el comprobante de paciente 2 vía show
    $respShowErr = $this->getJson('/api/pagos/'.$pago2->id_pago);
    $respShowErr->assertStatus(403);

    // Paciente 1 SÍ puede ver su propio comprobante
    $respShowOk = $this->getJson('/api/pagos/'.$idPago);
    $respShowOk->assertStatus(200);
});
