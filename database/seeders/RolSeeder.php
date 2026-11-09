<?php

namespace Database\Seeders;

use App\Models\Rol;
use Illuminate\Database\Seeder;

class RolSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            ['id_rol' => 1, 'nombre' => 'ADMINISTRADOR', 'descripcion' => 'Acceso total al sistema y configuración global'],
            ['id_rol' => 2, 'nombre' => 'RECEPCIONISTA', 'descripcion' => 'Gestión de pacientes, agenda y confirmación de citas'],
            ['id_rol' => 3, 'nombre' => 'MEDICO', 'descripcion' => 'Consulta de agenda, citas asignadas y registro de atención'],
            ['id_rol' => 4, 'nombre' => 'PACIENTE', 'descripcion' => 'Acceso web para auto-reserva de citas, consulta de fichas y pagos'],
        ];

        foreach ($roles as $rol) {
            Rol::updateOrCreate(['id_rol' => $rol['id_rol']], [
                'nombre' => $rol['nombre'],
                'descripcion' => $rol['descripcion'],
            ]);
        }
    }
}
