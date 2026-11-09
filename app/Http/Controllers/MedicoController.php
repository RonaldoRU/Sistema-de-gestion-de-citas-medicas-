<?php

namespace App\Http\Controllers;

use App\Models\Cita;
use App\Models\Medico;
use App\Models\Persona;
use App\Models\Rol;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class MedicoController extends Controller
{
    /**
     * Lista y filtra el catálogo de médicos por especialidad, nombre, matrícula o código.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Medico::with(['persona.usuario', 'especialidades', 'horarios']);

        if ($request->filled('especialidad_id')) {
            $espId = $request->input('especialidad_id');
            $query->whereHas('especialidades', function ($q) use ($espId): void {
                $q->where('especialidad.id_especialidad', $espId);
            });
        }

        if ($request->filled('buscar')) {
            $buscar = trim($request->input('buscar'));
            $query->where(function ($q) use ($buscar): void {
                $q->where('codigo', 'like', "%{$buscar}%")
                    ->orWhere('matricula', 'like', "%{$buscar}%")
                    ->orWhereHas('persona', function ($pq) use ($buscar): void {
                        $pq->where('nombres', 'like', "%{$buscar}%")
                            ->orWhere('apellidos', 'like', "%{$buscar}%")
                            ->orWhere('email', 'like', "%{$buscar}%")
                            ->orWhere('ci', 'like', "%{$buscar}%");
                    });
            });
        }

        $medicos = $query->orderBy('id_persona', 'asc')->paginate($request->input('per_page', 200));

        return response()->json([
            'success' => true,
            'data' => $medicos,
        ]);
    }

    /**
     * Obtiene el perfil detallado de un médico específico junto con sus especialidades y horarios.
     */
    public function show(int $id): JsonResponse
    {
        $medico = Medico::with(['persona.usuario', 'especialidades', 'horarios', 'bloqueos'])->find($id);

        if (! $medico) {
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
     * Registra un nuevo médico asignándole su código correlativo MED-XXX, matrícula y cuenta de usuario.
     */
    public function store(Request $request): JsonResponse
    {
        $matricula = trim((string) ($request->input('matricula') ?: $request->input('matricula_profesional')));
        $especialidades = $request->input('especialidades');
        if (is_numeric($especialidades) || is_string($especialidades)) {
            $especialidades = [intval($especialidades)];
        } elseif (! is_array($especialidades) || empty($especialidades)) {
            $primeraEsp = Especialidad::first();
            $especialidades = $primeraEsp ? [$primeraEsp->id_especialidad] : [1];
        }

        $request->merge([
            'matricula' => $matricula,
            'especialidades' => $especialidades,
        ]);

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
            $persona = Persona::create([
                'ci' => trim($request->input('ci')),
                'nombres' => trim($request->input('nombres')),
                'apellidos' => trim($request->input('apellidos')),
                'telefono' => $request->input('telefono'),
                'email' => trim($request->input('email')),
                'activo' => true,
            ]);

            $ultimoId = Medico::max('id_persona') ?? 0;
            $codigoMedico = 'MED-'.str_pad((string) ($ultimoId + 1), 3, '0', STR_PAD_LEFT);

            $medico = Medico::create([
                'id_persona' => $persona->id_persona,
                'codigo' => $codigoMedico,
                'matricula' => trim($request->input('matricula')),
            ]);

            $medico->especialidades()->sync($request->input('especialidades'));

            $rolMedico = Rol::where('nombre', 'MEDICO')->first();
            $nombreUsuario = 'dr.'.strtolower(explode(' ', $persona->apellidos)[0]);
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
                'Gestión Médica y Horarios',
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
     * Actualiza los datos profesionales y de contacto de un médico existente.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $medico = Medico::with('persona')->find($id);

        if (! $medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        $personaId = $medico->id_persona;
        $personaActual = $medico->persona;

        $nombres = $request->filled('nombres') ? trim($request->input('nombres')) : $personaActual->nombres;
        $apellidos = $request->filled('apellidos') ? trim($request->input('apellidos')) : $personaActual->apellidos;
        $matricula = trim((string) ($request->input('matricula') ?: $request->input('matricula_profesional') ?: $medico->matricula));
        $email = $request->has('email') ? (trim((string) $request->input('email')) ?: null) : $personaActual->email;

        $request->merge([
            'nombres' => $nombres,
            'apellidos' => $apellidos,
            'matricula' => $matricula,
            'email' => $email,
        ]);

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
            'nombres' => $nombres,
            'apellidos' => $apellidos,
            'email' => $email,
            'telefono' => $request->input('telefono', $personaActual->telefono),
        ]);

        $medico->update([
            'matricula' => $matricula,
        ]);

        if ($request->has('especialidades')) {
            $medico->especialidades()->sync($request->input('especialidades'));
        }

        AuditoriaService::registrar(
            'Gestión Médica y Horarios',
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
     * Desactiva lógicamente a un médico verificando que no posea citas futuras pendientes.
     */
    public function inactivar(int $id): JsonResponse
    {
        $medico = Medico::with('persona.usuario')->find($id);

        if (! $medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

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

        if ($medico->persona) {
            $medico->persona->update(['activo' => false]);
            if ($medico->persona->usuario) {
                $medico->persona->usuario->update(['estado' => 'INACTIVO']);
            }
        }

        AuditoriaService::registrar(
            'Gestión Médica y Horarios',
            'INACTIVAR',
            'medico',
            $medico->id_persona,
            "Desactivación lógica: Médico [{$medico->nombre_completo}] (Matrícula: {$medico->matricula}) inactivado por el Administrador."
        );

        return response()->json([
            'success' => true,
            'message' => 'Médico y cuenta de usuario desactivados exitosamente.',
            'medico' => $medico->fresh('persona'),
        ]);
    }

    /**
     * Reactiva el registro y acceso de un médico que se encontraba en estado inactivo.
     */
    public function reactivar(int $id): JsonResponse
    {
        $medico = Medico::with('persona.usuario')->find($id);

        if (! $medico) {
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
            'Gestión Médica y Horarios',
            'REACTIVAR',
            'medico',
            $medico->id_persona,
            "Reactivación: Médico [{$medico->nombre_completo}] (Matrícula: {$medico->matricula}) reactivado a estado ACTIVO por el Administrador."
        );

        return response()->json([
            'success' => true,
            'message' => 'Médico reactivado exitosamente.',
            'medico' => $medico->fresh('persona'),
        ]);
    }
}
