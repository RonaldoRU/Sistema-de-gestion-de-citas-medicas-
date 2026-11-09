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
            ['id_especialidad' => 6, 'nombre' => 'Dermatología', 'descripcion' => 'Tratamiento de afecciones cutáneas y capilares', 'activo' => true],
            ['id_especialidad' => 7, 'nombre' => 'Traumatología y Ortopedia', 'descripcion' => 'Manejo de lesiones del sistema musculoesquelético', 'activo' => true],
            ['id_especialidad' => 8, 'nombre' => 'Cardiología Pediátrica', 'descripcion' => 'Cardiopatías congénitas y evaluación infantil', 'activo' => true],
            ['id_especialidad' => 9, 'nombre' => 'Neurología', 'descripcion' => 'Enfermedades del sistema nervioso central y periférico', 'activo' => true],
            ['id_especialidad' => 10, 'nombre' => 'Oftalmología', 'descripcion' => 'Cuidado y patología de la visión', 'activo' => true],
            ['id_especialidad' => 11, 'nombre' => 'Otorrinolaringología', 'descripcion' => 'Enfermedades del oído, nariz y garganta', 'activo' => true],
            ['id_especialidad' => 12, 'nombre' => 'Gastroenterología', 'descripcion' => 'Patologías del aparato digestivo e hígado', 'activo' => true],
            ['id_especialidad' => 13, 'nombre' => 'Urología', 'descripcion' => 'Vías urinarias y sistema reproductor masculino', 'activo' => true],
            ['id_especialidad' => 14, 'nombre' => 'Endocrinología', 'descripcion' => 'Trastornos hormonales y metabólicos', 'activo' => true],
            ['id_especialidad' => 15, 'nombre' => 'Neumología', 'descripcion' => 'Enfermedades respiratorias y pulmonares', 'activo' => true],
            ['id_especialidad' => 16, 'nombre' => 'Psiquiatría', 'descripcion' => 'Salud mental y trastornos del comportamiento', 'activo' => true],
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
