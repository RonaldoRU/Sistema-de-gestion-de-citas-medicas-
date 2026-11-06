<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use Illuminate\Database\Seeder;

class RolPermisoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rolAdmin = Rol::find(1);
        if ($rolAdmin) {
            $todosPermisos = Permiso::all()->pluck('id_permiso');
            $rolAdmin->permisos()->sync($todosPermisos);
        }

        $rolRecep = Rol::find(2);
        if ($rolRecep) {
            $permisosRecep = Permiso::whereIn('nombre', [
                'ACCESO_SISTEMA',
                'GESTION_PACIENTES',
                'GESTION_CITAS',
                'NOTIFICACIONES_CITAS',
            ])->pluck('id_permiso');
            $rolRecep->permisos()->sync($permisosRecep);
        }

        $rolMed = Rol::find(3);
        if ($rolMed) {
            $permisosMed = Permiso::whereIn('nombre', [
                'ACCESO_SISTEMA',
                'GESTION_PACIENTES',
                'GESTION_CITAS',
                'ATENCION_MEDICA',
            ])->pluck('id_permiso');
            $rolMed->permisos()->sync($permisosMed);
        }
    }
}
