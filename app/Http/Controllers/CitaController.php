<?php

namespace App\Http\Controllers;

use App\Models\BloqueoAgenda;
use App\Models\Cita;
use App\Models\HistorialEstadoCita;
use App\Models\Medico;
use App\Models\Notificacion;
use App\Models\Paciente;
use App\Services\AuditoriaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CitaController extends Controller
{
    /**
     * Listar Citas con filtros
     */
    public function index(Request $request): JsonResponse
    {
        $query = Cita::with([
            'paciente.persona',
            'medico.persona',
            'especialidad',
            'usuarioRegistro.persona'
        ]);

        if ($request->filled('id_paciente')) {
            $query->where('id_paciente', $request->input('id_paciente'));
        }

        if ($request->filled('id_medico')) {
            $query->where('id_medico', $request->input('id_medico'));
        }

        if ($request->filled('estado')) {
            $query->where('estado', strtoupper($request->input('estado')));
        }

        if ($request->filled('fecha')) {
            $query->where('fecha', $request->input('fecha'));
        }

        if ($request->filled('fecha_desde')) {
            $query->where('fecha', '>=', $request->input('fecha_desde'));
        }

        if ($request->filled('fecha_hasta')) {
            $query->where('fecha', '<=', $request->input('fecha_hasta'));
        }

        $citas = $query->orderBy('fecha', 'desc')->orderBy('hora_inicio', 'asc')->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $citas,
        ]);
    }

    /**
     * Agendar Cita Médica
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'id_paciente' => 'required|exists:paciente,id_persona',
            'id_medico' => 'required|exists:medico,id_persona',
            'id_especialidad' => 'required|exists:especialidad,id_especialidad',
            'fecha' => 'required|date|after_or_equal:today',
            'hora_inicio' => 'required|date_format:H:i',
            'hora_fin' => 'nullable|date_format:H:i',
            'motivo_consulta' => 'required|string|max:200',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $paciente = Paciente::with('persona')->find($request->input('id_paciente'));
        $medico = Medico::with('persona')->find($request->input('id_medico'));

        if (!$paciente->persona || !$paciente->persona->activo) {
            return response()->json([
                'success' => false,
                'message' => 'No es posible agendar citas para un paciente inactivo.',
            ], 422);
        }

        if (!$medico->persona || !$medico->persona->activo) {
            return response()->json([
                'success' => false,
                'message' => 'No es posible agendar citas con un médico inactivo.',
            ], 422);
        }

        $fecha = $request->input('fecha');
        $horaInicio = $request->input('hora_inicio');
        $horaFin = $request->input('hora_fin', Carbon::createFromFormat('H:i', $horaInicio)->addMinutes(30)->format('H:i'));

        // Validar bloqueo de agenda por feriado o licencia (CU22)
        $bloqueado = BloqueoAgenda::where('fecha_inicio', '<=', $fecha)
            ->where('fecha_fin', '>=', $fecha)
            ->where(function ($q) use ($medico) {
                $q->where('aplica_a_todos', true)->orWhere('id_medico', $medico->id_persona);
            })
            ->first();

        if ($bloqueado) {
            return response()->json([
                'success' => false,
                'message' => "La agenda médica se encuentra bloqueada por [{$bloqueado->tipo}]: {$bloqueado->motivo}.",
            ], 422);
        }

        // Validar colisión de horarios
        $citaExistente = Cita::where('id_medico', $medico->id_persona)
            ->where('fecha', $fecha)
            ->where('hora_inicio', $horaInicio)
            ->whereIn('estado', ['PROGRAMADA', 'CONFIRMADA'])
            ->first();

        if ($citaExistente) {
            return response()->json([
                'success' => false,
                'message' => 'El médico ya tiene una cita asignada en ese mismo horario.',
            ], 422);
        }

        return DB::transaction(function () use ($request, $paciente, $medico, $fecha, $horaInicio, $horaFin) {
            $ultimoId = Cita::max('id_cita') ?? 0;
            $codigoCita = 'CM-' . str_pad((string) ($ultimoId + 1), 4, '0', STR_PAD_LEFT);

            $cita = Cita::create([
                'codigo' => $codigoCita,
                'id_paciente' => $paciente->id_persona,
                'id_medico' => $medico->id_persona,
                'id_especialidad' => $request->input('id_especialidad'),
                'id_usuario_registro' => Auth::id() ?? 1,
                'fecha' => $fecha,
                'hora_inicio' => $horaInicio,
                'hora_fin' => $horaFin,
                'motivo_consulta' => trim($request->input('motivo_consulta')),
                'estado' => 'PROGRAMADA',
            ]);

            // Historial de Estado inicial
            HistorialEstadoCita::create([
                'id_cita' => $cita->id_cita,
                'id_usuario' => Auth::id() ?? 1,
                'estado_anterior' => null,
                'estado_nuevo' => 'PROGRAMADA',
                'motivo' => 'Creación y reserva inicial de cita',
            ]);

            AuditoriaService::registrar(
                'P6_CITAS',
                'REGISTRAR',
                'cita',
                $cita->id_cita,
                "Registro de cita: Cita [{$cita->codigo}] agendada para el paciente [{$paciente->nombre_completo}] con el Dr. [{$medico->nombre_completo}] el [{$fecha} {$horaInicio}]."
            );

            return response()->json([
                'success' => true,
                'message' => 'Cita médica agendada exitosamente.',
                'cita' => $cita->load(['paciente.persona', 'medico.persona', 'especialidad']),
            ], 201);
        });
    }

    /**
     * Reprogramar Cita
     */
    public function reprogramar(Request $request, int $id): JsonResponse
    {
        $cita = Cita::with(['paciente.persona', 'medico.persona'])->find($id);

        if (!$cita) {
            return response()->json([
                'success' => false,
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nueva_fecha' => 'required|date|after_or_equal:today',
            'nueva_hora_inicio' => 'required|date_format:H:i',
            'nueva_hora_fin' => 'nullable|date_format:H:i',
            'nuevo_medico_id' => 'nullable|exists:medico,id_persona',
            'motivo_reprogramacion' => 'required|string|max:200',
        ], [
            'motivo_reprogramacion.required' => 'El motivo de la reprogramación es obligatorio.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $nuevoMedicoId = $request->input('nuevo_medico_id', $cita->id_medico);
        $nuevaFecha = $request->input('nueva_fecha');
        $nuevaHoraInicio = $request->input('nueva_hora_inicio');
        $nuevaHoraFin = $request->input('nueva_hora_fin', Carbon::createFromFormat('H:i', $nuevaHoraInicio)->addMinutes(30)->format('H:i'));

        // Validar colisión
        $colision = Cita::where('id_medico', $nuevoMedicoId)
            ->where('fecha', $nuevaFecha)
            ->where('hora_inicio', $nuevaHoraInicio)
            ->where('id_cita', '!=', $cita->id_cita)
            ->whereIn('estado', ['PROGRAMADA', 'CONFIRMADA'])
            ->first();

        if ($colision) {
            return response()->json([
                'success' => false,
                'message' => 'El médico ya tiene una cita asignada en ese horario.',
            ], 422);
        }

        return DB::transaction(function () use ($request, $cita, $nuevoMedicoId, $nuevaFecha, $nuevaHoraInicio, $nuevaHoraFin) {
            $fechaAnt = $cita->fecha;
            $horaAnt = $cita->hora_inicio;
            $estadoAnt = $cita->estado;

            $cita->update([
                'id_medico' => $nuevoMedicoId,
                'fecha' => $nuevaFecha,
                'hora_inicio' => $nuevaHoraInicio,
                'hora_fin' => $nuevaHoraFin,
                'estado' => 'PROGRAMADA', // o CONFIRMADA
            ]);

            // Registrar en HistorialEstadoCita
            HistorialEstadoCita::create([
                'id_cita' => $cita->id_cita,
                'id_usuario' => Auth::id() ?? 1,
                'estado_anterior' => $estadoAnt,
                'estado_nuevo' => 'PROGRAMADA',
                'fecha_anterior' => $fechaAnt,
                'hora_anterior' => $horaAnt,
                'motivo' => $request->input('motivo_reprogramacion'),
            ]);

            AuditoriaService::registrar(
                'P6_CITAS',
                'MODIFICAR',
                'cita',
                $cita->id_cita,
                "Cita [{$cita->codigo}] reprogramada para el [{$nuevaFecha} {$nuevaHoraInicio}]. Motivo: {$request->input('motivo_reprogramacion')}."
            );

            return response()->json([
                'success' => true,
                'message' => 'Cita reprogramada exitosamente.',
                'cita' => $cita->fresh(['paciente.persona', 'medico.persona', 'especialidad']),
            ]);
        });
    }

    /**
     * Cancelar Cita con Justificación
     */
    public function cancelar(Request $request, int $id): JsonResponse
    {
        $cita = Cita::find($id);

        if (!$cita) {
            return response()->json([
                'success' => false,
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'motivo_cancelacion' => 'required|string|max:200',
        ], [
            'motivo_cancelacion.required' => 'El motivo de cancelación es obligatorio.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $motivo = trim($request->input('motivo_cancelacion'));
        $estadoAnt = $cita->estado;

        $cita->update([
            'estado' => 'CANCELADA',
            'motivo_cancelacion' => $motivo,
        ]);

        HistorialEstadoCita::create([
            'id_cita' => $cita->id_cita,
            'id_usuario' => Auth::id() ?? 1,
            'estado_anterior' => $estadoAnt,
            'estado_nuevo' => 'CANCELADA',
            'motivo' => $motivo,
        ]);

        AuditoriaService::registrar(
            'P6_CITAS',
            'CANCELAR',
            'cita',
            $cita->id_cita,
            "Cita [{$cita->codigo}] cancelada. Motivo: {$motivo}."
        );

        return response()->json([
            'success' => true,
            'message' => 'Cita cancelada correctamente.',
            'cita' => $cita,
        ]);
    }

    /**
     * Registrar Atención Médica / Diagnóstico
     */
    public function registrarAtencion(Request $request, int $id): JsonResponse
    {
        $cita = Cita::find($id);

        if (!$cita) {
            return response()->json([
                'success' => false,
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'estado' => 'required|string|in:ATENDIDA,INASISTENCIA',
            'observacion_atencion' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $estadoNuevo = $request->input('estado');
        $estadoAnt = $cita->estado;

        $cita->update([
            'estado' => $estadoNuevo,
            'observacion_atencion' => $request->input('observacion_atencion'),
            'fecha_hora_atencion' => $estadoNuevo === 'ATENDIDA' ? now() : null,
        ]);

        HistorialEstadoCita::create([
            'id_cita' => $cita->id_cita,
            'id_usuario' => Auth::id() ?? 1,
            'estado_anterior' => $estadoAnt,
            'estado_nuevo' => $estadoNuevo,
            'motivo' => 'Registro de atención médica o inasistencia',
        ]);

        AuditoriaService::registrar(
            'P6_CITAS',
            'MODIFICAR',
            'cita',
            $cita->id_cita,
            "Cita [{$cita->codigo}] concluida con estado [{$estadoNuevo}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Atención de cita registrada correctamente.',
            'cita' => $cita,
        ]);
    }
}
