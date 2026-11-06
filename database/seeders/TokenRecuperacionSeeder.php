<?php

namespace Database\Seeders;

use App\Models\TokenRecuperacion;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

class TokenRecuperacionSeeder extends Seeder
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

        TokenRecuperacion::updateOrCreate([
            'token_hash' => hash('sha256', '000000'),
        ], [
            'id_usuario' => $uScolque->id_usuario,
            'fecha_generacion' => now()->subDay(),
            'fecha_expiracion' => now()->subHours(23),
            'usado' => true,
        ]);
    }
}
