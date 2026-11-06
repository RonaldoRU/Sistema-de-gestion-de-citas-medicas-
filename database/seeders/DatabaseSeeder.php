<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolSeeder::class,
            PermisoSeeder::class,
            RolPermisoSeeder::class,
            EspecialidadSeeder::class,
            PersonaSeeder::class,
            PersonalAdministrativoSeeder::class,
            MedicoSeeder::class,
            MedicoEspecialidadSeeder::class,
            UsuarioSeeder::class,
            HorarioSeeder::class,
            SesionSeeder::class,
            TokenRecuperacionSeeder::class,
            BitacoraSeeder::class,
            PacienteSeeder::class,
            InformacionMedicaSeeder::class,
            ContactoEmergenciaSeeder::class,
            BloqueoAgendaSeeder::class,
            CitaSeeder::class,
            HistorialEstadoCitaSeeder::class,
            NotificacionSeeder::class,
            ReporteSeeder::class,
        ]);

        if (DB::getDriverName() === 'pgsql') {
            $tables = [
                'persona' => 'id_persona',
                'rol' => 'id_rol',
                'permiso' => 'id_permiso',
                'usuario' => 'id_usuario',
                'token_recuperacion' => 'id_token',
                'bitacora' => 'id_bitacora',
                'informacion_medica' => 'id_informacion',
                'contacto_emergencia' => 'id_contacto',
                'especialidad' => 'id_especialidad',
                'horario' => 'id_horario',
                'bloqueo_agenda' => 'id_bloqueo',
                'cita' => 'id_cita',
                'historial_estado_cita' => 'id_historial',
                'notificacion' => 'id_notificacion',
                'reporte' => 'id_reporte',
            ];

            foreach ($tables as $tabla => $pk) {
                try {
                    DB::statement("SELECT setval(pg_get_serial_sequence('{$tabla}', '{$pk}'), COALESCE((SELECT MAX({$pk}) FROM {$tabla}), 1))");
                } catch (\Throwable $e) {
                    // Ignore if table or sequence does not exist
                }
            }
        }
    }
}
