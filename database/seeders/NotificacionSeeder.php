<?php

namespace Database\Seeders;

use App\Models\Cita;
use App\Models\Notificacion;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

class NotificacionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $cita = Cita::where('codigo', 'CM-0001')->first();
        $usuarioRecep = Usuario::where('nombre_usuario', 'rvaca')->first();

        if (! $cita || ! $usuarioRecep) {
            return;
        }

        Notificacion::updateOrCreate([
            'id_cita' => $cita->id_cita,
        ], [
            'id_usuario_gestion' => $usuarioRecep->id_usuario,
            'mensaje' => 'Recordatorio de cita médica CM-0001 programada para el 2026-10-19 a las 08:00.',
            'fecha_programada' => '2026-10-18 08:00:00',
            'fecha_envio' => '2026-10-18 08:05:00',
            'estado' => 'ENVIADA',
            'intentos' => 1,
        ]);
    }
}
