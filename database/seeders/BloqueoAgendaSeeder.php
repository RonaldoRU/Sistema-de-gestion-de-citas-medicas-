<?php

namespace Database\Seeders;

use App\Models\BloqueoAgenda;
use Illuminate\Database\Seeder;

class BloqueoAgendaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $bloqueos = [
            [
                'id_medico' => null,
                'fecha_inicio' => '2026-09-24',
                'fecha_fin' => '2026-09-24',
                'motivo' => 'Aniversario de Santa Cruz',
                'tipo' => 'FERIADO',
                'aplica_a_todos' => true,
            ],
            [
                'id_medico' => null,
                'fecha_inicio' => '2026-11-02',
                'fecha_fin' => '2026-11-02',
                'motivo' => 'Día de Todos los Difuntos',
                'tipo' => 'FERIADO',
                'aplica_a_todos' => true,
            ],
        ];

        foreach ($bloqueos as $bloqueo) {
            BloqueoAgenda::updateOrCreate([
                'fecha_inicio' => $bloqueo['fecha_inicio'],
                'motivo' => $bloqueo['motivo'],
            ], $bloqueo);
        }
    }
}
