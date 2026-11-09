<?php

namespace Database\Seeders;

use App\Models\Medico;
use App\Models\Persona;
use Illuminate\Database\Seeder;

class MedicoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $medicos = [
            ['ci' => '10039156', 'cod' => 'MED-001', 'mat' => 'MP-10039'],
            ['ci' => '8325677', 'cod' => 'MED-002', 'mat' => 'MP-83256'],
            ['ci' => '12247339', 'cod' => 'MED-003', 'mat' => 'MP-12247'],
            ['ci' => '6297813', 'cod' => 'MED-004', 'mat' => 'MP-62978'],
            ['ci' => '11939857', 'cod' => 'MED-005', 'mat' => 'MP-11939'],
            ['ci' => '6523383', 'cod' => 'MED-006', 'mat' => 'MP-65233'],
            ['ci' => '5071992', 'cod' => 'MED-007', 'mat' => 'MP-50719'],
            ['ci' => '9873195', 'cod' => 'MED-008', 'mat' => 'MP-98731'],
            ['ci' => '10954052', 'cod' => 'MED-009', 'mat' => 'MP-10954'],
            ['ci' => '9856412', 'cod' => 'MED-010', 'mat' => 'MP-98564'],
            ['ci' => '3000003', 'cod' => 'MED-099', 'mat' => 'MP-89452'],
            ['ci' => '13482910', 'cod' => 'MED-011', 'mat' => 'MP-13482'],
            ['ci' => '14295831', 'cod' => 'MED-012', 'mat' => 'MP-14295'],
            ['ci' => '15839204', 'cod' => 'MED-013', 'mat' => 'MP-15839'],
            ['ci' => '16928475', 'cod' => 'MED-014', 'mat' => 'MP-16928'],
            ['ci' => '17839201', 'cod' => 'MED-015', 'mat' => 'MP-17839'],
            ['ci' => '18940291', 'cod' => 'MED-016', 'mat' => 'MP-18940'],
            ['ci' => '19820394', 'cod' => 'MED-017', 'mat' => 'MP-19820'],
            ['ci' => '20938412', 'cod' => 'MED-018', 'mat' => 'MP-20938'],
            ['ci' => '21948523', 'cod' => 'MED-019', 'mat' => 'MP-21948'],
            ['ci' => '22849534', 'cod' => 'MED-020', 'mat' => 'MP-22849'],
        ];

        foreach ($medicos as $item) {
            $persona = Persona::where('ci', $item['ci'])->first();
            if ($persona) {
                Medico::where('codigo', $item['cod'])
                    ->where('id_persona', '!=', $persona->id_persona)
                    ->delete();

                Medico::updateOrCreate(['id_persona' => $persona->id_persona], [
                    'codigo' => $item['cod'],
                    'matricula' => $item['mat'],
                ]);
            }
        }
    }
}
