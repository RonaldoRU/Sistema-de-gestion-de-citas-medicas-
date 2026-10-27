<?php

namespace App\Http\Controllers;

use App\Models\Cita;
use App\Models\Especialidad;
use App\Models\Horario;
use App\Models\Medico;
use App\Models\Persona;
use App\Models\Rol;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class MedicoController extends Controller
{
    /**
     * Consultar Catálogo de Médicos
     */
    public function index(Request $request): JsonResponse
    {
        $query = Medico::with(['persona.usuario', 'especialidades', 'horarios']);

        if ($request->filled('especialidad_id')) {
            $espId = $request->input('especialidad_id');
            $query->whereHas('especialidades', function ($q) use ($espId) {
                $q->where('especialidad.id_especialidad', $espId);
            });
        }

        if ($request->filled('buscar')) {
            $buscar = trim($request->input('buscar'));
            $query->where(function ($q) use ($buscar) {
                $q->where('codigo', 'like', "%{$buscar}%")
                  ->orWhere('matricula', 'like', "%{$buscar}%")
                  ->orWhereHas('persona', function ($pq) use ($buscar) {
                      $pq->where('nombres', 'like', "%{$buscar}%")
                         ->orWhere('apellidos', 'like', "%{$buscar}%")
                         ->orWhere('email', 'like', "%{$buscar}%")
                         ->orWhere('ci', 'like', "%{$buscar}%");
                  });
            });
        }

        $medicos = $query->orderBy('id_persona', 'asc')->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $medicos,
        ]);
    }

    /**
     * Perfil de Médico con sus especialidades y horarios
     */
    public function show(int $id): JsonResponse
    {
        $medico = Medico::with(['persona.usuario', 'especialidades', 'horarios', 'bloqueos'])->find($id);

        if (!$medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'medico' => $medico,
        ]);
    }

    /**
     * CU19: Registrar Personal Médico
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ci' => 'required|string|max:20|unique:persona,ci',
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'matricula' => 'required|string|max:30|unique:medico,matricula',
            'telefono' => 'nullable|string|max:20',
            'email' => 'required|email|max:150|unique:persona,email',
            'especialidades' => 'required|array|min:1',
            'especialidades.*' => 'exists:especialidad,id_especialidad',
            'password' => 'nullable|string|min:6',
        ], [
            'matricula.unique' => 'La matrícula profesional ya pertenece a otro médico registrado.',
            'ci.unique' => 'La Cédula de Identidad ya se encuentra registrada.',
            'email.unique' => 'El correo electrónico ya se encuentra registrado.',
            'especialidades.required' => 'Debe asociar al menos una especialidad médica al profesional.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación al registrar médico.',
                'errors' => $validator->errors(),
            ], 422);
        }

        return DB::transaction(function () use ($request) {
            // 1. Crear Persona base
            $persona = Persona::create([
                'ci' => trim($request->input('ci')),
                'nombres' => trim($request->input('nombres')),
                'apellidos' => trim($request->input('apellidos')),
                'telefono' => $request->input('telefono'),
                'email' => trim($request->input('email')),
                'activo' => true,
            ]);

            // 2. Generar código interno MED-001
            $ultimoId = Medico::max('id_persona') ?? 0;
            $codigoMedico = 'MED-' . str_pad((string) ($ultimoId + 1), 3, '0', STR_PAD_LEFT);

            // 3. Crear Subclase Medico
            $medico = Medico::create([
                'id_persona' => $persona->id_persona,
                'codigo' => $codigoMedico,
                'matricula' => trim($request->input('matricula')),
            ]);

            // 4. Vincular especialidades
            $medico->especialidades()->sync($request->input('especialidades'));

            // 5. Crear Usuario con rol MEDICO
            $rolMedico = Rol::where('nombre', 'MEDICO')->first();
            $nombreUsuario = 'dr.' . strtolower(explode(' ', $persona->apellidos)[0]);
            if (Usuario::where('nombre_usuario', $nombreUsuario)->exists()) {
                $nombreUsuario .= $medico->id_persona;
            }

            Usuario::create([
                'id_persona' => $persona->id_persona,
                'id_rol' => $rolMedico?->id_rol ?? 3,
                'nombre_usuario' => $nombreUsuario,
                'hash_contrasena' => Hash::make($request->input('password', 'Medico123*')),
                'estado' => 'ACTIVO',
                'intentos_fallidos' => 0,
            ]);

            AuditoriaService::registrar(
                'P5_MEDICOS',
                'REGISTRAR',
                'medico',
                $medico->id_persona,
                "Se registró al médico [{$persona->nombre_completo}] con matrícula [{$medico->matricula}] y código [{$medico->codigo}]."
            );

            return response()->json([
                'success' => true,
                'message' => 'Médico registrado exitosamente con especialidades asociadas.',
                'medico' => $medico->load(['persona.usuario', 'especialidades']),
            ], 201);
        });
    }

    /**
     * Modificar datos de médico y especialidades
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $medico = Medico::with('persona')->find($id);

        if (!$medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        $personaId = $medico->id_persona;

        $validator = Validator::make($request->all(), [
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'matricula' => ['required', 'string', 'max:30', Rule::unique('medico', 'matricula')->ignore($personaId, 'id_persona')],
            'telefono' => 'nullable|string|max:20',
            'email' => ['required', 'email', 'max:150', Rule::unique('persona', 'email')->ignore($personaId, 'id_persona')],
            'especialidades' => 'nullable|array',
            'especialidades.*' => 'exists:especialidad,id_especialidad',
        ], [
            'matricula.unique' => 'La matrícula profesional ya se encuentra en uso por otro médico.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $medico->persona->update([
            'nombres' => trim($request->input('nombres')),
            'apellidos' => trim($request->input('apellidos')),
            'email' => trim($request->input('email')),
            'telefono' => $request->input('telefono'),
        ]);

        $medico->update([
            'matricula' => trim($request->input('matricula')),
        ]);

        if ($request->has('especialidades')) {
            $medico->especialidades()->sync($request->input('especialidades'));
        }

        AuditoriaService::registrar(
            'P5_MEDICOS',
            'MODIFICAR',
            'medico',
            $medico->id_persona,
            "Datos y especialidades del médico [{$medico->nombre_completo}] actualizados."
        );

        return response()->json([
            'success' => true,
            'message' => 'Médico actualizado exitosamente.',
            'medico' => $medico->fresh(['persona', 'especialidades']),
        ]);
    }

    /**
     * CU20: Configurar Horarios y Bloques de Disponibilidad
     */
    public function configurarHorarios(Request $request, int $id): JsonResponse
    {
        $medico = Medico::with('persona')->find($id);

        if (!$medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        // Precondición: El médico debe estar activo
        if (!$medico->persona || !$medico->persona->activo) {
            return response()->json([
                'success' => false,
                'message' => 'No se pueden configurar horarios para un médico inactivo.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'dia_semana' => 'required|integer|between:1,7', // 1 = Lunes, ..., 7 = Domingo
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
        $diaSemana = (int) $request->input('dia_semana');

        // CU20 / A1: Rango Horario Inválido
        if (strtotime($horaInicioStr) >= strtotime($horaFinStr)) {
            return response()->json([
                'success' => false,
                'message' => 'Rango horario inválido: La hora de inicio debe ser estrictamente menor a la hora de finalización.',
            ], 422);
        }

        $horario = Horario::updateOrCreate(
            [
                'id_medico' => $medico->id_persona,
                'dia_semana' => $diaSemana,
            ],
            [
                'hora_inicio' => $horaInicioStr,
                'hora_fin' => $horaFinStr,
                'duracion_bloque_min' => $duracion,
                'activo' => true,
            ]
        );

        // Generar grilla de bloques calculados
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

        $diasMap = [1 => 'Lunes', 2 => 'Martes', 3 => 'Miércoles', 4 => 'Jueves', 5 => 'Viernes', 6 => 'Sábado', 7 => 'Domingo'];
        $nombreDia = $diasMap[$diaSemana] ?? "Día {$diaSemana}";

        AuditoriaService::registrar(
            'P5_HORARIOS',
            'CREAR',
            'horario',
            $horario->id_horario,
            "Horario configurado para el Dr. [{$medico->nombre_completo}] el día [{$nombreDia}] de [{$horaInicioStr}] a [{$horaFinStr}]."
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
     * Obtener horarios configurados de un médico
     */
    public function obtenerHorarios(int $id): JsonResponse
    {
        $medico = Medico::with('horarios')->find($id);

        if (!$medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'medico' => $medico->nombre_completo,
            'horarios' => $medico->horarios,
        ]);
    }

    /**
     * CU21: Desactivar Registro de Médico (Baja Lógica)
     */
    public function inactivar(int $id): JsonResponse
    {
        $medico = Medico::with('persona.usuario')->find($id);

        if (!$medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        // CU21 Paso 2 y A1: Verificar si registra citas futuras agendadas
        $citasPendientes = Cita::where('id_medico', $medico->id_persona)
            ->where('fecha', '>=', now()->toDateString())
            ->whereIn('estado', ['PROGRAMADA', 'CONFIRMADA'])
            ->with(['paciente.persona', 'especialidad'])
            ->get();

        if ($citasPendientes->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'El médico registra citas futuras agendadas. Se exige reprogramarlas o reasignarlas antes de procesar la baja médica.',
                'total_citas_pendientes' => $citasPendientes->count(),
                'citas_pendientes' => $citasPendientes,
            ], 422);
        }

        // CU21 Paso 3: Baja lógica en Persona y suspensión en Usuario
        if ($medico->persona) {
            $medico->persona->update(['activo' => false]);
            if ($medico->persona->usuario) {
                $medico->persona->usuario->update(['estado' => 'INACTIVO']);
            }
        }

        AuditoriaService::registrar(
            'P5_MEDICOS',
            'INACTIVAR',
            'medico',
            $medico->id_persona,
            "Inactivación: Médico [{$medico->nombre_completo}] suspendido a estado inactivo."
        );

        return response()->json([
            'success' => true,
            'message' => 'Médico y cuenta de usuario desactivados exitosamente.',
        ]);
    }

    /**
     * Reactivar médico
     */
    public function reactivar(int $id): JsonResponse
    {
        $medico = Medico::with('persona.usuario')->find($id);

        if (!$medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        if ($medico->persona) {
            $medico->persona->update(['activo' => true]);
            if ($medico->persona->usuario) {
                $medico->persona->usuario->update(['estado' => 'ACTIVO']);
            }
        }

        AuditoriaService::registrar(
            'P5_MEDICOS',
            'RENOVAR',
            'medico',
            $medico->id_persona,
            "Renovación: Médico [{$medico->nombre_completo}] reactivado a estado activo."
        );

        return response()->json([
            'success' => true,
            'message' => 'Médico reactivado exitosamente.',
            'medico' => $medico->fresh('persona'),
        ]);
    }
}
