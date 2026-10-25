<?php

namespace App\Services;

use App\Models\Bitacora;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditoriaService
{
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

        if (is_array($detalle) || is_object($detalle)) {
            $detalle = json_encode($detalle, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        }

        return Bitacora::create([
            'id_usuario' => $userId,
            'fecha_hora' => now(),
            'modulo' => strtoupper($modulo),
            'tipo_accion' => strtoupper($tipoAccion),
            'tabla_afectada' => $tablaAfectada,
            'id_registro_afectado' => $idRegistroAfectado,
            'detalle' => $detalle,
            'ip' => Request::ip() ?? '127.0.0.1',
        ]);
    }
}
