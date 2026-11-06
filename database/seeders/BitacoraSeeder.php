<?php

namespace Database\Seeders;

use App\Models\Bitacora;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

class BitacoraSeeder extends Seeder
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

        Bitacora::updateOrCreate([
            'id_usuario' => $uScolque->id_usuario,
            'modulo' => 'P1_SEGURIDAD',
            'tipo_accion' => 'LOGIN',
            'detalle' => 'Inicio de sesión inicial del sistema',
        ], [
            'fecha_hora' => now(),
            'tabla_afectada' => 'usuario',
            'id_registro_afectado' => $uScolque->id_usuario,
            'ip' => '127.0.0.1',
        ]);
    }
}
