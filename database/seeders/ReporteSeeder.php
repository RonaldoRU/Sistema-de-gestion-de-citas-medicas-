<?php

namespace Database\Seeders;

use App\Models\Reporte;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

class ReporteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $uScolque = Usuario::where('nombre_usuario', 'scolque')->first();
        if (! $uScolque) {
            return;
        }

        Reporte::updateOrCreate([
            'id_usuario' => $uScolque->id_usuario,
            'tipo' => 'CITAS_PERIODO',
            'fecha_desde' => '2026-10-01',
            'fecha_hasta' => '2026-10-31',
        ], [
            'filtros' => ['estado' => 'ATENDIDA'],
            'formato' => 'PDF',
            'fecha_generacion' => now(),
        ]);
    }
}
