<?php

namespace Database\Seeders;

use App\Models\Permiso;
use Illuminate\Database\Seeder;

class PermisoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permisos = [
            ['nombre' => 'ACCESO_SISTEMA', 'modulo' => 'P1_SEGURIDAD', 'ruta_menu' => '/dashboard'],
            ['nombre' => 'GESTION_USUARIOS', 'modulo' => 'P2_RBAC', 'ruta_menu' => '/admin/usuarios'],
            ['nombre' => 'GESTION_ROLES', 'modulo' => 'P2_RBAC', 'ruta_menu' => '/admin/roles'],
            ['nombre' => 'CONSULTAR_BITACORA', 'modulo' => 'P3_AUDITORIA', 'ruta_menu' => '/admin/bitacora'],
            ['nombre' => 'GESTION_PACIENTES', 'modulo' => 'P4_PACIENTES', 'ruta_menu' => '/pacientes'],
            ['nombre' => 'GESTION_MEDICOS', 'modulo' => 'P5_MEDICOS', 'ruta_menu' => '/medicos'],
            ['nombre' => 'GESTION_HORARIOS', 'modulo' => 'P5_HORARIOS', 'ruta_menu' => '/medicos/horarios'],
            ['nombre' => 'BLOQUEO_AGENDA', 'modulo' => 'P5_AGENDA', 'ruta_menu' => '/agenda/bloqueos'],
            ['nombre' => 'GESTION_CITAS', 'modulo' => 'P6_CITAS', 'ruta_menu' => '/citas'],
            ['nombre' => 'ATENCION_MEDICA', 'modulo' => 'P6_CITAS', 'ruta_menu' => '/citas/atencion'],
            ['nombre' => 'NOTIFICACIONES_CITAS', 'modulo' => 'P6_NOTIFICACIONES', 'ruta_menu' => '/citas/recordatorios'],
            ['nombre' => 'REPORTES_ADMINISTRATIVOS', 'modulo' => 'P7_REPORTES', 'ruta_menu' => '/reportes'],
        ];

        foreach ($permisos as $permiso) {
            Permiso::updateOrCreate(['nombre' => $permiso['nombre']], [
                'modulo' => $permiso['modulo'],
                'ruta_menu' => $permiso['ruta_menu'],
            ]);
        }
    }
}
