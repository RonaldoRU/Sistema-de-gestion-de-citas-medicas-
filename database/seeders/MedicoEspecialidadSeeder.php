<?php

namespace Database\Seeders;

use App\Models\Medico;
use App\Models\Persona;
use Illuminate\Database\Seeder;

class MedicoEspecialidadSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $asignaciones = [
            ['ci' => '10039156', 'id_especialidad' => 1],
            ['ci' => '8325677', 'id_especialidad' => 2],
            ['ci' => '12247339', 'id_especialidad' => 3],
            ['ci' => '6297813', 'id_especialidad' => 4],
            ['ci' => '11939857', 'id_especialidad' => 5],
            ['ci' => '6523383', 'id_especialidad' => 1],
            ['ci' => '5071992', 'id_especialidad' => 2],
            ['ci' => '9873195', 'id_especialidad' => 3],
            ['ci' => '10954052', 'id_especialidad' => 4],
            ['ci' => '9856412', 'id_especialidad' => 5],
            ['ci' => '3000003', 'id_especialidad' => 1],
        ];

        foreach ($asignaciones as $item) {
            $persona = Persona::where('ci', $item['ci'])->first();
            if ($persona) {
                $medico = Medico::find($persona->id_persona);
                if ($medico) {
                    $medico->especialidades()->syncWithoutDetaching([$item['id_especialidad']]);
                }
            }
        }
    }
}
