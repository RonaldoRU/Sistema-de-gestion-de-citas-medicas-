<?php

namespace App\Http\Controllers;

use App\Models\Horario;
use App\Models\Medico;
use App\Services\AuditoriaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class HorarioController extends Controller
{
    /**
     * Obtiene todos los horarios de atención configurados para un médico específico.
     */
    public function obtenerHorarios(int $id): JsonResponse
    {
        $medico = Medico::with('horarios')->find($id);

        if (! $medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'medico' => $medico->nombre_completo,
            'horarios' => $medico->horarios()->orderBy('dia_semana')->orderBy('hora_inicio')->get(),
        ]);
    }

    /**
     * Configura o actualiza el horario de atención de un médico y calcula los bloques de disponibilidad.
     */
    public function configurarHorarios(Request $request, int $id): JsonResponse
    {
        $medico = Medico::with('persona')->find($id);

        if (! $medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        $user = Auth::user();
        if ($user && $user->tieneRol('MEDICO', 'MÉDICO')) {
            if ($user->id_persona != $medico->id_persona) {
                return response()->json([
                    'success' => false,
                    'message' => 'Como médico solo puedes configurar tus propios horarios de atención.',
                ], 403);
            }
        }

        if (! $medico->persona || ! $medico->persona->activo) {
            return response()->json([
                'success' => false,
                'message' => 'No se pueden configurar horarios para un médico inactivo.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'dia_semana' => 'nullable|integer|between:1,7',
            'dias_semana' => 'nullable|array',
            'dias_semana.*' => 'integer|between:1,7',
            'hora_inicio' => 'required|date_format:H:i',
            'hora_fin' => 'required|date_format:H:i',
            'duracion_bloque_min' => 'nullable|integer|min:10|max:120',
        ], [
            'dia_semana.between' => 'El día de la semana debe ser un número entre 1 (Lunes) y 7 (Domingo).',
            'hora_inicio.required' => 'La hora de inicio es requerida.',
            'hora_fin.required' => 'La hora de fin es requerida.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $horaInicioStr = $request->input('hora_inicio');
        $horaFinStr = $request->input('hora_fin');
        $duracion = (int) $request->input('duracion_bloque_min', 30);
        $dias = $request->filled('dias_semana')
            ? array_map('intval', (array) $request->input('dias_semana'))
            : [(int) $request->input('dia_semana', 1)];

        if (strtotime($horaInicioStr) >= strtotime($horaFinStr)) {
            return response()->json([
                'success' => false,
                'message' => 'Rango horario inválido: La hora de inicio debe ser estrictamente menor a la hora de finalización.',
            ], 422);
        }

        $diasMap = [1 => 'Lunes', 2 => 'Martes', 3 => 'Miércoles', 4 => 'Jueves', 5 => 'Viernes', 6 => 'Sábado', 7 => 'Domingo'];
        $horario = null;
        $nombresDias = [];

        foreach ($dias as $dSem) {
            $horario = Horario::updateOrCreate(
                [
                    'id_medico' => $medico->id_persona,
                    'dia_semana' => $dSem,
                ],
                [
                    'hora_inicio' => $horaInicioStr,
                    'hora_fin' => $horaFinStr,
                    'duracion_bloque_min' => $duracion,
                    'activo' => true,
                ]
            );
            $nombresDias[] = $diasMap[$dSem] ?? "Día {$dSem}";
        }

        $bloques = [];
        $actual = Carbon::createFromFormat('H:i', $horaInicioStr);
        $fin = Carbon::createFromFormat('H:i', $horaFinStr);

        while ($actual->copy()->addMinutes($duracion)->lte($fin)) {
            $siguiente = $actual->copy()->addMinutes($duracion);
            $bloques[] = [
                'hora_inicio' => $actual->format('H:i'),
                'hora_fin' => $siguiente->format('H:i'),
                'duracion' => "{$duracion} min",
            ];
            $actual = $siguiente;
        }

        $nombreDia = implode(', ', $nombresDias);

        AuditoriaService::registrar(
            'Gestión Médica y Horarios',
            'CREAR',
            'horario',
            $horario->id_horario,
            "Horario configurado para el Dr(a). [{$medico->nombre_completo}] el día [{$nombreDia}] de [{$horaInicioStr}] a [{$horaFinStr}]."
        );

        return response()->json([
            'success' => true,
            'message' => "Grilla de horario configurada para el día {$nombreDia}.",
            'horario' => $horario,
            'total_bloques' => count($bloques),
            'bloques_generados' => $bloques,
        ]);
    }

    /**
     * Elimina un horario configurado de un médico específico.
     */
    public function eliminarHorario(int $id, int $horarioId): JsonResponse
    {
        $medico = Medico::with('persona')->find($id);

        if (! $medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        $user = Auth::user();
        if ($user && $user->tieneRol('MEDICO', 'MÉDICO')) {
            if ($user->id_persona != $medico->id_persona) {
                return response()->json([
                    'success' => false,
                    'message' => 'Como médico solo puedes eliminar tus propios horarios de atención.',
                ], 403);
            }
        }

        $horario = Horario::where('id_medico', $medico->id_persona)->where('id_horario', $horarioId)->first();

        if (! $horario) {
            return response()->json([
                'success' => false,
                'message' => 'Horario no encontrado para este médico.',
            ], 404);
        }

        $diasMap = [1 => 'Lunes', 2 => 'Martes', 3 => 'Miércoles', 4 => 'Jueves', 5 => 'Viernes', 6 => 'Sábado', 7 => 'Domingo'];
        $diaNombre = $diasMap[$horario->dia_semana] ?? "Día {$horario->dia_semana}";

        $horario->delete();

        AuditoriaService::registrar(
            'Gestión Médica y Horarios',
            'ELIMINAR',
            'horario',
            $horarioId,
            "Horario eliminado para el Dr(a). [{$medico->nombre_completo}] día [{$diaNombre}]."
        );

        return response()->json([
            'success' => true,
            'message' => "Horario del día {$diaNombre} eliminado exitosamente.",
        ]);
    }
}
