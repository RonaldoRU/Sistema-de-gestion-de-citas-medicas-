<?php

namespace Database\Seeders;

use App\Models\Sesion;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

class SesionSeeder extends Seeder
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

        $defaultToken = '27c4c9dc3d9e4bdfa36e04e02f65ace251cebbabbc6450e834f90898d10ed34f';
        Sesion::updateOrCreate([
            'id_sesion' => $defaultToken,
        ], [
            'id_usuario' => $uScolque->id_usuario,
            'fecha_inicio' => now(),
            'ultima_actividad' => now(),
            'activa' => true,
            'ip' => '127.0.0.1',
        ]);
    }
}
