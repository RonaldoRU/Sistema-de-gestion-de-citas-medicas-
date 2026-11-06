<?php

namespace App\Http\Controllers;

use App\Models\BloqueoAgenda;
use App\Models\Cita;
use App\Models\HistorialEstadoCita;
use App\Models\Horario;
use App\Models\Medico;
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
     * Lista las citas médicas de forma paginada aplicando filtros por paciente, médico, estado o rango de fechas.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Cita::with([
            'paciente.persona',
            'medico.persona',
            'especialidad',
            'usuarioRegistro.persona',
        ]);

        if ($request->filled('id_paciente')) {
            $query->where('id_paciente', $request->input('id_paciente'));
        }

        if ($request->filled('id_medico')) {
            $query->where('id_medico', $request->input('id_medico'));
        }

        if ($request->filled('id_especialidad')) {
            $query->where('id_especialidad', $request->input('id_especialidad'));
        }

        if ($request->filled('buscar')) {
            $buscar = trim($request->input('buscar'));
            $query->where(function ($q) use ($buscar): void {
                $q->where('codigo', 'like', "%{$buscar}%")
                    ->orWhereHas('paciente.persona', function ($pq) use ($buscar): void {
                        $pq->where('ci', 'like', "%{$buscar}%")
                            ->orWhere('nombres', 'like', "%{$buscar}%")
                            ->orWhere('apellidos', 'like', "%{$buscar}%");
                    });
            });
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
     * Consulta el historial completo de citas médicas pertenecientes a un paciente específico.
     */
    public function historialCitas(int $id): JsonResponse
    {
        $paciente = Paciente::with('persona')->find($id);

        if (! $paciente) {
            return response()->json([
                'success' => false,
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $citas = Cita::with([
            'medico.persona',
            'especialidad',
        ])
            ->where('id_paciente', $paciente->id_persona)
            ->orderBy('fecha', 'desc')
            ->orderBy('hora_inicio', 'desc')
            ->get();

        if ($citas->isEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'El paciente no registra citas previas en la clínica.',
                'paciente' => [
                    'id_persona' => $paciente->id_persona,
                    'codigo' => $paciente->codigo,
                    'nombre_completo' => $paciente->nombre_completo,
                ],
                'citas' => [],
            ]);
        }

        return response()->json([
            'success' => true,
            'paciente' => [
                'id_persona' => $paciente->id_persona,
                'codigo' => $paciente->codigo,
                'nombre_completo' => $paciente->nombre_completo,
            ],
            'total_citas' => $citas->count(),
            'citas' => $citas,
        ]);
    }

    /**
     * Agenda una nueva cita médica verificando disponibilidad horaria, estado activo de paciente/médico y ausencia de bloqueos.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'id_paciente' => 'required|exists:paciente,id_persona',
            'id_medico' => 'required|exists:medico,id_persona',
            'id_especialidad' => 'required|exists:especialidad,id_especialidad',
            'fecha' => 'required|date',
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

        if (! $paciente->persona || ! $paciente->persona->activo) {
            return response()->json([
                'success' => false,
                'message' => 'No es posible agendar citas para un paciente inactivo.',
            ], 422);
        }

        if (! $medico->persona || ! $medico->persona->activo) {
            return response()->json([
                'success' => false,
                'message' => 'No es posible agendar citas con un médico inactivo.',
            ], 422);
        }

        $fecha = $request->input('fecha');
        $horaInicio = $request->input('hora_inicio');
        $horaFin = $request->input('hora_fin', Carbon::createFromFormat('H:i', $horaInicio)->addMinutes(30)->format('H:i'));

        $bloqueado = BloqueoAgenda::where('fecha_inicio', '<=', $fecha)
            ->where('fecha_fin', '>=', $fecha)
            ->where(function ($q) use ($medico): void {
                $q->where('aplica_a_todos', true)->orWhere('id_medico', $medico->id_persona);
            })
            ->first();

        if ($bloqueado) {
            return response()->json([
                'success' => false,
                'message' => "La agenda médica se encuentra bloqueada por [{$bloqueado->tipo}]: {$bloqueado->motivo}.",
            ], 422);
        }

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
            $codigoCita = 'CM-'.str_pad((string) ($ultimoId + 1), 4, '0', STR_PAD_LEFT);

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
     * Reprograma la fecha, hora o médico de una cita existente validando que no exista colisión de horario.
     */
    public function reprogramar(Request $request, int $id): JsonResponse
    {
        $cita = Cita::with(['paciente.persona', 'medico.persona'])->find($id);

        if (! $cita) {
            return response()->json([
                'success' => false,
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nueva_fecha' => 'required|date',
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
                'estado' => 'PROGRAMADA',
            ]);

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
     * Cancela una cita médica registrando el motivo de cancelación obligatorio.
     */
    public function cancelar(Request $request, int $id): JsonResponse
    {
        $cita = Cita::find($id);

        if (! $cita) {
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
     * Registra la conclusión de una cita médica como atendida o inasistencia junto con las observaciones clínicas.
     */
    public function registrarAtencion(Request $request, int $id): JsonResponse
    {
        $cita = Cita::find($id);

        if (! $cita) {
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

    /**
     * Consulta los bloques de disponibilidad horaria de 30 minutos de un médico en una fecha específica.
     */
    public function disponibilidad(Request $request): JsonResponse
    {
        $fecha = $request->input('fecha', now()->toDateString());
        $idMedico = $request->input('id_medico');
        $idEspecialidad = $request->input('id_especialidad');

        $medicoQuery = Medico::with(['persona', 'especialidades']);
        if ($idMedico) {
            $medico = $medicoQuery->find($idMedico);
        } elseif ($idEspecialidad) {
            $medico = $medicoQuery->whereHas('especialidades', function ($q) use ($idEspecialidad): void {
                $q->where('especialidad.id_especialidad', $idEspecialidad);
            })->first();
        } else {
            $medico = $medicoQuery->first();
        }

        if (! $medico) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró un médico disponible para los criterios seleccionados.',
            ], 404);
        }

        $diaSemana = Carbon::parse($fecha)->dayOfWeekIso;
        $horario = Horario::where('id_medico', $medico->id_persona)
            ->where('dia_semana', $diaSemana)
            ->where('activo', true)
            ->first() ?? Horario::where('id_medico', $medico->id_persona)->where('activo', true)->first();

        $horaInicioStr = $horario ? substr((string) $horario->hora_inicio, 0, 5) : '08:00';
        $horaFinStr = $horario ? substr((string) $horario->hora_fin, 0, 5) : '12:00';
        $duracion = $horario ? (int) $horario->duracion_bloque_min : 30;

        $bloqueo = BloqueoAgenda::where('fecha_inicio', '<=', $fecha)
            ->where('fecha_fin', '>=', $fecha)
            ->where(function ($q) use ($medico): void {
                $q->where('aplica_a_todos', true)->orWhere('id_medico', $medico->id_persona);
            })
            ->first();

        $citasOcupadas = Cita::where('id_medico', $medico->id_persona)
            ->where('fecha', $fecha)
            ->whereIn('estado', ['PROGRAMADA', 'CONFIRMADA', 'ATENDIDA'])
            ->get()
            ->keyBy(fn ($c) => substr((string) $c->hora_inicio, 0, 5));

        $slots = [];
        $actual = Carbon::createFromFormat('H:i', $horaInicioStr);
        $fin = Carbon::createFromFormat('H:i', $horaFinStr);

        while ($actual->copy()->addMinutes($duracion)->lte($fin)) {
            $hIni = $actual->format('H:i');
            $siguiente = $actual->copy()->addMinutes($duracion);
            $hFin = $siguiente->format('H:i');

            if ($bloqueo) {
                $slots[] = [
                    'hora_inicio' => $hIni,
                    'hora_fin' => $hFin,
                    'estado' => 'BLOQUEADO',
                    'cita_codigo' => null,
                    'motivo' => $bloqueo->motivo,
                ];
            } elseif ($citasOcupadas->has($hIni)) {
                $citaOcup = $citasOcupadas->get($hIni);
                $slots[] = [
                    'hora_inicio' => $hIni,
                    'hora_fin' => $hFin,
                    'estado' => 'OCUPADO',
                    'cita_codigo' => $citaOcup->codigo,
                    'id_cita' => $citaOcup->id_cita,
                ];
            } else {
                $slots[] = [
                    'hora_inicio' => $hIni,
                    'hora_fin' => $hFin,
                    'estado' => 'LIBRE',
                    'cita_codigo' => null,
                ];
            }

            $actual = $siguiente;
        }

        return response()->json([
            'success' => true,
            'fecha' => $fecha,
            'medico' => $medico,
            'bloqueo' => $bloqueo,
            'slots' => $slots,
        ]);
    }

    /**
     * Cambia el estado de una cita médica registrando la transición en su historial y en la bitácora.
     */
    public function cambiarEstado(Request $request, int $id): JsonResponse
    {
        $cita = Cita::with(['paciente.persona', 'medico.persona'])->find($id);

        if (! $cita) {
            return response()->json([
                'success' => false,
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'estado' => 'required|string|in:PROGRAMADA,CONFIRMADA,ATENDIDA,CANCELADA,INASISTENCIA',
            'motivo' => 'nullable|string|max:200',
            'observacion' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $estadoNuevo = strtoupper(trim($request->input('estado')));
        $estadoAnt = $cita->estado;
        $motivo = $request->input('motivo') ?? $request->input('observacion') ?? "Transición de estado {$estadoAnt} a {$estadoNuevo}";

        $datosUpdate = ['estado' => $estadoNuevo];
        if ($estadoNuevo === 'CANCELADA') {
            $datosUpdate['motivo_cancelacion'] = $motivo;
        }
        if (in_array($estadoNuevo, ['ATENDIDA', 'INASISTENCIA'])) {
            $datosUpdate['observacion_atencion'] = $motivo;
            if ($estadoNuevo === 'ATENDIDA') {
                $datosUpdate['fecha_hora_atencion'] = now();
            }
        }

        $cita->update($datosUpdate);

        HistorialEstadoCita::create([
            'id_cita' => $cita->id_cita,
            'id_usuario' => Auth::id() ?? 1,
            'estado_anterior' => $estadoAnt,
            'estado_nuevo' => $estadoNuevo,
            'motivo' => $motivo,
            'fecha_cambio' => now(),
        ]);

        AuditoriaService::registrar(
            'P6_CITAS',
            'CAMBIO_ESTADO_CITA',
            'cita',
            $cita->id_cita,
            "Cita [{$cita->codigo}] cambió de estado [{$estadoAnt}] a [{$estadoNuevo}]. Detalle: {$motivo}."
        );

        return response()->json([
            'success' => true,
            'message' => "Estado de la cita [{$cita->codigo}] actualizado a [{$estadoNuevo}].",
            'cita' => $cita->fresh(['paciente.persona', 'medico.persona', 'especialidad']),
        ]);
    }
}
