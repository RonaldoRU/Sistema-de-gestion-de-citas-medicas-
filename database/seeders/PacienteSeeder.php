<?php

namespace Database\Seeders;

use App\Models\Paciente;
use App\Models\Persona;
use Illuminate\Database\Seeder;

class PacienteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $pacientes = [
            ['ci' => '12181643', 'codigo' => 'PAC-0001', 'sexo' => 'F', 'fecha_nacimiento' => '1992-04-12', 'direccion' => 'Av. Banzer 4to Anillo #120'],
            ['ci' => '10223343', 'codigo' => 'PAC-0002', 'sexo' => 'M', 'fecha_nacimiento' => '1988-09-23', 'direccion' => 'Calle Libertad #450'],
            ['ci' => '9432684', 'codigo' => 'PAC-0003', 'sexo' => 'M', 'fecha_nacimiento' => '1995-11-05', 'direccion' => 'Barrio Equipetrol Calle 3 #88'],
        ];

        foreach ($pacientes as $item) {
            $persona = Persona::where('ci', $item['ci'])->first();
            if ($persona) {
                Paciente::where('codigo', $item['codigo'])
                    ->where('id_persona', '!=', $persona->id_persona)
                    ->delete();

                Paciente::updateOrCreate(['id_persona' => $persona->id_persona], [
                    'codigo' => $item['codigo'],
                    'sexo' => $item['sexo'],
                    'fecha_nacimiento' => $item['fecha_nacimiento'],
                    'direccion' => $item['direccion'],
                ]);
            }
        }
    }
}
