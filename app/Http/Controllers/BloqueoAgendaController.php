<?php

namespace App\Http\Controllers;

use App\Models\BloqueoAgenda;
use App\Models\Cita;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BloqueoAgendaController extends Controller
{
    /**
     * Lista los bloqueos de agenda registrados permitiendo filtrar por tipo de bloqueo o médico.
     */
    public function index(Request $request): JsonResponse
    {
        $query = BloqueoAgenda::with('medico.persona');

        if ($request->filled('tipo')) {
            $query->where('tipo', strtoupper($request->input('tipo')));
        }

        if ($request->filled('id_medico')) {
            $query->where(function ($q) use ($request): void {
                $q->where('id_medico', $request->input('id_medico'))
                    ->orWhere('aplica_a_todos', true);
            });
        }

        $bloqueos = $query->orderBy('fecha_inicio', 'desc')->get();

        return response()->json([
            'success' => true,
            'total' => $bloqueos->count(),
            'data' => $bloqueos,
        ]);
    }

    /**
     * Registra un bloqueo de agenda por feriado, licencia u otro motivo verificando citas afectadas.
     */
    public function store(Request $request): JsonResponse
    {
        $tipo = strtoupper(trim((string) $request->input('tipo', '')));
        if (! in_array($tipo, ['FERIADO', 'LICENCIA', 'OTRO'])) {
            $tipo = $request->filled('id_medico') ? 'LICENCIA' : 'FERIADO';
        }
        $fechaInicio = $request->input('fecha_inicio');
        $fechaFin = $request->input('fecha_fin') ?: $fechaInicio;
        $motivo = trim((string) ($request->input('motivo') ?: 'Bloqueo de agenda programado'));

        $request->merge([
            'tipo' => $tipo,
            'fecha_fin' => $fechaFin,
            'motivo' => $motivo,
        ]);

        $validator = Validator::make($request->all(), [
            'tipo' => 'required|string|in:FERIADO,LICENCIA,OTRO',
            'fecha_inicio' => 'required|date',
            'fecha_fin' => 'required|date|after_or_equal:fecha_inicio',
            'id_medico' => 'nullable|exists:medico,id_persona',
            'motivo' => 'required|string|max:200',
            'aplica_a_todos' => 'nullable|boolean',
            'confirmar_con_citas_afectadas' => 'nullable|boolean',
        ], [
            'tipo.in' => 'El tipo de bloqueo debe ser FERIADO, LICENCIA u OTRO.',
            'fecha_fin.after_or_equal' => 'La fecha de fin debe ser posterior o igual a la fecha de inicio.',
            'motivo.required' => 'El motivo del bloqueo de agenda es obligatorio.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $medicoId = $request->input('id_medico');
        $aplicaATodos = $request->boolean('aplica_a_todos', empty($medicoId));

        if ($tipo === 'LICENCIA' && ! $medicoId) {
            return response()->json([
                'success' => false,
                'message' => 'Para registrar una LICENCIA médica es obligatorio seleccionar al médico.',
            ], 422);
        }

        $citasQuery = Cita::whereBetween('fecha', [$fechaInicio, $fechaFin])
            ->whereIn('estado', ['PROGRAMADA', 'CONFIRMADA'])
            ->with(['paciente.persona', 'medico.persona']);

        if ($medicoId && ! $aplicaATodos) {
            $citasQuery->where('id_medico', $medicoId);
        }

        $citasAfectadas = $citasQuery->get();

        if ($citasAfectadas->isNotEmpty() && ! $request->boolean('confirmar_con_citas_afectadas')) {
            return response()->json([
                'success' => false,
                'alerta_citas' => true,
                'message' => 'Existen citas agendadas en las fechas seleccionadas que requieren reprogramación.',
                'total_citas_afectadas' => $citasAfectadas->count(),
                'citas_afectadas' => $citasAfectadas,
                'accion_requerida' => 'Reprograme las citas afectadas o envíe confirmar_con_citas_afectadas=true para registrar el bloqueo.',
            ], 409);
        }

        $bloqueo = BloqueoAgenda::create([
            'tipo' => $tipo,
            'fecha_inicio' => $fechaInicio,
            'fecha_fin' => $fechaFin,
            'id_medico' => $medicoId,
            'motivo' => $motivo,
            'aplica_a_todos' => $aplicaATodos,
        ]);

        AuditoriaService::registrar(
            'Gestión Médica y Horarios',
            'CREAR',
            'bloqueo_agenda',
            $bloqueo->id_bloqueo,
            "Bloqueo de agenda [{$tipo}] registrado del [{$fechaInicio}] al [{$fechaFin}]. Motivo: {$motivo}."
        );

        return response()->json([
            'success' => true,
            'message' => 'Bloqueo de agenda médica registrado exitosamente.',
            'bloqueo' => $bloqueo->load('medico.persona'),
            'citas_afectadas' => $citasAfectadas,
        ], 201);
    }

    /**
     * Elimina y levanta un bloqueo de agenda específico por su ID.
     */
    public function destroy(int $id): JsonResponse
    {
        $bloqueo = BloqueoAgenda::find($id);

        if (! $bloqueo) {
            return response()->json([
                'success' => false,
                'message' => 'Bloqueo de agenda no encontrado.',
            ], 404);
        }

        $bloqueo->delete();

        AuditoriaService::registrar(
            'Gestión Médica y Horarios',
            'ELIMINAR',
            'bloqueo_agenda',
            $id,
            "Bloqueo de agenda ID [{$id}] eliminado."
        );

        return response()->json([
            'success' => true,
            'message' => 'Bloqueo de agenda levantado correctamente.',
        ]);
    }
}
