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
        'INACTIVAR', 'REGISTRAR', 'RENOVAR', 'REACTIVAR',
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
        ?int $idUsuario = null,
        ?string $descripcion = null,
        ?string $navegador = null
    ): Bitacora {
        $userId = $idUsuario ?? Auth::id();

        // Normalizar tipo de acción para cumplir con el enum de PostgreSQL
        $tipoUpper = strtoupper(trim($tipoAccion));
        if (! in_array($tipoUpper, self::ACCIONES_VALIDAS)) {
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

        $detalleTexto = $detalle;
        if (is_array($detalle) || is_object($detalle)) {
            $detalleTexto = json_encode($detalle, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        }

        $desc = $descripcion;
        if (empty($desc)) {
            if (! empty($detalleTexto) && is_string($detalleTexto)) {
                $desc = mb_substr(strip_tags($detalleTexto), 0, 250);
            } else {
                $desc = "Operación {$tipoUpper} en {$modulo}".($tablaAfectada ? " sobre {$tablaAfectada}" : '').($idRegistroAfectado ? " #{$idRegistroAfectado}" : '');
            }
        }

        $nav = $navegador;
        if (empty($nav)) {
            $ua = Request::header('User-Agent') ?? '';
            if (str_contains($ua, 'Edg/')) {
                $nav = 'Microsoft Edge';
            } elseif (str_contains($ua, 'Chrome')) {
                $nav = 'Google Chrome';
            } elseif (str_contains($ua, 'Firefox')) {
                $nav = 'Mozilla Firefox';
            } elseif (str_contains($ua, 'Safari')) {
                $nav = 'Apple Safari';
            } elseif (! empty($ua)) {
                $nav = mb_substr($ua, 0, 100);
            } else {
                $nav = 'Navegador Web';
            }
        }

        // Marcar la petición actual como auditada para no duplicar en el middleware
        if (request()) {
            request()->attributes->set('vs_audit_logged', true);
        }

        // Restricción anti-duplicados: Evitar registrar más de una vez la misma acción en la bitácora
        // Si todos los campos son idénticos dentro de una ventana de 15 segundos, no duplicar.
        // Si cualquier campo es diferente, la restricción NO aplica y se registra normalmente.
        $queryDuplicado = Bitacora::where('modulo', strtoupper($modulo))
            ->where('tipo_accion', $tipoUpper)
            ->where('fecha_hora', '>=', now()->subSeconds(15));

        if ($userId === null) {
            $queryDuplicado->whereNull('id_usuario');
        } else {
            $queryDuplicado->where('id_usuario', $userId);
        }

        if ($tablaAfectada === null) {
            $queryDuplicado->whereNull('tabla_afectada');
        } else {
            $queryDuplicado->where('tabla_afectada', $tablaAfectada);
        }

        if ($idRegistroAfectado === null) {
            $queryDuplicado->whereNull('id_registro_afectado');
        } else {
            $queryDuplicado->where('id_registro_afectado', $idRegistroAfectado);
        }

        if ($detalleTexto === null) {
            $queryDuplicado->whereNull('detalle');
        } else {
            $queryDuplicado->where('detalle', $detalleTexto);
        }

        $existente = $queryDuplicado->latest('id_bitacora')->first();
        if ($existente) {
            return $existente;
        }

        return Bitacora::create([
            'id_usuario' => $userId,
            'fecha_hora' => now(),
            'modulo' => strtoupper($modulo),
            'tipo_accion' => $tipoUpper,
            'tabla_afectada' => $tablaAfectada,
            'id_registro_afectado' => $idRegistroAfectado,
            'detalle' => $detalleTexto,
            'ip' => Request::ip() ?? '127.0.0.1',
            'descripcion' => $desc,
            'navegador' => $nav,
        ]);
    }
}
