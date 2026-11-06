<?php

namespace Database\Seeders;

use App\Models\Cita;
use App\Models\HistorialEstadoCita;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

class HistorialEstadoCitaSeeder extends Seeder
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

        HistorialEstadoCita::updateOrCreate([
            'id_cita' => $cita->id_cita,
            'estado_nuevo' => 'PROGRAMADA',
        ], [
            'id_usuario' => $usuarioRecep->id_usuario,
            'estado_anterior' => null,
            'motivo' => 'Registro inicial de cita médica',
            'fecha_cambio' => '2026-10-15 10:00:00',
        ]);
    }
}
