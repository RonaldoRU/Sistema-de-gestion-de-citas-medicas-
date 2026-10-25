<?php

namespace App\Http\Controllers;

use App\Models\Cita;
use App\Models\Persona;
use App\Models\PersonalAdministrativo;
use App\Models\Rol;
use App\Models\Sesion;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class UsuarioController extends Controller
{
    /**
     * CU06: Consultar Catálogo y Perfil de Usuarios
     */
    public function index(Request $request): JsonResponse
    {
        $query = Usuario::with(['persona', 'rol']);

        // Filtro por Rol (Nombre o ID)
        if ($request->filled('rol')) {
            $rolParam = $request->input('rol');
            $query->whereHas('rol', function ($q) use ($rolParam) {
                if (is_numeric($rolParam)) {
                    $q->where('id_rol', $rolParam);
                } else {
                    $q->whereRaw('UPPER(nombre) = ?', [strtoupper($rolParam)]);
                }
            });
        }

        // Filtro por Estado
        if ($request->filled('estado')) {
            $query->where('estado', strtoupper($request->input('estado')));
        }

        // Búsqueda por CI, Nombre o Nombre de usuario
        if ($request->filled('buscar')) {
            $buscar = trim($request->input('buscar'));
            $query->where(function ($q) use ($buscar) {
                $q->where('nombre_usuario', 'like', "%{$buscar}%")
                  ->orWhereHas('persona', function ($pq) use ($buscar) {
                      $pq->where('ci', 'like', "%{$buscar}%")
                         ->orWhere('nombres', 'like', "%{$buscar}%")
                         ->orWhere('apellidos', 'like', "%{$buscar}%")
                         ->orWhere('email', 'like', "%{$buscar}%");
                  });
            });
        }

        $usuarios = $query->orderBy('id_usuario', 'desc')->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $usuarios,
        ]);
    }

    /**
     * CU06: Ver Perfil de Usuario Específico
     */
    public function show(int $id): JsonResponse
    {
        $usuario = Usuario::with([
            'persona.medico.especialidades',
            'persona.personalAdministrativo',
            'rol.permisos'
        ])->find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'usuario' => $usuario,
        ]);
    }

    /**
     * CU05: Registrar Nuevo Usuario del Sistema
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ci' => 'required|string|max:20|unique:persona,ci',
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'email' => 'required|email|max:150|unique:persona,email',
            'telefono' => 'nullable|string|max:20',
            'id_rol' => 'required|exists:rol,id_rol',
            'nombre_usuario' => 'nullable|string|max:50|unique:usuario,nombre_usuario',
            'password' => 'required|string|min:6',
            'cargo' => 'nullable|string|max:60',
        ], [
            'ci.unique' => 'La Cédula de Identidad (CI) ya se encuentra registrada en el sistema.',
            'email.unique' => 'El correo electrónico ya pertenece a otra persona registrada.',
            'id_rol.exists' => 'El rol seleccionado no es válido.',
            'nombre_usuario.unique' => 'El nombre de usuario ya está en uso.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación al registrar usuario.',
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

            // 2. Registrar como Personal Administrativo si no es médico
            $rol = Rol::find($request->input('id_rol'));
            if ($rol && strtoupper($rol->nombre) !== 'MEDICO') {
                PersonalAdministrativo::create([
                    'id_persona' => $persona->id_persona,
                    'cargo' => $request->input('cargo', $rol->nombre),
                ]);
            }

            // 3. Generar nombre de usuario si no fue provisto
            $nombreUsuario = $request->input('nombre_usuario');
            if (empty($nombreUsuario)) {
                $nombreLimpio = strtolower(explode(' ', $persona->nombres)[0] . '.' . explode(' ', $persona->apellidos)[0]);
                $baseUsuario = preg_replace('/[^a-z0-9.]/', '', $nombreLimpio);
                $contador = 1;
                $nombreUsuario = $baseUsuario;
                while (Usuario::where('nombre_usuario', $nombreUsuario)->exists()) {
                    $nombreUsuario = $baseUsuario . $contador++;
                }
            }

            // 4. Crear Usuario
            $usuario = Usuario::create([
                'id_persona' => $persona->id_persona,
                'id_rol' => $request->input('id_rol'),
                'nombre_usuario' => trim($nombreUsuario),
                'hash_contrasena' => Hash::make($request->input('password')),
                'estado' => 'ACTIVO',
                'intentos_fallidos' => 0,
            ]);

            $usuario->load(['persona', 'rol']);

            // CU05 Paso 5: Auditar el evento en la bitácora (CU10)
            AuditoriaService::registrar(
                'P2_RBAC',
                'CREAR',
                'usuario',
                $usuario->id_usuario,
                "Se creó el usuario [{$usuario->nombre_usuario}] con CI [{$persona->ci}], correo [{$persona->email}] y rol [{$usuario->rol?->nombre}]."
            );

            return response()->json([
                'success' => true,
                'message' => 'Usuario registrado exitosamente en estado ACTIVO.',
                'usuario' => $usuario,
            ], 201);
        });
    }

    /**
     * CU07: Modificar Datos de Cuenta de Usuario
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $usuario = Usuario::with('persona')->find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        $usuarioAutenticado = Auth::user();

        // Si no es admin y no es su propia cuenta, denegar
        if ($usuarioAutenticado && !$usuarioAutenticado->esAdmin() && $usuarioAutenticado->id_usuario !== $usuario->id_usuario) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene permisos para modificar la cuenta de otro usuario.',
            ], 403);
        }

        $personaId = $usuario->id_persona;

        $validator = Validator::make($request->all(), [
            'ci' => ['nullable', 'string', 'max:20', Rule::unique('persona', 'ci')->ignore($personaId, 'id_persona')],
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'email' => ['required', 'email', 'max:150', Rule::unique('persona', 'email')->ignore($personaId, 'id_persona')],
            'telefono' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6',
        ], [
            'email.unique' => 'El correo electrónico ya pertenece a otra persona registrada.',
            'ci.unique' => 'La Cédula de Identidad ya se encuentra registrada.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Actualizar datos de Persona
        $datosPersona = [
            'nombres' => trim($request->input('nombres')),
            'apellidos' => trim($request->input('apellidos')),
            'email' => trim($request->input('email')),
            'telefono' => $request->input('telefono'),
        ];

        if ($request->filled('ci') && ($usuarioAutenticado?->esAdmin() ?? false)) {
            $datosPersona['ci'] = trim($request->input('ci'));
        }

        $usuario->persona->update($datosPersona);

        $cambioClave = false;
        if ($request->filled('password')) {
            $usuario->update([
                'hash_contrasena' => Hash::make($request->input('password')),
            ]);
            $cambioClave = true;
        }

        // Auditar en bitácora (CU10)
        AuditoriaService::registrar(
            'P2_RBAC',
            'MODIFICAR',
            'usuario',
            $usuario->id_usuario,
            "Datos de cuenta actualizados para el usuario [{$usuario->nombre_usuario}]." . ($cambioClave ? ' Se actualizó la contraseña.' : '')
        );

        return response()->json([
            'success' => true,
            'message' => 'Datos de cuenta actualizados exitosamente.',
            'usuario' => $usuario->fresh(['persona', 'rol']),
        ]);
    }

    /**
     * CU08: Cambiar Rol Operativo y Permisos (RBAC)
     */
    public function cambiarRol(Request $request, int $id): JsonResponse
    {
        $usuario = Usuario::with('rol')->find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'id_rol' => 'required|exists:rol,id_rol',
        ], [
            'id_rol.exists' => 'El rol seleccionado no es válido.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $nuevoRolId = (int) $request->input('id_rol');
        $nuevoRol = Rol::find($nuevoRolId);

        // CU08 / A1: Regla de Autoprotección
        $usuarioAutenticado = Auth::user();
        if ($usuarioAutenticado && $usuarioAutenticado->id_usuario === $usuario->id_usuario) {
            if ($usuario->esAdmin() && strtoupper($nuevoRol?->nombre ?? '') !== 'ADMINISTRADOR') {
                return response()->json([
                    'success' => false,
                    'message' => 'Regla de autoprotección: No puede revocar su propio rol de Administrador.',
                ], 422);
            }
        }

        $rolAnterior = $usuario->rol?->nombre ?? 'Sin Rol';
        $usuario->update(['id_rol' => $nuevoRolId]);

        // CU08 Paso 5: Auditar evento crítico en la bitácora (CU10)
        AuditoriaService::registrar(
            'P2_RBAC',
            'CAMBIO_ROL',
            'usuario',
            $usuario->id_usuario,
            "Rol del usuario [{$usuario->nombre_usuario}] cambiado de [{$rolAnterior}] a [{$nuevoRol?->nombre}]."
        );

        return response()->json([
            'success' => true,
            'message' => "Rol operativo actualizado exitosamente a [{$nuevoRol?->nombre}].",
            'usuario' => $usuario->fresh(['persona', 'rol']),
        ]);
    }

    /**
     * CU09: Suspender / Inactivar Cuenta de Usuario (Baja Lógica)
     */
    public function inactivar(int $id): JsonResponse
    {
        $usuario = Usuario::with(['persona.medico', 'rol'])->find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        $usuarioAutenticado = Auth::user();

        // Precondición: No debe ser el propio Administrador en sesión
        if ($usuarioAutenticado && $usuarioAutenticado->id_usuario === $usuario->id_usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Acción denegada: No puede suspender o inactivar su propia cuenta activa.',
            ], 422);
        }

        // CU09 / A1: Regla de Médico con Citas Futuras
        if ($usuario->esMedico() && $usuario->persona?->medico) {
            $medicoId = $usuario->persona->medico->id_persona;
            $citasPendientes = Cita::where('id_medico', $medicoId)
                ->where('fecha', '>=', now()->toDateString())
                ->whereIn('estado', ['PROGRAMADA', 'CONFIRMADA'])
                ->with(['paciente.persona'])
                ->get();

            if ($citasPendientes->isNotEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No es posible inactivar al médico porque registra citas futuras agendadas. Se requiere reprogramarlas o reasignarlas antes de la baja.',
                    'total_citas_pendientes' => $citasPendientes->count(),
                    'citas_pendientes' => $citasPendientes,
                ], 422);
            }
        }

        // CU09 Paso 3: Borrado lógico estado = 'INACTIVO'
        $usuario->update(['estado' => 'INACTIVO']);
        if ($usuario->persona) {
            $usuario->persona->update(['activo' => false]);
        }

        // CU09 Paso 4: Revocar inmediatamente cualquier sesión activa
        Sesion::where('id_usuario', $usuario->id_usuario)->update([
            'activa' => false,
            'fecha_cierre' => now(),
        ]);

        // CU09 Paso 5: Auditar la acción en la bitácora (CU10)
        AuditoriaService::registrar(
            'P2_RBAC',
            'SUSPENDER',
            'usuario',
            $usuario->id_usuario,
            "Cuenta del usuario [{$usuario->nombre_usuario}] dada de baja lógica (estado = INACTIVO). Sesiones revocadas."
        );

        return response()->json([
            'success' => true,
            'message' => 'Cuenta de usuario inactivada correctamente. Acceso al sistema revocado.',
        ]);
    }

    /**
     * Reactivar cuenta de usuario
     */
    public function reactivar(int $id): JsonResponse
    {
        $usuario = Usuario::with('persona')->find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        $usuario->update([
            'estado' => 'ACTIVO',
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
        ]);

        if ($usuario->persona) {
            $usuario->persona->update(['activo' => true]);
        }

        AuditoriaService::registrar(
            'P2_RBAC',
            'REACTIVAR',
            'usuario',
            $usuario->id_usuario,
            "Cuenta del usuario [{$usuario->nombre_usuario}] reactivada a estado ACTIVO."
        );

        return response()->json([
            'success' => true,
            'message' => 'Cuenta de usuario reactivada a estado ACTIVO.',
            'usuario' => $usuario->fresh(['persona', 'rol']),
        ]);
    }
}
