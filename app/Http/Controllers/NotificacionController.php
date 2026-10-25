<?php

namespace App\Http\Controllers;

use App\Models\Cita;
use App\Models\Notificacion;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class NotificacionController extends Controller
{
    /**
     * Listar notificaciones y recordatorios de citas
     */
    public function index(Request $request): JsonResponse
    {
        $query = Notificacion::with(['cita.paciente.persona', 'cita.medico.persona', 'usuarioGestion.persona']);

        if ($request->filled('estado')) {
            $query->where('estado', strtoupper($request->input('estado')));
        }

        if ($request->filled('id_cita')) {
            $query->where('id_cita', $request->input('id_cita'));
        }

        $notificaciones = $query->orderBy('fecha_programada', 'asc')->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $notificaciones,
        ]);
    }

    /**
     * Programar recordatorio o notificación para una cita
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'id_cita' => 'required|exists:cita,id_cita',
            'mensaje' => 'required|string',
            'fecha_programada' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $notificacion = Notificacion::create([
            'id_cita' => $request->input('id_cita'),
            'id_usuario_gestion' => Auth::id() ?? 1,
            'mensaje' => trim($request->input('mensaje')),
            'fecha_programada' => $request->input('fecha_programada'),
            'estado' => 'PENDIENTE',
            'intentos' => 0,
        ]);

        AuditoriaService::registrar(
            'P6_NOTIFICACIONES',
            'CREAR',
            'notificacion',
            $notificacion->id_notificacion,
            "Recordatorio de cita programado para el [{$notificacion->fecha_programada}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Recordatorio de cita registrado.',
            'notificacion' => $notificacion,
        ], 201);
    }

    /**
     * Registrar resultado de llamada o envío de recordatorio
     */
    public function registrarGestion(Request $request, int $id): JsonResponse
    {
        $notificacion = Notificacion::find($id);

        if (!$notificacion) {
            return response()->json([
                'success' => false,
                'message' => 'Notificación no encontrada.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'estado' => 'required|string|in:ENVIADA,FALLIDA',
            'observacion' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $notificacion->increment('intentos');
        $notificacion->update([
            'id_usuario_gestion' => Auth::id() ?? 1,
            'estado' => $request->input('estado'),
            'fecha_envio' => now(),
        ]);

        AuditoriaService::registrar(
            'P6_NOTIFICACIONES',
            'MODIFICAR',
            'notificacion',
            $notificacion->id_notificacion,
            "Gestión de recordatorio actualizada a [{$notificacion->estado}] en el intento [{$notificacion->intentos}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Resultado de recordatorio registrado exitosamente.',
            'notificacion' => $notificacion,
        ]);
    }
}
