<?php

namespace Database\Seeders;

use App\Models\Cita;
use App\Models\Medico;
use App\Models\Paciente;
use App\Models\Persona;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

class CitaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $personaPaciente = Persona::where('ci', '12181643')->first();
        $personaMedico = Persona::where('ci', '10039156')->first();
        $usuarioRecep = Usuario::where('nombre_usuario', 'rvaca')->first();

        if (! $personaPaciente || ! $personaMedico || ! $usuarioRecep) {
            return;
        }

        $paciente = Paciente::find($personaPaciente->id_persona);
        $medico = Medico::find($personaMedico->id_persona);

        if (! $paciente || ! $medico) {
            return;
        }

        Cita::updateOrCreate(['codigo' => 'CM-0001'], [
            'id_paciente' => $paciente->id_persona,
            'id_medico' => $medico->id_persona,
            'id_especialidad' => 1,
            'id_usuario_registro' => $usuarioRecep->id_usuario,
            'id_cita_origen' => null,
            'fecha' => '2026-10-19',
            'hora_inicio' => '08:00',
            'hora_fin' => '08:30',
            'motivo_consulta' => 'Control médico general preventivo',
            'estado' => 'ATENDIDA',
            'observacion_atencion' => 'Signos vitales normales. Se indica control anual.',
            'fecha_hora_atencion' => '2026-10-19 08:25:00',
            'fecha_creacion' => '2026-10-15 10:00:00',
        ]);
    }
}
