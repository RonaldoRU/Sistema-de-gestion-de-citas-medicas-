<?php

use App\Models\Bitacora;
use App\Models\Especialidad;
use App\Models\Horario;
use App\Models\Medico;
use App\Models\Paciente;
use App\Models\Persona;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    if (DB::getDriverName() === 'pgsql') {
        DB::statement("SELECT setval(pg_get_serial_sequence('rol', 'id_rol'), coalesce(max(id_rol), 1)) FROM rol;");
    }

    // Roles existentes o nuevos
    $rolAdmin = Rol::where('nombre', 'Administrador')->first() ?: Rol::create(['nombre' => 'Administrador']);
    $rolRecep = Rol::where('nombre', 'Recepcionista')->first() ?: Rol::create(['nombre' => 'Recepcionista']);
    $rolMed = Rol::where('nombre', 'Médico')->first() ?: Rol::create(['nombre' => 'Médico']);

    // Especialidad
    $esp = Especialidad::firstOrCreate(['id_especialidad' => 1], ['nombre' => 'Medicina General', 'activo' => true]);

    // Admin
    $pAdmin = Persona::firstOrCreate(['ci' => '1000001'], [
        'nombres' => 'Carlos Alberto',
        'apellidos' => 'Admin',
        'telefono' => '70000001',
        'email' => 'admin_test@test.com',
        'activo' => true,
    ]);
    $this->adminUser = Usuario::firstOrCreate(['nombre_usuario' => 'admin_test_user'], [
        'id_persona' => $pAdmin->id_persona,
        'id_rol' => $rolAdmin->id_rol,
        'hash_contrasena' => Hash::make('Admin123*'),
        'estado' => 'ACTIVO',
    ]);

    // Médico 1
    $pMed1 = Persona::firstOrCreate(['ci' => '1000002'], [
        'nombres' => 'Juan Ronaldo',
        'apellidos' => 'Rojas',
        'telefono' => '70000002',
        'email' => 'med1_test@test.com',
        'activo' => true,
    ]);
    $this->medico1 = Medico::firstOrCreate(['id_persona' => $pMed1->id_persona], [
        'codigo' => 'MED-001',
        'matricula' => 'MAT-001',
    ]);
    $this->medico1->especialidades()->syncWithoutDetaching([$esp->id_especialidad]);
    $this->medicoUser1 = Usuario::firstOrCreate(['nombre_usuario' => 'med1_test_user'], [
        'id_persona' => $pMed1->id_persona,
        'id_rol' => $rolMed->id_rol,
        'hash_contrasena' => Hash::make('Medico123*'),
        'estado' => 'ACTIVO',
    ]);

    // Médico 2
    $pMed2 = Persona::firstOrCreate(['ci' => '1000003'], [
        'nombres' => 'Patricia',
        'apellidos' => 'Gutiérrez',
        'telefono' => '70000003',
        'email' => 'med2_test@test.com',
        'activo' => true,
    ]);
    $this->medico2 = Medico::firstOrCreate(['id_persona' => $pMed2->id_persona], [
        'codigo' => 'MED-002',
        'matricula' => 'MAT-002',
    ]);
    $this->medico2->especialidades()->syncWithoutDetaching([$esp->id_especialidad]);
    $this->medicoUser2 = Usuario::firstOrCreate(['nombre_usuario' => 'med2_test_user'], [
        'id_persona' => $pMed2->id_persona,
        'id_rol' => $rolMed->id_rol,
        'hash_contrasena' => Hash::make('Medico123*'),
        'estado' => 'ACTIVO',
    ]);
});

test('base de datos contiene al menos 60 pacientes con atributos rellenados', function (): void {
    $totalPacientes = Paciente::count();
    expect($totalPacientes)->toBeGreaterThanOrEqual(60);

    // Verificar que un paciente aleatorio tenga todos sus atributos
    $paciente = Paciente::with(['persona', 'informacionMedica', 'contactosEmergencia'])->first();
    expect($paciente)->not->toBeNull();
    expect($paciente->codigo)->not->toBeEmpty();
    expect($paciente->sexo)->toBeIn(['M', 'F']);
    expect($paciente->fecha_nacimiento)->not->toBeNull();
    expect($paciente->direccion)->not->toBeEmpty();

    expect($paciente->persona)->not->toBeNull();
    expect($paciente->persona->ci)->not->toBeEmpty();
    expect($paciente->persona->nombres)->not->toBeEmpty();
    expect($paciente->persona->apellidos)->not->toBeEmpty();
    expect($paciente->persona->telefono)->not->toBeEmpty();

    expect($paciente->informacionMedica)->not->toBeNull();
    expect($paciente->informacionMedica->tipo_sangre)->not->toBeEmpty();

    expect($paciente->contactosEmergencia->count())->toBeGreaterThanOrEqual(1);
    expect($paciente->contactosEmergencia->first()->nombre_completo)->not->toBeEmpty();
});

test('rol medico puede configurar manualmente su propio horario de atencion y bloques', function (): void {
    $this->actingAs($this->medicoUser1);

    $response = $this->postJson("/api/medicos/{$this->medico1->id_persona}/horarios", [
        'dias_semana' => [1, 2, 3], // Lunes, Martes, Miércoles
        'hora_inicio' => '08:00',
        'hora_fin' => '12:00',
        'duracion_bloque_min' => 30,
    ]);

    $response->assertStatus(200)
        ->assertJson(['success' => true]);

    expect(Horario::where('id_medico', $this->medico1->id_persona)->count())->toBe(3);

    // Verificar que se registró en bitácora
    $log = Bitacora::where('tabla_afectada', 'horario')
        ->where('tipo_accion', 'CREAR')
        ->first();
    expect($log)->not->toBeNull();
});

test('rol medico no puede configurar horarios de otro colega', function (): void {
    $this->actingAs($this->medicoUser1);

    // Intenta configurar el horario del médico 2
    $response = $this->postJson("/api/medicos/{$this->medico2->id_persona}/horarios", [
        'dia_semana' => 1,
        'hora_inicio' => '14:00',
        'hora_fin' => '18:00',
        'duracion_bloque_min' => 30,
    ]);

    $response->assertStatus(403);
});

test('administrador tiene permiso de configurar horarios para cualquier medico', function (): void {
    $this->actingAs($this->adminUser);

    $response = $this->postJson("/api/medicos/{$this->medico2->id_persona}/horarios", [
        'dia_semana' => 5, // Viernes
        'hora_inicio' => '14:00',
        'hora_fin' => '18:00',
        'duracion_bloque_min' => 30,
    ]);

    $response->assertStatus(200)
        ->assertJson(['success' => true]);

    expect(Horario::where('id_medico', $this->medico2->id_persona)->where('dia_semana', 5)->exists())->toBeTrue();
});

test('administrador puede desactivar (inactivar) y reactivar medico registrando en bitacora', function (): void {
    $this->actingAs($this->adminUser);

    // 1. Inactivar
    $respInactivar = $this->putJson("/api/medicos/{$this->medico1->id_persona}/inactivar", [
        'motivo' => 'Licencia académica',
    ]);

    $respInactivar->assertStatus(200)
        ->assertJson(['success' => true]);

    $this->medico1->refresh();
    expect($this->medico1->persona->activo)->toBeFalse();

    // Bitácora inactivar
    $logInact = Bitacora::where('tabla_afectada', 'medico')
        ->where('tipo_accion', 'INACTIVAR')
        ->where('id_registro_afectado', $this->medico1->id_persona)
        ->first();
    expect($logInact)->not->toBeNull();

    // 2. Reactivar
    $respReactivar = $this->putJson("/api/medicos/{$this->medico1->id_persona}/reactivar");

    $respReactivar->assertStatus(200)
        ->assertJson(['success' => true]);

    $this->medico1->refresh();
    expect($this->medico1->persona->activo)->toBeTrue();

    // Bitácora reactivar
    $logReact = Bitacora::where('tabla_afectada', 'medico')
        ->whereIn('tipo_accion', ['REACTIVAR', 'RENOVAR'])
        ->where('id_registro_afectado', $this->medico1->id_persona)
        ->first();
    expect($logReact)->not->toBeNull();
});
