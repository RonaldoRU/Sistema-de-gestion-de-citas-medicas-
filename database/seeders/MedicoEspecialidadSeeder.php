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
            ['ci' => '13482910', 'id_especialidad' => 6], // Dermatología
            ['ci' => '14295831', 'id_especialidad' => 7], // Traumatología y Ortopedia
            // id_especialidad 8 (Cardiología Pediátrica) se deja estrictamente sin asignar (0 médicos)
            ['ci' => '15839204', 'id_especialidad' => 9], // Neurología
            ['ci' => '16928475', 'id_especialidad' => 10], // Oftalmología
            ['ci' => '17839201', 'id_especialidad' => 11], // Otorrinolaringología
            ['ci' => '18940291', 'id_especialidad' => 12], // Gastroenterología
            ['ci' => '19820394', 'id_especialidad' => 13], // Urología
            ['ci' => '20938412', 'id_especialidad' => 14], // Endocrinología
            ['ci' => '21948523', 'id_especialidad' => 15], // Neumología
            ['ci' => '22849534', 'id_especialidad' => 16], // Psiquiatría
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
