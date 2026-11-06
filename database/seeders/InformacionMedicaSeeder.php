<?php

namespace Database\Seeders;

use App\Models\InformacionMedica;
use App\Models\Paciente;
use App\Models\Persona;
use Illuminate\Database\Seeder;

class InformacionMedicaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $fichas = [
            [
                'ci' => '12181643',
                'tipo_sangre' => 'O+',
                'alergias' => 'Ninguna conocida',
                'enfermedades_cronicas' => 'Ninguna',
                'medicamentos_habituales' => 'Ninguno',
                'antecedentes_relevantes' => 'Controles anuales preventivos',
                'observaciones' => 'Paciente en buen estado general',
            ],
            [
                'ci' => '10223343',
                'tipo_sangre' => 'A+',
                'alergias' => 'Ibuprofeno',
                'enfermedades_cronicas' => 'Asma leve',
                'medicamentos_habituales' => 'Salbutamol inhalador SOS',
                'antecedentes_relevantes' => 'Asma diagnosticada en la infancia',
                'observaciones' => 'Evitar AINEs',
            ],
        ];

        foreach ($fichas as $item) {
            $persona = Persona::where('ci', $item['ci'])->first();
            if ($persona) {
                $paciente = Paciente::find($persona->id_persona);
                if ($paciente) {
                    InformacionMedica::updateOrCreate(['id_paciente' => $paciente->id_persona], [
                        'tipo_sangre' => $item['tipo_sangre'],
                        'alergias' => $item['alergias'],
                        'enfermedades_cronicas' => $item['enfermedades_cronicas'],
                        'medicamentos_habituales' => $item['medicamentos_habituales'],
                        'antecedentes_relevantes' => $item['antecedentes_relevantes'],
                        'observaciones' => $item['observaciones'],
                        'fecha_actualizacion' => now(),
                    ]);
                }
            }
        }
    }
}
