<?php

namespace Database\Seeders;

use App\Models\Especialidad;
use App\Models\Horario;
use App\Models\Medico;
use App\Models\Permiso;
use App\Models\Persona;
use App\Models\PersonalAdministrativo;
use App\Models\Rol;
use App\Models\Sesion;
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
        // 4. USUARIOS DEL SISTEMA (ADMINISTRADORES, RECEPCIONISTAS, MÉDICOS)
        // =========================================================================
        $hashPassword = Hash::make('Admin123*');

        // --- A. ADMINISTRADORES ---
        // 1. Silvia Irene Colque López (Administradora Principal)
        $pScolque = Persona::updateOrCreate(['ci' => '11757436'], [
            'nombres' => 'Silvia Irene',
            'apellidos' => 'Colque López',
            'telefono' => '76945876',
            'email' => 'scolque@vidasalud.com.bo',
            'activo' => true,
        ]);
        PersonalAdministrativo::updateOrCreate(['id_persona' => $pScolque->id_persona], [
            'cargo' => 'Administradora del sistema',
        ]);
        $uScolque = Usuario::updateOrCreate(['nombre_usuario' => 'scolque'], [
            'id_persona' => $pScolque->id_persona,
            'id_rol' => 1,
            'hash_contrasena' => $hashPassword,
            'estado' => 'ACTIVO',
            'intentos_fallidos' => 0,
            'ultimo_acceso' => now(),
            'fecha_creacion' => now(),
        ]);

        // 2. Administrador General (admin)
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
        Usuario::updateOrCreate(['nombre_usuario' => 'admin'], [
            'id_persona' => $pAdmin->id_persona,
            'id_rol' => 1,
            'hash_contrasena' => $hashPassword,
            'estado' => 'ACTIVO',
            'intentos_fallidos' => 0,
            'ultimo_acceso' => now(),
            'fecha_creacion' => now(),
        ]);

        // --- B. RECEPCIONISTAS ---
        $recepcionistas = [
            ['ci' => '8090601', 'nombres' => 'Rosa María', 'apellidos' => 'Vaca Cuéllar', 'telefono' => '75403694', 'email' => 'rvaca@vidasalud.com.bo', 'cargo' => 'Recepcionista turno mañana', 'usuario' => 'rvaca'],
            ['ci' => '5930783', 'nombres' => 'Carla Andrea', 'apellidos' => 'Suárez Roca', 'telefono' => '78793510', 'email' => 'csuarez@vidasalud.com.bo', 'cargo' => 'Recepcionista turno mañana', 'usuario' => 'csuarez'],
            ['ci' => '7668705', 'nombres' => 'Jorge Luis', 'apellidos' => 'Mendoza Paz', 'telefono' => '71128245', 'email' => 'jmendoza@vidasalud.com.bo', 'cargo' => 'Recepcionista turno tarde', 'usuario' => 'jmendoza'],
            ['ci' => '7175901', 'nombres' => 'Daniela', 'apellidos' => 'Justiniano Áñez', 'telefono' => '76954784', 'email' => 'djustiniano@vidasalud.com.bo', 'cargo' => 'Recepcionista turno tarde', 'usuario' => 'djustiniano'],
            ['ci' => '2000002', 'nombres' => 'Ana María', 'apellidos' => 'Recepcionista Central', 'telefono' => '72345678', 'email' => 'recepcion@vidasalud.com', 'cargo' => 'Recepcionista Central', 'usuario' => 'recepcion'],
        ];

        foreach ($recepcionistas as $rec) {
            $p = Persona::updateOrCreate(['ci' => $rec['ci']], [
                'nombres' => $rec['nombres'],
                'apellidos' => $rec['apellidos'],
                'telefono' => $rec['telefono'],
                'email' => $rec['email'],
                'activo' => true,
            ]);
            PersonalAdministrativo::updateOrCreate(['id_persona' => $p->id_persona], [
                'cargo' => $rec['cargo'],
            ]);
            Usuario::updateOrCreate(['nombre_usuario' => $rec['usuario']], [
                'id_persona' => $p->id_persona,
                'id_rol' => 2,
                'hash_contrasena' => $hashPassword,
                'estado' => 'ACTIVO',
                'intentos_fallidos' => 0,
                'ultimo_acceso' => now(),
                'fecha_creacion' => now(),
            ]);
        }

        // --- C. MÉDICOS ---
        $medicos = [
            ['ci' => '10039156', 'nombres' => 'Juan Ronaldo', 'apellidos' => 'Rojas Ugarte', 'tel' => '74625968', 'email' => 'jrojas@vidasalud.com.bo', 'cod' => 'MED-001', 'mat' => 'MP-10039', 'esp' => 1, 'usr' => 'jrojas', 'activo' => true, 'estado' => 'ACTIVO'],
            ['ci' => '8325677', 'nombres' => 'Patricia', 'apellidos' => 'Gutiérrez Melgar', 'tel' => '76244222', 'email' => 'pgutierrez@vidasalud.com.bo', 'cod' => 'MED-002', 'mat' => 'MP-83256', 'esp' => 2, 'usr' => 'pgutierrez', 'activo' => true, 'estado' => 'ACTIVO'],
            ['ci' => '12247339', 'nombres' => 'Fernando', 'apellidos' => 'Arteaga Ribera', 'tel' => '70246676', 'email' => 'farteaga@vidasalud.com.bo', 'cod' => 'MED-003', 'mat' => 'MP-12247', 'esp' => 3, 'usr' => 'farteaga', 'activo' => true, 'estado' => 'ACTIVO'],
            ['ci' => '6297813', 'nombres' => 'Claudia', 'apellidos' => 'Montero Saucedo', 'tel' => '72839842', 'email' => 'cmontero@vidasalud.com.bo', 'cod' => 'MED-004', 'mat' => 'MP-62978', 'esp' => 4, 'usr' => 'cmontero', 'activo' => true, 'estado' => 'ACTIVO'],
            ['ci' => '11939857', 'nombres' => 'Marcelo', 'apellidos' => 'Terceros Chávez', 'tel' => '78940741', 'email' => 'mterceros@vidasalud.com.bo', 'cod' => 'MED-005', 'mat' => 'MP-11939', 'esp' => 5, 'usr' => 'mterceros', 'activo' => true, 'estado' => 'ACTIVO'],
            ['ci' => '6523383', 'nombres' => 'Gabriela', 'apellidos' => 'Peña Salvatierra', 'tel' => '75666192', 'email' => 'gpena@vidasalud.com.bo', 'cod' => 'MED-006', 'mat' => 'MP-65233', 'esp' => 1, 'usr' => 'gpena', 'activo' => true, 'estado' => 'ACTIVO'],
            ['ci' => '5071992', 'nombres' => 'Álvaro', 'apellidos' => 'Moreno Durán', 'tel' => '71424219', 'email' => 'amoreno@vidasalud.com.bo', 'cod' => 'MED-007', 'mat' => 'MP-50719', 'esp' => 2, 'usr' => 'amoreno', 'activo' => true, 'estado' => 'ACTIVO'],
            ['ci' => '9873195', 'nombres' => 'Lorena', 'apellidos' => 'Antelo Barba', 'tel' => '71631930', 'email' => 'lantelo@vidasalud.com.bo', 'cod' => 'MED-008', 'mat' => 'MP-98731', 'esp' => 3, 'usr' => 'lantelo', 'activo' => true, 'estado' => 'ACTIVO'],
            ['ci' => '10954052', 'nombres' => 'Ricardo', 'apellidos' => 'Égüez Parada', 'tel' => '79248485', 'email' => 'reguez@vidasalud.com.bo', 'cod' => 'MED-009', 'mat' => 'MP-10954', 'esp' => 4, 'usr' => 'reguez', 'activo' => true, 'estado' => 'ACTIVO'],
            ['ci' => '9856412', 'nombres' => 'Hugo', 'apellidos' => 'Flores Mamani', 'tel' => '78452722', 'email' => 'hflores@vidasalud.com.bo', 'cod' => 'MED-010', 'mat' => 'MP-98564', 'esp' => 5, 'usr' => 'hflores', 'activo' => false, 'estado' => 'INACTIVO'],
            ['ci' => '3000003', 'nombres' => 'Carlos', 'apellidos' => 'Pérez Gómez', 'tel' => '73456789', 'email' => 'dr.perez@vidasalud.com', 'cod' => 'MED-099', 'mat' => 'MP-89452', 'esp' => 1, 'usr' => 'dr.perez', 'activo' => true, 'estado' => 'ACTIVO'],
        ];

        foreach ($medicos as $m) {
            $p = Persona::updateOrCreate(['ci' => $m['ci']], [
                'nombres' => $m['nombres'],
                'apellidos' => $m['apellidos'],
                'telefono' => $m['tel'],
                'email' => $m['email'],
                'activo' => $m['activo'],
            ]);

            // Asegurar que no haya colisión de código con registros legacy
            Medico::where('codigo', $m['cod'])->where('id_persona', '!=', $p->id_persona)->delete();

            $med = Medico::updateOrCreate(['id_persona' => $p->id_persona], [
                'codigo' => $m['cod'],
                'matricula' => $m['mat'],
            ]);

            $med->especialidades()->syncWithoutDetaching([$m['esp']]);

            Usuario::updateOrCreate(['nombre_usuario' => $m['usr']], [
                'id_persona' => $p->id_persona,
                'id_rol' => 3,
                'hash_contrasena' => $hashPassword,
                'estado' => $m['estado'],
                'intentos_fallidos' => 0,
                'ultimo_acceso' => now(),
                'fecha_creacion' => now(),
            ]);

            // Horario por defecto (Lunes y Miércoles 08:00 a 12:00)
            if ($m['activo']) {
                Horario::updateOrCreate([
                    'id_medico' => $med->id_persona,
                    'dia_semana' => 1,
                ], [
                    'hora_inicio' => '08:00',
                    'hora_fin' => '12:00',
                    'duracion_bloque_min' => 30,
                    'activo' => true,
                ]);
            }
        }

        // =========================================================================
        // 5. SESIÓN ACTIVA POR DEFECTO (Para evitar errores de validación en frontend)
        // =========================================================================
        $defaultToken = '27c4c9dc3d9e4bdfa36e04e02f65ace251cebbabbc6450e834f90898d10ed34f';
        Sesion::updateOrCreate([
            'id_sesion' => $defaultToken,
        ], [
            'id_usuario' => $uScolque->id_usuario,
            'fecha_inicio' => now(),
            'ultima_actividad' => now(),
            'activa' => true,
            'ip' => '127.0.0.1',
        ]);

        // Sincronizar secuencias de PostgreSQL si se está ejecutando sobre pgsql
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
