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
        $configHorarios = [
            // Médicos turno mañana existentes (días 1 a 5)
            ['ci' => '10039156', 'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]],
            ['ci' => '8325677',  'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]],
            ['ci' => '12247339', 'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]],
            ['ci' => '6297813',  'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]],
            ['ci' => '11939857', 'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]],
            ['ci' => '6523383',  'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]],
            ['ci' => '5071992',  'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]],
            ['ci' => '9873195',  'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]],
            ['ci' => '10954052', 'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]],
            ['ci' => '3000003',  'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]],

            // Nuevos médicos especialistas con Turno Tarde
            ['ci' => '13482910', 'hora_inicio' => '14:00', 'hora_fin' => '18:00', 'dias' => [1, 2, 3, 4, 5]], // Dermatología - Turno Tarde
            ['ci' => '14295831', 'hora_inicio' => '14:00', 'hora_fin' => '18:30', 'dias' => [1, 2, 3, 4, 5]], // Traumatología - Turno Tarde
            ['ci' => '15839204', 'hora_inicio' => '14:30', 'hora_fin' => '18:30', 'dias' => [1, 2, 3, 4, 5]], // Neurología - Turno Tarde
            ['ci' => '16928475', 'hora_inicio' => '15:00', 'hora_fin' => '19:00', 'dias' => [1, 2, 3, 4, 5]], // Oftalmología - Turno Tarde
            ['ci' => '17839201', 'hora_inicio' => '08:30', 'hora_fin' => '12:30', 'dias' => [1, 2, 3, 4, 5]], // Otorrinolaringología - Turno Mañana
            ['ci' => '18940291', 'hora_inicio' => '14:00', 'hora_fin' => '18:00', 'dias' => [1, 2, 3, 4, 5]], // Gastroenterología - Turno Tarde
            ['ci' => '19820394', 'hora_inicio' => '08:00', 'hora_fin' => '12:00', 'dias' => [1, 2, 3, 4, 5]], // Urología - Turno Mañana
            ['ci' => '20938412', 'hora_inicio' => '14:00', 'hora_fin' => '18:00', 'dias' => [1, 2, 3, 4, 5]], // Endocrinología - Turno Tarde
            ['ci' => '21948523', 'hora_inicio' => '14:30', 'hora_fin' => '18:30', 'dias' => [1, 2, 3, 4, 5]], // Neumología - Turno Tarde
            ['ci' => '22849534', 'hora_inicio' => '15:00', 'hora_fin' => '19:00', 'dias' => [1, 2, 3, 4, 5]], // Psiquiatría - Turno Tarde
        ];

        foreach ($configHorarios as $cfg) {
            $persona = Persona::where('ci', $cfg['ci'])->first();
            if ($persona && $persona->activo) {
                $medico = Medico::find($persona->id_persona);
                if ($medico) {
                    foreach ($cfg['dias'] as $dia) {
                        Horario::updateOrCreate([
                            'id_medico' => $medico->id_persona,
                            'dia_semana' => $dia,
                        ], [
                            'hora_inicio' => $cfg['hora_inicio'],
                            'hora_fin' => $cfg['hora_fin'],
                            'duracion_bloque_min' => 30,
                            'activo' => true,
                        ]);
                    }
                }
            }
        }
    }
}
