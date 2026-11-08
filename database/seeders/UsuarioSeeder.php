<?php

namespace Database\Seeders;

use App\Models\Persona;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsuarioSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $hashPassword = Hash::make('Admin123*');

        $usuarios = [
            // Administradores
            ['ci' => '11757436', 'nombre_usuario' => 'scolque', 'id_rol' => 1, 'estado' => 'ACTIVO'],
            ['ci' => '14567212', 'nombre_usuario' => 'rrivero', 'id_rol' => 1, 'estado' => 'ACTIVO'],
            ['ci' => '1000001', 'nombre_usuario' => 'admin', 'id_rol' => 1, 'estado' => 'ACTIVO'],

            // Recepcionistas
            ['ci' => '8090601', 'nombre_usuario' => 'rvaca', 'id_rol' => 2, 'estado' => 'ACTIVO'],
            ['ci' => '5930783', 'nombre_usuario' => 'csuarez', 'id_rol' => 2, 'estado' => 'ACTIVO'],
            ['ci' => '7668705', 'nombre_usuario' => 'jmendoza', 'id_rol' => 2, 'estado' => 'ACTIVO'],
            ['ci' => '7175901', 'nombre_usuario' => 'djustiniano', 'id_rol' => 2, 'estado' => 'ACTIVO'],
            ['ci' => '2000002', 'nombre_usuario' => 'recepcion', 'id_rol' => 2, 'estado' => 'ACTIVO'],

            // Médicos
            ['ci' => '10039156', 'nombre_usuario' => 'jrojas', 'id_rol' => 3, 'estado' => 'ACTIVO'],
            ['ci' => '8325677', 'nombre_usuario' => 'pgutierrez', 'id_rol' => 3, 'estado' => 'ACTIVO'],
            ['ci' => '12247339', 'nombre_usuario' => 'farteaga', 'id_rol' => 3, 'estado' => 'ACTIVO'],
            ['ci' => '6297813', 'nombre_usuario' => 'cmontero', 'id_rol' => 3, 'estado' => 'ACTIVO'],
            ['ci' => '11939857', 'nombre_usuario' => 'mterceros', 'id_rol' => 3, 'estado' => 'ACTIVO'],
            ['ci' => '6523383', 'nombre_usuario' => 'gpena', 'id_rol' => 3, 'estado' => 'ACTIVO'],
            ['ci' => '5071992', 'nombre_usuario' => 'amoreno', 'id_rol' => 3, 'estado' => 'ACTIVO'],
            ['ci' => '9873195', 'nombre_usuario' => 'lantelo', 'id_rol' => 3, 'estado' => 'ACTIVO'],
            ['ci' => '10954052', 'nombre_usuario' => 'reguez', 'id_rol' => 3, 'estado' => 'ACTIVO'],
            ['ci' => '9856412', 'nombre_usuario' => 'hflores', 'id_rol' => 3, 'estado' => 'INACTIVO'],
            ['ci' => '3000003', 'nombre_usuario' => 'dr.perez', 'id_rol' => 3, 'estado' => 'ACTIVO'],
        ];

        foreach ($usuarios as $item) {
            $persona = Persona::where('ci', $item['ci'])->first();
            if ($persona) {
                Usuario::updateOrCreate(['nombre_usuario' => $item['nombre_usuario']], [
                    'id_persona' => $persona->id_persona,
                    'id_rol' => $item['id_rol'],
                    'hash_contrasena' => $hashPassword,
                    'estado' => $item['estado'],
                    'intentos_fallidos' => 0,
                    'ultimo_acceso' => now(),
                    'fecha_creacion' => now(),
                ]);
            }
        }
    }
}
