<?php

namespace Database\Seeders;

use App\Models\Persona;
use Illuminate\Database\Seeder;

class PersonaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $personas = [
            // Administradores
            ['ci' => '11757436', 'nombres' => 'Silvia Irene', 'apellidos' => 'Colque López', 'telefono' => '76945876', 'email' => 'scolque@vidasalud.com.bo', 'activo' => true],
            ['ci' => '14567212', 'nombres' => 'Ronald', 'apellidos' => 'Rivero Fernandez', 'telefono' => '73127317', 'email' => 'ronaldorojasugarte@gmail.com', 'activo' => true],
            ['ci' => '1000001', 'nombres' => 'Carlos Alberto', 'apellidos' => 'Administrador General', 'telefono' => '71234567', 'email' => 'admin@vidasalud.com', 'activo' => true],

            // Recepcionistas
            ['ci' => '8090601', 'nombres' => 'Rosa María', 'apellidos' => 'Vaca Cuéllar', 'telefono' => '75403694', 'email' => 'rvaca@vidasalud.com.bo', 'activo' => true],
            ['ci' => '5930783', 'nombres' => 'Carla Andrea', 'apellidos' => 'Suárez Roca', 'telefono' => '78793510', 'email' => 'csuarez@vidasalud.com.bo', 'activo' => true],
            ['ci' => '7668705', 'nombres' => 'Jorge Luis', 'apellidos' => 'Mendoza Paz', 'telefono' => '71128245', 'email' => 'jmendoza@vidasalud.com.bo', 'activo' => true],
            ['ci' => '7175901', 'nombres' => 'Daniela', 'apellidos' => 'Justiniano Áñez', 'telefono' => '76954784', 'email' => 'djustiniano@vidasalud.com.bo', 'activo' => true],
            ['ci' => '2000002', 'nombres' => 'Ana María', 'apellidos' => 'Recepcionista Central', 'telefono' => '72345678', 'email' => 'recepcion@vidasalud.com', 'activo' => true],

            // Médicos
            ['ci' => '10039156', 'nombres' => 'Juan Ronaldo', 'apellidos' => 'Rojas Ugarte', 'telefono' => '74625968', 'email' => 'jrojas@vidasalud.com.bo', 'activo' => true],
            ['ci' => '8325677', 'nombres' => 'Patricia', 'apellidos' => 'Gutiérrez Melgar', 'telefono' => '76244222', 'email' => 'pgutierrez@vidasalud.com.bo', 'activo' => true],
            ['ci' => '12247339', 'nombres' => 'Fernando', 'apellidos' => 'Arteaga Ribera', 'telefono' => '70246676', 'email' => 'farteaga@vidasalud.com.bo', 'activo' => true],
            ['ci' => '6297813', 'nombres' => 'Claudia', 'apellidos' => 'Montero Saucedo', 'telefono' => '72839842', 'email' => 'cmontero@vidasalud.com.bo', 'activo' => true],
            ['ci' => '11939857', 'nombres' => 'Marcelo', 'apellidos' => 'Terceros Chávez', 'telefono' => '78940741', 'email' => 'mterceros@vidasalud.com.bo', 'activo' => true],
            ['ci' => '6523383', 'nombres' => 'Gabriela', 'apellidos' => 'Peña Salvatierra', 'telefono' => '75666192', 'email' => 'gpena@vidasalud.com.bo', 'activo' => true],
            ['ci' => '5071992', 'nombres' => 'Álvaro', 'apellidos' => 'Moreno Durán', 'telefono' => '71424219', 'email' => 'amoreno@vidasalud.com.bo', 'activo' => true],
            ['ci' => '9873195', 'nombres' => 'Lorena', 'apellidos' => 'Antelo Barba', 'telefono' => '71631930', 'email' => 'lantelo@vidasalud.com.bo', 'activo' => true],
            ['ci' => '10954052', 'nombres' => 'Ricardo', 'apellidos' => 'Égüez Parada', 'telefono' => '79248485', 'email' => 'reguez@vidasalud.com.bo', 'activo' => true],
            ['ci' => '9856412', 'nombres' => 'Hugo', 'apellidos' => 'Flores Mamani', 'telefono' => '78452722', 'email' => 'hflores@vidasalud.com.bo', 'activo' => false],
            ['ci' => '3000003', 'nombres' => 'Carlos', 'apellidos' => 'Pérez Gómez', 'telefono' => '73456789', 'email' => 'dr.perez@vidasalud.com', 'activo' => true],

            // Nuevos Médicos Especialistas
            ['ci' => '13482910', 'nombres' => 'Mariana Sofía', 'apellidos' => 'Villarroel Suárez', 'telefono' => '71829301', 'email' => 'mvillarroel@vidasalud.com.bo', 'activo' => true],
            ['ci' => '14295831', 'nombres' => 'Rodrigo Andrés', 'apellidos' => 'Camacho Aguilera', 'telefono' => '72948512', 'email' => 'rcamacho@vidasalud.com.bo', 'activo' => true],
            ['ci' => '15839204', 'nombres' => 'Esteban Mauricio', 'apellidos' => 'Zeballos Ortiz', 'telefono' => '73849102', 'email' => 'ezeballos@vidasalud.com.bo', 'activo' => true],
            ['ci' => '16928475', 'nombres' => 'Valeria Elena', 'apellidos' => 'Hurtado Céspedes', 'telefono' => '74928173', 'email' => 'vhurtado@vidasalud.com.bo', 'activo' => true],
            ['ci' => '17839201', 'nombres' => 'Guillermo Javier', 'apellidos' => 'Paz Soldán', 'telefono' => '75839201', 'email' => 'gpaz@vidasalud.com.bo', 'activo' => true],
            ['ci' => '18940291', 'nombres' => 'Silvia Daniela', 'apellidos' => 'Torrico Benítez', 'telefono' => '76940281', 'email' => 'storrico@vidasalud.com.bo', 'activo' => true],
            ['ci' => '19820394', 'nombres' => 'Alejandro José', 'apellidos' => 'Morales Barrientos', 'telefono' => '77820394', 'email' => 'amorales@vidasalud.com.bo', 'activo' => true],
            ['ci' => '20938412', 'nombres' => 'Carla Viviana', 'apellidos' => 'Añez Justiniano', 'telefono' => '78938412', 'email' => 'canez@vidasalud.com.bo', 'activo' => true],
            ['ci' => '21948523', 'nombres' => 'Gonzalo Hernán', 'apellidos' => 'Rivera Melgar', 'telefono' => '79948523', 'email' => 'grivera@vidasalud.com.bo', 'activo' => true],
            ['ci' => '22849534', 'nombres' => 'Lucía Mercedes', 'apellidos' => 'Saldaña Quiroga', 'telefono' => '70849534', 'email' => 'lsaldana@vidasalud.com.bo', 'activo' => true],

            // Pacientes base
            ['ci' => '12181643', 'nombres' => 'Jimena', 'apellidos' => 'Égüez Choque', 'telefono' => '75666779', 'email' => 'jeguez@outlook.com', 'activo' => true],
            ['ci' => '10223343', 'nombres' => 'Ronald', 'apellidos' => 'Saucedo Mendoza', 'telefono' => '71640267', 'email' => 'rsaucedo@gmail.com', 'activo' => true],
            ['ci' => '9432684', 'nombres' => 'Jorge Ronald', 'apellidos' => 'Rojas Choque', 'telefono' => '75702715', 'email' => 'jrojas@gmail.com', 'activo' => true],
        ];

        foreach ($personas as $persona) {
            Persona::updateOrCreate(['ci' => $persona['ci']], [
                'nombres' => $persona['nombres'],
                'apellidos' => $persona['apellidos'],
                'telefono' => $persona['telefono'],
                'email' => $persona['email'],
                'activo' => $persona['activo'],
            ]);
        }
    }
}
