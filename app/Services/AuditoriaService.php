<?php

namespace App\Services;

use App\Models\Bitacora;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditoriaService
{
    /**
     * Enumeración válida de tipo_accion según PostgreSQL DDL (vida_salud.sql).
     */
    public const ACCIONES_VALIDAS = [
        'CREAR', 'MODIFICAR', 'ELIMINAR', 'LOGIN', 'LOGOUT', 'BLOQUEO',
        'INACTIVAR', 'REGISTRAR', 'RENOVAR', 'REACTIVAR'
    ];

    /**
     * Registrar una acción en la bitácora de auditoría (CU10).
     */
    public static function registrar(
        string $modulo,
        string $tipoAccion,
        ?string $tablaAfectada = null,
        ?int $idRegistroAfectado = null,
        mixed $detalle = null,
        ?int $idUsuario = null
    ): Bitacora {
        $userId = $idUsuario ?? Auth::id();

        // Normalizar tipo de acción para cumplir con el enum de PostgreSQL
        $tipoUpper = strtoupper(trim($tipoAccion));
        if (!in_array($tipoUpper, self::ACCIONES_VALIDAS)) {
            if (str_contains($tipoUpper, 'INACTIV') || str_contains($tipoUpper, 'SUSPEND') || str_contains($tipoUpper, 'DESACTIV') || str_contains($tipoUpper, 'BAJA')) {
                $tipoUpper = 'INACTIVAR';
            } elseif (str_contains($tipoUpper, 'RENOV') || str_contains($tipoUpper, 'REACTIV') || str_contains($tipoUpper, 'HABILIT')) {
                $tipoUpper = 'RENOVAR';
            } elseif (str_contains($tipoUpper, 'REGISTR') || str_contains($tipoUpper, 'ALTA')) {
                $tipoUpper = 'REGISTRAR';
            } elseif (str_contains($tipoUpper, 'LOGIN') || str_contains($tipoUpper, 'AUTH') || str_contains($tipoUpper, 'SESION')) {
                $tipoUpper = 'LOGIN';
            } elseif (str_contains($tipoUpper, 'LOGOUT') || str_contains($tipoUpper, 'SALIR')) {
                $tipoUpper = 'LOGOUT';
            } elseif (str_contains($tipoUpper, 'BLOQUE')) {
                $tipoUpper = 'BLOQUEO';
            } elseif (str_contains($tipoUpper, 'ELIMIN') || str_contains($tipoUpper, 'BORR') || str_contains($tipoUpper, 'DELETE') || str_contains($tipoUpper, 'CANCEL')) {
                $tipoUpper = 'ELIMINAR';
            } elseif (str_contains($tipoUpper, 'MODIF') || str_contains($tipoUpper, 'EDIT') || str_contains($tipoUpper, 'ACTUALIZ') || str_contains($tipoUpper, 'UPDATE') || str_contains($tipoUpper, 'CAMBIO') || str_contains($tipoUpper, 'REPROGRAM')) {
                $tipoUpper = 'MODIFICAR';
            } else {
                $tipoUpper = 'REGISTRAR';
            }
        }

        if (is_array($detalle) || is_object($detalle)) {
            $detalle = json_encode($detalle, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        }

        // Marcar la petición actual como auditada para no duplicar en el middleware
        if (request()) {
            request()->attributes->set('vs_audit_logged', true);
        }

        return Bitacora::create([
            'id_usuario' => $userId,
            'fecha_hora' => now(),
            'modulo' => strtoupper($modulo),
            'tipo_accion' => $tipoUpper,
            'tabla_afectada' => $tablaAfectada,
            'id_registro_afectado' => $idRegistroAfectado,
            'detalle' => $detalle,
            'ip' => Request::ip() ?? '127.0.0.1',
        ]);
    }
}
