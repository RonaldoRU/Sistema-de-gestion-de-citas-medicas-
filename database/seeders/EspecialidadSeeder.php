<?php

namespace Database\Seeders;

use App\Models\Especialidad;
use Illuminate\Database\Seeder;

class EspecialidadSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $especialidades = [
            ['id_especialidad' => 1, 'nombre' => 'Medicina General', 'descripcion' => 'Atención primaria y diagnóstico integral', 'activo' => true],
            ['id_especialidad' => 2, 'nombre' => 'Pediatría', 'descripcion' => 'Atención médica integral infantil y adolescente', 'activo' => true],
            ['id_especialidad' => 3, 'nombre' => 'Ginecología', 'descripcion' => 'Salud femenina, reproductiva y prenatal', 'activo' => true],
            ['id_especialidad' => 4, 'nombre' => 'Odontología', 'descripcion' => 'Salud bucal y tratamientos odontológicos', 'activo' => true],
            ['id_especialidad' => 5, 'nombre' => 'Cardiología', 'descripcion' => 'Diagnóstico y tratamiento cardiovascular', 'activo' => true],
        ];

        foreach ($especialidades as $especialidad) {
            Especialidad::updateOrCreate(['id_especialidad' => $especialidad['id_especialidad']], [
                'nombre' => $especialidad['nombre'],
                'descripcion' => $especialidad['descripcion'],
                'activo' => $especialidad['activo'],
            ]);
        }
    }
}
