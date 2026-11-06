<?php

namespace App\Http\Controllers;

use App\Models\Cita;
use App\Models\HistorialEstadoCita;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class HistorialEstadoCitaController extends Controller
{
    /**
     * Obtiene el historial cronológico de todos los cambios de estado de una cita médica.
     */
    public function index(int $id): JsonResponse
    {
        $historial = HistorialEstadoCita::with('usuario.persona')
            ->where('id_cita', $id)
            ->orderByDesc('fecha_cambio')
            ->get();

        return response()->json([
            'success' => true,
            'total' => $historial->count(),
            'data' => $historial,
        ]);
    }

    /**
     * Registra un nuevo cambio de estado en el historial de trazabilidad de una cita médica.
     */
    public function store(Request $request, int $id): JsonResponse
    {
        $cita = Cita::find($id);

        if (! $cita) {
            return response()->json([
                'success' => false,
                'message' => 'Cita médica no encontrada.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'estado_nuevo' => 'required|string|max:30',
            'motivo' => 'nullable|string|max:200',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $registro = HistorialEstadoCita::create([
            'id_cita' => $cita->id_cita,
            'id_usuario' => Auth::id() ?? 1,
            'estado_anterior' => $cita->estado,
            'estado_nuevo' => strtoupper(trim($request->input('estado_nuevo'))),
            'fecha_anterior' => $cita->fecha,
            'hora_anterior' => $cita->hora_inicio,
            'motivo' => $request->input('motivo'),
            'fecha_cambio' => now(),
        ]);

        AuditoriaService::registrar(
            'P6_CITAS',
            'CAMBIO_ESTADO_CITA',
            'historial_estado_cita',
            $registro->id_historial,
            "Registro manual en historial de estados de cita [{$cita->codigo}]: {$registro->estado_anterior} -> {$registro->estado_nuevo}."
        );

        return response()->json([
            'success' => true,
            'message' => 'Cambio de estado registrado en el historial de la cita.',
            'historial' => $registro,
        ], 201);
    }
}
