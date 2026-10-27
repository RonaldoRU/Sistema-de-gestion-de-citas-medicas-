<?php

namespace Database\Seeders;

use App\Models\Especialidad;
use App\Models\Horario;
use App\Models\Medico;
use App\Models\Permiso;
use App\Models\Persona;
use App\Models\PersonalAdministrativo;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // =========================================================================
        // 1. ROLES (RBAC)
        // =========================================================================
        $roles = [
            ['id_rol' => 1, 'nombre' => 'ADMINISTRADOR', 'descripcion' => 'Acceso total al sistema y configuración global'],
            ['id_rol' => 2, 'nombre' => 'RECEPCIONISTA', 'descripcion' => 'Gestión de pacientes, agenda y confirmación de citas'],
            ['id_rol' => 3, 'nombre' => 'MEDICO', 'descripcion' => 'Consulta de agenda, citas asignadas y registro de atención'],
        ];

        foreach ($roles as $r) {
            Rol::updateOrCreate(['id_rol' => $r['id_rol']], [
                'nombre' => $r['nombre'],
                'descripcion' => $r['descripcion'],
            ]);
        }

        // =========================================================================
        // 2. PERMISOS POR MÓDULOS (P1 A P7)
        // =========================================================================
        $permisos = [
            ['nombre' => 'ACCESO_SISTEMA', 'modulo' => 'P1_SEGURIDAD', 'ruta_menu' => '/dashboard'],
            ['nombre' => 'GESTION_USUARIOS', 'modulo' => 'P2_RBAC', 'ruta_menu' => '/admin/usuarios'],
            ['nombre' => 'GESTION_ROLES', 'modulo' => 'P2_RBAC', 'ruta_menu' => '/admin/roles'],
            ['nombre' => 'CONSULTAR_BITACORA', 'modulo' => 'P3_AUDITORIA', 'ruta_menu' => '/admin/bitacora'],
            ['nombre' => 'GESTION_PACIENTES', 'modulo' => 'P4_PACIENTES', 'ruta_menu' => '/pacientes'],
            ['nombre' => 'GESTION_MEDICOS', 'modulo' => 'P5_MEDICOS', 'ruta_menu' => '/medicos'],
            ['nombre' => 'GESTION_HORARIOS', 'modulo' => 'P5_HORARIOS', 'ruta_menu' => '/medicos/horarios'],
            ['nombre' => 'BLOQUEO_AGENDA', 'modulo' => 'P5_AGENDA', 'ruta_menu' => '/agenda/bloqueos'],
            ['nombre' => 'GESTION_CITAS', 'modulo' => 'P6_CITAS', 'ruta_menu' => '/citas'],
            ['nombre' => 'ATENCION_MEDICA', 'modulo' => 'P6_CITAS', 'ruta_menu' => '/citas/atencion'],
            ['nombre' => 'NOTIFICACIONES_CITAS', 'modulo' => 'P6_NOTIFICACIONES', 'ruta_menu' => '/citas/recordatorios'],
            ['nombre' => 'REPORTES_ADMINISTRATIVOS', 'modulo' => 'P7_REPORTES', 'ruta_menu' => '/reportes'],
        ];

        foreach ($permisos as $p) {
            Permiso::updateOrCreate(['nombre' => $p['nombre']], [
                'modulo' => $p['modulo'],
                'ruta_menu' => $p['ruta_menu'],
            ]);
        }

        // Asignar todos los permisos al Administrador
        $rolAdmin = Rol::find(1);
        $todosPermisos = Permiso::all()->pluck('id_permiso');
        $rolAdmin->permisos()->sync($todosPermisos);

        // Permisos para Recepcionista
        $rolRecep = Rol::find(2);
        $permisosRecep = Permiso::whereIn('nombre', [
            'ACCESO_SISTEMA', 'GESTION_PACIENTES', 'GESTION_CITAS', 'NOTIFICACIONES_CITAS'
        ])->pluck('id_permiso');
        $rolRecep->permisos()->sync($permisosRecep);

        // Permisos para Médico
        $rolMed = Rol::find(3);
        $permisosMed = Permiso::whereIn('nombre', [
            'ACCESO_SISTEMA', 'GESTION_PACIENTES', 'GESTION_CITAS', 'ATENCION_MEDICA'
        ])->pluck('id_permiso');
        $rolMed->permisos()->sync($permisosMed);

        // =========================================================================
        // 3. ESPECIALIDADES MÉDICAS
        // =========================================================================
        $especialidades = [
            ['id_especialidad' => 1, 'nombre' => 'Medicina General', 'descripcion' => 'Atención primaria y diagnóstico integral', 'activo' => true],
            ['id_especialidad' => 2, 'nombre' => 'Pediatría', 'descripcion' => 'Atención médica integral infantil y adolescente', 'activo' => true],
            ['id_especialidad' => 3, 'nombre' => 'Ginecología', 'descripcion' => 'Salud femenina, reproductiva y prenatal', 'activo' => true],
            ['id_especialidad' => 4, 'nombre' => 'Odontología', 'descripcion' => 'Salud bucal y tratamientos odontológicos', 'activo' => true],
            ['id_especialidad' => 5, 'nombre' => 'Cardiología', 'descripcion' => 'Diagnóstico y tratamiento cardiovascular', 'activo' => true],
        ];

        foreach ($especialidades as $esp) {
            Especialidad::updateOrCreate(['id_especialidad' => $esp['id_especialidad']], [
                'nombre' => $esp['nombre'],
                'descripcion' => $esp['descripcion'],
                'activo' => $esp['activo'],
            ]);
        }

        // =========================================================================
        // 4. ACTORES HUMANOS (Persona, PersonalAdministrativo, Medico, Usuario)
        // =========================================================================

        // --- A. ADMINISTRADOR GENERAL ---
        $pAdmin = Persona::updateOrCreate(['ci' => '1000001'], [
            'nombres' => 'Carlos Alberto',
            'apellidos' => 'Administrador General',
            'telefono' => '71234567',
            'email' => 'admin@vidasalud.com',
            'activo' => true,
        ]);

        PersonalAdministrativo::updateOrCreate(['id_persona' => $pAdmin->id_persona], [
            'cargo' => 'Administrador de Sistemas',
        ]);

        Usuario::updateOrCreate(['id_persona' => $pAdmin->id_persona], [
            'id_rol' => 1,
            'nombre_usuario' => 'admin',
            'hash_contrasena' => Hash::make('Admin123*'),
            'estado' => 'ACTIVO',
            'intentos_fallidos' => 0,
        ]);

        // --- B. RECEPCIONISTA ---
        $pRecep = Persona::updateOrCreate(['ci' => '2000002'], [
            'nombres' => 'Ana María',
            'apellidos' => 'Recepcionista Central',
            'telefono' => '72345678',
            'email' => 'recepcion@vidasalud.com',
            'activo' => true,
        ]);

        PersonalAdministrativo::updateOrCreate(['id_persona' => $pRecep->id_persona], [
            'cargo' => 'Recepcionista Turno Mañana',
        ]);

        Usuario::updateOrCreate(['id_persona' => $pRecep->id_persona], [
            'id_rol' => 2,
            'nombre_usuario' => 'recepcion',
            'hash_contrasena' => Hash::make('Recepcion123*'),
            'estado' => 'ACTIVO',
            'intentos_fallidos' => 0,
        ]);

        // --- C. MÉDICO TRATANTE ---
        $pMed = Persona::updateOrCreate(['ci' => '3000003'], [
            'nombres' => 'Carlos',
            'apellidos' => 'Pérez Gómez',
            'telefono' => '73456789',
            'email' => 'dr.perez@vidasalud.com',
            'activo' => true,
        ]);

        $medico = Medico::updateOrCreate(['id_persona' => $pMed->id_persona], [
            'codigo' => 'MED-001',
            'matricula' => 'MP-89452',
        ]);

        $medico->especialidades()->syncWithoutDetaching([1]); // Medicina General

        Usuario::updateOrCreate(['id_persona' => $pMed->id_persona], [
            'id_rol' => 3,
            'nombre_usuario' => 'dr.perez',
            'hash_contrasena' => Hash::make('Medico123*'),
            'estado' => 'ACTIVO',
            'intentos_fallidos' => 0,
        ]);

        // Horario por defecto para el Dr. Pérez (Lunes de 08:00 a 12:00)
        Horario::updateOrCreate([
            'id_medico' => $medico->id_persona,
            'dia_semana' => 1, // Lunes
        ], [
            'hora_inicio' => '08:00',
            'hora_fin' => '12:00',
            'duracion_bloque_min' => 30,
            'activo' => true,
        ]);

        // Sincronizar secuencias de PostgreSQL para tablas con IDs explícitos
        if (DB::getDriverName() === 'pgsql') {
            $tables = [
                'rol' => 'id_rol',
                'permiso' => 'id_permiso',
                'especialidad' => 'id_especialidad',
                'persona' => 'id_persona',
                'usuario' => 'id_usuario',
                'horario' => 'id_horario',
            ];
            foreach ($tables as $tabla => $pk) {
                try {
                    DB::statement("SELECT setval(pg_get_serial_sequence('{$tabla}', '{$pk}'), COALESCE((SELECT MAX({$pk}) FROM {$tabla}), 1))");
                } catch (\Throwable $e) {
                    // Ignorar si la tabla o secuencia no existe
                }
            }
        }
    }
}
