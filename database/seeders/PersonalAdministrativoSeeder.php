<?php

namespace Database\Seeders;

use App\Models\Persona;
use App\Models\PersonalAdministrativo;
use Illuminate\Database\Seeder;

class PersonalAdministrativoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $personal = [
            ['ci' => '11757436', 'cargo' => 'Administradora del sistema'],
            ['ci' => '1000001', 'cargo' => 'Administrador de Sistemas'],
            ['ci' => '8090601', 'cargo' => 'Recepcionista turno mañana'],
            ['ci' => '5930783', 'cargo' => 'Recepcionista turno mañana'],
            ['ci' => '7668705', 'cargo' => 'Recepcionista turno tarde'],
            ['ci' => '7175901', 'cargo' => 'Recepcionista turno tarde'],
            ['ci' => '2000002', 'cargo' => 'Recepcionista Central'],
        ];

        foreach ($personal as $item) {
            $persona = Persona::where('ci', $item['ci'])->first();
            if ($persona) {
                PersonalAdministrativo::updateOrCreate(
                    ['id_persona' => $persona->id_persona],
                    ['cargo' => $item['cargo']]
                );
            }
        }
    }
}
