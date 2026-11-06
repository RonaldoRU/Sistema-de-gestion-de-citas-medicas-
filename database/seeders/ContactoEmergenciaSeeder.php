<?php

namespace Database\Seeders;

use App\Models\ContactoEmergencia;
use App\Models\Paciente;
use App\Models\Persona;
use Illuminate\Database\Seeder;

class ContactoEmergenciaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $contactos = [
            ['ci' => '12181643', 'nombre_completo' => 'Carlos Égüez', 'parentesco' => 'Padre', 'telefono' => '75001122'],
            ['ci' => '10223343', 'nombre_completo' => 'Lucía Mendoza', 'parentesco' => 'Madre', 'telefono' => '71003344'],
        ];

        foreach ($contactos as $item) {
            $persona = Persona::where('ci', $item['ci'])->first();
            if ($persona) {
                $paciente = Paciente::find($persona->id_persona);
                if ($paciente) {
                    ContactoEmergencia::updateOrCreate([
                        'id_paciente' => $paciente->id_persona,
                        'nombre_completo' => $item['nombre_completo'],
                    ], [
                        'parentesco' => $item['parentesco'],
                        'telefono' => $item['telefono'],
                    ]);
                }
            }
        }
    }
}
