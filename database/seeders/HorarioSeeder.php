<?php

namespace Database\Seeders;

use App\Models\Horario;
use App\Models\Medico;
use App\Models\Persona;
use Illuminate\Database\Seeder;

class HorarioSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $cisMedicosActivos = [
            '10039156',
            '8325677',
            '12247339',
            '6297813',
            '11939857',
            '6523383',
            '5071992',
            '9873195',
            '10954052',
            '3000003',
        ];

        foreach ($cisMedicosActivos as $ci) {
            $persona = Persona::where('ci', $ci)->first();
            if ($persona && $persona->activo) {
                $medico = Medico::find($persona->id_persona);
                if ($medico) {
                    Horario::updateOrCreate([
                        'id_medico' => $medico->id_persona,
                        'dia_semana' => 1,
                    ], [
                        'hora_inicio' => '08:00',
                        'hora_fin' => '12:00',
                        'duracion_bloque_min' => 30,
                        'activo' => true,
                    ]);
                }
            }
        }
    }
}
