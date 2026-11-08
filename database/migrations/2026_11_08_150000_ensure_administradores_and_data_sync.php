<?php

use App\Models\Persona;
use App\Models\Usuario;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 0. Asegurar rol Administrador si las migraciones corren antes de seeders
        if (DB::table('rol')->where('id_rol', 1)->doesntExist()) {
            DB::table('rol')->insertOrIgnore([
                'id_rol' => 1,
                'nombre' => 'Administrador',
                'descripcion' => 'Gestión integral: usuarios, roles, catálogos, bitácora y reportes',
            ]);
        }

        // 1. Asegurar Persona y Usuario Administrador: Ronald Rivero Fernandez (rrivero)
        $pRivero = Persona::firstOrCreate(
            ['ci' => '14567212'],
            [
                'nombres' => 'Ronald',
                'apellidos' => 'Rivero Fernandez',
                'telefono' => '73127317',
                'email' => 'ronaldorojasugarte@gmail.com',
                'activo' => true,
            ]
        );

        Usuario::updateOrCreate(
            ['nombre_usuario' => 'rrivero'],
            [
                'id_persona' => $pRivero->id_persona,
                'id_rol' => 1,
                'hash_contrasena' => '$2y$12$bnt5486pMNHrSaJ3f/usP.Gw7WoZ10MbDO.tuv66wQSvLPNmLG/lC',
                'estado' => 'ACTIVO',
                'intentos_fallidos' => 0,
                'bloqueado_hasta' => null,
            ]
        );

        // 2. Asegurar Persona y Usuario Administrador: Silvia Irene Colque López (scolque)
        $pColque = Persona::firstOrCreate(
            ['ci' => '11757436'],
            [
                'nombres' => 'Silvia Irene',
                'apellidos' => 'Colque López',
                'telefono' => '76945876',
                'email' => 'scolque@vidasalud.com.bo',
                'activo' => true,
            ]
        );

        Usuario::updateOrCreate(
            ['nombre_usuario' => 'scolque'],
            [
                'id_persona' => $pColque->id_persona,
                'id_rol' => 1,
                'hash_contrasena' => Hash::make('Admin123*'),
                'estado' => 'ACTIVO',
                'intentos_fallidos' => 0,
                'bloqueado_hasta' => null,
            ]
        );

        // 3. Sincronizar secuencias de PostgreSQL si aplica
        if (DB::getDriverName() === 'pgsql') {
            $tablas = [
                'persona' => 'id_persona',
                'usuario' => 'id_usuario',
                'paciente' => 'id_persona',
                'medico' => 'id_persona',
                'cita' => 'id_cita',
                'pago' => 'id_pago',
                'bitacora' => 'id_bitacora',
            ];

            foreach ($tablas as $tabla => $columna) {
                try {
                    $seq = DB::selectOne("SELECT pg_get_serial_sequence('{$tabla}', '{$columna}') as seq");
                    if ($seq && $seq->seq) {
                        DB::statement("SELECT setval('{$seq->seq}', COALESCE((SELECT MAX({$columna}) FROM {$tabla}), 1))");
                    }
                } catch (Throwable $e) {
                    // Ignorar si la secuencia difiere en entorno de pruebas
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No destructivo
    }
};
