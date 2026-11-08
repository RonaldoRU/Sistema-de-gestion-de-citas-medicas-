<?php

namespace App\Http\Controllers;

use App\Models\Cita;
use App\Models\Paciente;
use App\Models\Persona;
use App\Models\Rol;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PacienteController extends Controller
{
    /**
     * Busca y lista pacientes de forma paginada filtrando por CI, nombre, código o estado activo.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Paciente::with(['persona', 'informacionMedica', 'contactosEmergencia']);

        if ($request->filled('buscar')) {
            $buscar = trim($request->input('buscar'));
            $query->where(function ($q) use ($buscar): void {
                $q->where('codigo', 'like', "%{$buscar}%")
                    ->orWhereHas('persona', function ($pq) use ($buscar): void {
                        $pq->where('ci', 'like', "%{$buscar}%")
                            ->orWhere('nombres', 'like', "%{$buscar}%")
                            ->orWhere('apellidos', 'like', "%{$buscar}%")
                            ->orWhere('email', 'like', "%{$buscar}%");
                    });
            });
        }

        if ($request->filled('activo')) {
            $activo = filter_var($request->input('activo'), FILTER_VALIDATE_BOOLEAN);
            $query->whereHas('persona', function ($pq) use ($activo): void {
                $pq->where('activo', $activo);
            });
        }

        $pacientes = $query->orderBy('id_persona', 'desc')->paginate($request->input('per_page', 15));

        if ($request->filled('buscar') && $pacientes->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontraron registros de pacientes que coincidan con la búsqueda.',
                'sugerencia' => 'Puede proceder a registrar un nuevo paciente en la plataforma.',
                'data' => $pacientes,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $pacientes,
        ]);
    }

    /**
     * Obtiene el expediente completo de un paciente específico por su ID.
     */
    public function show(int $id): JsonResponse
    {
        $user = Auth::user();
        if ($user && $user->tieneRol('PACIENTE') && $user->id_persona != $id) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. Solo puedes consultar tu propio perfil de paciente.',
            ], 403);
        }

        $paciente = Paciente::with([
            'persona',
            'informacionMedica',
            'contactosEmergencia',
            'citas.medico.persona',
            'citas.especialidad',
        ])->find($id);

        if (! $paciente) {
            return response()->json([
                'success' => false,
                'message' => 'Paciente no encontrado en el sistema.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'paciente' => $paciente,
        ]);
    }

    /**
     * Registra un nuevo paciente junto con sus datos de persona y código correlativo PAC-XXXX.
     */
    public function store(Request $request): JsonResponse
    {
        $sexo = strtoupper(trim((string) $request->input('sexo', 'M')));
        if (! in_array($sexo, ['M', 'F'])) {
            $sexo = 'M';
        }
        $email = trim((string) $request->input('email'));
        $request->merge([
            'sexo' => $sexo,
            'email' => $email === '' ? null : $email,
        ]);

        $validator = Validator::make($request->all(), [
            'ci' => 'required|string|max:20|unique:persona,ci',
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'sexo' => 'required|string|in:M,F',
            'fecha_nacimiento' => 'required|date',
            'telefono' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:150|unique:persona,email',
            'direccion' => 'nullable|string|max:200',
        ], [
            'ci.unique' => 'La Cédula de Identidad (CI) ya pertenece a otra persona registrada.',
            'ci.required' => 'La Cédula de Identidad (CI) es obligatoria.',
            'sexo.in' => 'El sexo debe ser M o F.',
            'fecha_nacimiento.required' => 'La fecha de nacimiento es obligatoria.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación al registrar paciente.',
                'errors' => $validator->errors(),
            ], 422);
        }

        return DB::transaction(function () use ($request) {
            $persona = Persona::create([
                'ci' => trim($request->input('ci')),
                'nombres' => trim($request->input('nombres')),
                'apellidos' => trim($request->input('apellidos')),
                'telefono' => $request->input('telefono'),
                'email' => $request->input('email'),
                'activo' => true,
            ]);

            $ultimoId = Paciente::max('id_persona') ?? 0;
            $codigoCorrelativo = 'PAC-'.str_pad((string) ($ultimoId + 1), 4, '0', STR_PAD_LEFT);

            $paciente = Paciente::create([
                'id_persona' => $persona->id_persona,
                'codigo' => $codigoCorrelativo,
                'sexo' => strtoupper($request->input('sexo')),
                'fecha_nacimiento' => $request->input('fecha_nacimiento'),
                'direccion' => $request->input('direccion'),
            ]);

            AuditoriaService::registrar(
                'Gestión de Pacientes',
                'REGISTRAR',
                'paciente',
                $paciente->id_persona,
                "Se registró al paciente [{$persona->nombre_completo}] con CI [{$persona->ci}] y código [{$paciente->codigo}]."
            );

            return response()->json([
                'success' => true,
                'message' => 'Paciente registrado exitosamente.',
                'paciente' => $paciente->load('persona'),
            ], 201);
        });
    }

    /**
     * Modifica los datos personales y demográficos de un paciente existente.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $paciente = Paciente::with('persona')->find($id);

        if (! $paciente) {
            return response()->json([
                'success' => false,
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $personaId = $paciente->id_persona;
        $personaActual = $paciente->persona;

        $ci = $request->filled('ci') ? trim($request->input('ci')) : $personaActual->ci;
        $nombres = $request->filled('nombres') ? trim($request->input('nombres')) : $personaActual->nombres;
        $apellidos = $request->filled('apellidos') ? trim($request->input('apellidos')) : $personaActual->apellidos;
        $sexo = $request->filled('sexo') ? strtoupper(trim($request->input('sexo'))) : $paciente->sexo;
        if (! in_array($sexo, ['M', 'F'])) {
            $sexo = $paciente->sexo ?: 'M';
        }
        $fechaNacimiento = $request->filled('fecha_nacimiento') ? $request->input('fecha_nacimiento') : $paciente->fecha_nacimiento;
        $email = $request->has('email') ? (trim((string) $request->input('email')) ?: null) : $personaActual->email;

        $request->merge([
            'ci' => $ci,
            'nombres' => $nombres,
            'apellidos' => $apellidos,
            'sexo' => $sexo,
            'fecha_nacimiento' => $fechaNacimiento,
            'email' => $email,
        ]);

        $validator = Validator::make($request->all(), [
            'ci' => ['required', 'string', 'max:20', Rule::unique('persona', 'ci')->ignore($personaId, 'id_persona')],
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'sexo' => 'required|string|in:M,F',
            'fecha_nacimiento' => 'required|date',
            'telefono' => 'nullable|string|max:20',
            'email' => ['nullable', 'email', 'max:150', Rule::unique('persona', 'email')->ignore($personaId, 'id_persona')],
            'direccion' => 'nullable|string|max:200',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $paciente->persona->update([
            'ci' => $ci,
            'nombres' => $nombres,
            'apellidos' => $apellidos,
            'telefono' => $request->input('telefono', $personaActual->telefono),
            'email' => $email,
        ]);

        $paciente->update([
            'sexo' => $sexo,
            'fecha_nacimiento' => $fechaNacimiento,
            'direccion' => $request->input('direccion', $paciente->direccion),
        ]);

        AuditoriaService::registrar(
            'Gestión de Pacientes',
            'MODIFICAR',
            'paciente',
            $paciente->id_persona,
            "Datos personales del paciente [{$paciente->codigo}] actualizados."
        );

        return response()->json([
            'success' => true,
            'message' => 'Datos del paciente actualizados exitosamente.',
            'paciente' => $paciente->fresh(['persona']),
        ]);
    }

    /**
     * Realiza la baja lógica de un paciente verificando que no tenga citas futuras programadas.
     */
    public function inactivar(int $id): JsonResponse
    {
        $paciente = Paciente::with('persona')->find($id);

        if (! $paciente) {
            return response()->json([
                'success' => false,
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $citasFuturas = Cita::where('id_paciente', $paciente->id_persona)
            ->where('fecha', '>=', now()->toDateString())
            ->whereIn('estado', ['PROGRAMADA', 'CONFIRMADA'])
            ->with(['medico.persona', 'especialidad'])
            ->get();

        if ($citasFuturas->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'El paciente registra citas futuras agendadas. Se requiere cancelar o reprogramar las citas antes de procesar la baja.',
                'total_citas_pendientes' => $citasFuturas->count(),
                'citas_pendientes' => $citasFuturas,
            ], 422);
        }

        $paciente->persona->update(['activo' => false]);

        AuditoriaService::registrar(
            'Gestión de Pacientes',
            'INACTIVAR',
            'paciente',
            $paciente->id_persona,
            "Inactivación: Paciente [{$paciente->codigo} - {$paciente->nombre_completo}] dado de baja lógica (activo = false)."
        );

        return response()->json([
            'success' => true,
            'message' => 'Paciente desactivado correctamente (baja lógica). Historial médico y citas conservadas.',
        ]);
    }

    /**
     * Reactiva el registro de un paciente previamente dado de baja lógica.
     */
    public function reactivar(int $id): JsonResponse
    {
        $paciente = Paciente::with('persona')->find($id);

        if (! $paciente) {
            return response()->json([
                'success' => false,
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $paciente->persona->update(['activo' => true]);

        AuditoriaService::registrar(
            'Gestión de Pacientes',
            'RENOVAR',
            'paciente',
            $paciente->id_persona,
            "Renovación: Paciente [{$paciente->codigo} - {$paciente->nombre_completo}] reactivado a estado activo."
        );

        return response()->json([
            'success' => true,
            'message' => 'Paciente reactivado exitosamente a estado activo.',
            'paciente' => $paciente->fresh('persona'),
        ]);
    }

    /**
     * Registra mediante auto-registro web a un nuevo paciente junto con su cuenta de acceso y código PAC-XXXX.
     */
    public function autoRegistroWeb(Request $request): JsonResponse
    {
        $sexo = strtoupper(trim((string) $request->input('sexo', 'M')));
        if (! in_array($sexo, ['M', 'F'])) {
            $sexo = 'M';
        }
        $password = $request->input('password') ?: 'Paciente123*';
        $request->merge([
            'sexo' => $sexo,
            'password' => $password,
        ]);

        $validator = Validator::make($request->all(), [
            'ci' => 'required|string|max:20|unique:persona,ci',
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'sexo' => 'required|string|in:M,F',
            'fecha_nacimiento' => 'required|date',
            'telefono' => 'nullable|string|max:20',
            'email' => 'required|email|max:150|unique:persona,email',
            'direccion' => 'nullable|string|max:200',
            'password' => 'required|string|min:6',
        ], [
            'ci.unique' => 'La Cédula de Identidad (CI) ya se encuentra registrada en el sistema.',
            'email.unique' => 'El correo electrónico ya se encuentra registrado en el sistema.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación en auto-registro de paciente.',
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

            $ultimoId = Paciente::max('id_persona') ?? 0;
            $codigoCorrelativo = 'PAC-'.str_pad((string) ($ultimoId + 1), 4, '0', STR_PAD_LEFT);

            $paciente = Paciente::create([
                'id_persona' => $persona->id_persona,
                'codigo' => $codigoCorrelativo,
                'sexo' => strtoupper($request->input('sexo')),
                'fecha_nacimiento' => $request->input('fecha_nacimiento'),
                'direccion' => $request->input('direccion'),
            ]);

            $rolPaciente = Rol::whereRaw('LOWER(nombre) = ?', ['paciente'])->first()
                ?? Rol::find(4)
                ?? Rol::firstOrCreate(['id_rol' => 4], ['nombre' => 'PACIENTE', 'descripcion' => 'Rol de Paciente para acceso al portal web']);
            $requestedUsername = trim((string) $request->input('nombre_usuario', ''));
            if ($requestedUsername !== '') {
                $baseUser = strtolower(preg_replace('/[^a-z0-9._-]/i', '', $requestedUsername));
            } else {
                $baseUser = strtolower(preg_replace('/[^a-z0-9]/i', '', explode(' ', $persona->nombres)[0]).'.'.preg_replace('/[^a-z0-9]/i', '', explode(' ', $persona->apellidos)[0]));
            }
            $username = $baseUser;
            $c = 1;
            while (Usuario::where('nombre_usuario', $username)->exists()) {
                $username = $baseUser.$c++;
            }

            $usuario = Usuario::create([
                'id_persona' => $persona->id_persona,
                'id_rol' => $rolPaciente?->id_rol ?? 4,
                'nombre_usuario' => $username,
                'hash_contrasena' => Hash::make($request->input('password')),
                'estado' => 'ACTIVO',
                'intentos_fallidos' => 0,
            ]);

            AuditoriaService::registrar(
                'Seguridad y Autenticación',
                'REGISTRAR',
                'paciente',
                $paciente->id_persona,
                "Auto-registro web de paciente [{$persona->nombres} {$persona->apellidos}] (CI {$persona->ci}, código {$paciente->codigo}, usuario {$usuario->nombre_usuario}).",
                $usuario->id_usuario
            );

            $pacienteCargado = $paciente->load('persona');

            return response()->json([
                'success' => true,
                'message' => 'Auto-registro de paciente y cuenta web completado exitosamente.',
                'paciente' => $pacienteCargado,
                'usuario' => $usuario,
                'data' => [
                    'paciente' => [
                        'id_persona' => $paciente->id_persona,
                        'codigo' => $paciente->codigo,
                        'codigo_paciente' => $paciente->codigo,
                    ],
                    'usuario' => $usuario,
                ],
            ], 201);
        });
    }
}
