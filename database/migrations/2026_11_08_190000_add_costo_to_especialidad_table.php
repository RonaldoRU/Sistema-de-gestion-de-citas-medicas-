<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Agregar columna costo a la tabla especialidad si no existe
        if (! Schema::hasColumn('especialidad', 'costo')) {
            Schema::table('especialidad', function (Blueprint $table): void {
                $table->decimal('costo', 10, 2)->default(120.00)->after('descripcion');
            });
        }

        // 2. Catálogo completo de especialidades con costos reales de mercado en Bolivia (Bs)
        $especialidadesReales = [
            [
                'nombre' => 'Medicina General',
                'descripcion' => 'Atención primaria, triaje clínico y medicina preventiva ambulatoria',
                'costo' => 120.00,
            ],
            [
                'nombre' => 'Pediatría',
                'descripcion' => 'Atención médica integral infantil, crecimiento y desarrollo del recién nacido y adolescente',
                'costo' => 150.00,
            ],
            [
                'nombre' => 'Ginecología y Obstetricia',
                'descripcion' => 'Salud reproductiva femenina, control prenatal, ecografía ginecológica y parto',
                'costo' => 180.00,
            ],
            [
                'nombre' => 'Odontología',
                'descripcion' => 'Salud bucal, profilaxis, odontopediatría, ortodoncia y endodoncia',
                'costo' => 140.00,
            ],
            [
                'nombre' => 'Cardiología',
                'descripcion' => 'Diagnóstico cardiovascular, electrocardiografía, ecocardiograma y control de hipertensión',
                'costo' => 220.00,
            ],
            [
                'nombre' => 'Dermatología',
                'descripcion' => 'Diagnóstico y tratamiento de patologías de la piel, pelo, uñas y alergias dérmicas',
                'costo' => 190.00,
            ],
            [
                'nombre' => 'Traumatología y Ortopedia',
                'descripcion' => 'Lesiones musculoesqueléticas, fracturas, esguinces y patología osteoarticular',
                'costo' => 200.00,
            ],
            [
                'nombre' => 'Cardiología Pediátrica',
                'descripcion' => 'Subespecialidad cardiológica para cardiopatías congénitas y soplos en niños',
                'costo' => 250.00,
            ],
            [
                'nombre' => 'Neurología',
                'descripcion' => 'Evaluación del sistema nervioso central y periférico, migraña y cefaleas',
                'costo' => 260.00,
            ],
            [
                'nombre' => 'Oftalmología',
                'descripcion' => 'Evaluación de agudeza visual, fondo de ojo, tonometría y salud ocular',
                'costo' => 180.00,
            ],
            [
                'nombre' => 'Otorrinolaringología',
                'descripcion' => 'Tratamiento de oído, nariz, garganta y afecciones de senos paranasales',
                'costo' => 190.00,
            ],
            [
                'nombre' => 'Gastroenterología',
                'descripcion' => 'Aparato digestivo, gastritis, reflujo y patología hepática y vesicular',
                'costo' => 210.00,
            ],
            [
                'nombre' => 'Urología',
                'descripcion' => 'Salud urológica, vías urinarias y control prostático preventivo',
                'costo' => 210.00,
            ],
            [
                'nombre' => 'Endocrinología',
                'descripcion' => 'Trastornos hormonales, control de diabetes mellitus y tiroides',
                'costo' => 220.00,
            ],
            [
                'nombre' => 'Neumología',
                'descripcion' => 'Salud respiratoria, asma bronquial, tos crónica y función pulmonar',
                'costo' => 200.00,
            ],
            [
                'nombre' => 'Psiquiatría',
                'descripcion' => 'Salud mental clínica, manejo de estrés, trastornos afectivos y de ansiedad',
                'costo' => 250.00,
            ],
        ];

        foreach ($especialidadesReales as $esp) {
            $nombreBuscado = mb_strtolower(trim($esp['nombre']));
            $raiz = mb_substr($nombreBuscado, 0, 5);

            $existente = DB::table('especialidad')
                ->whereRaw('lower(btrim(nombre)) = ?', [$nombreBuscado])
                ->orWhereRaw('lower(btrim(nombre)) LIKE ?', [$raiz.'%'])
                ->first();

            if ($existente) {
                DB::table('especialidad')
                    ->where('id_especialidad', $existente->id_especialidad)
                    ->update([
                        'costo' => $esp['costo'],
                        'descripcion' => $esp['descripcion'],
                        'activo' => true,
                    ]);
            } else {
                DB::table('especialidad')->insert([
                    'nombre' => $esp['nombre'],
                    'descripcion' => $esp['descripcion'],
                    'costo' => $esp['costo'],
                    'activo' => true,
                ]);
            }
        }

        // Asegurar que ninguna especialidad quede con costo nulo o menor a 100
        DB::table('especialidad')
            ->whereNull('costo')
            ->orWhere('costo', '<=', 0)
            ->update(['costo' => 120.00]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('especialidad', 'costo')) {
            Schema::table('especialidad', function (Blueprint $table): void {
                $table->dropColumn('costo');
            });
        }
    }
};
