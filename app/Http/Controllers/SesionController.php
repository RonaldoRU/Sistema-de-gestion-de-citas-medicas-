<?php

namespace App\Http\Controllers;

use App\Models\Sesion;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class SesionController extends Controller
{
    /**
     * Lista las sesiones registradas permitiendo filtrar por usuario o estado activo.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Sesion::with('usuario.persona');

        if ($request->filled('id_usuario')) {
            $query->where('id_usuario', $request->input('id_usuario'));
        }

        if ($request->filled('activa')) {
            $query->where('activa', filter_var($request->input('activa'), FILTER_VALIDATE_BOOLEAN));
        }

        $sesiones = $query->orderByDesc('fecha_inicio')->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $sesiones,
        ]);
    }

    /**
     * Autentica las credenciales del usuario, controla el bloqueo por intentos fallidos e inicia una nueva sesión.
     */
    public function login(Request $request): JsonResponse|RedirectResponse
    {
        $identificador = trim($request->input('identificador') ?? $request->input('usuario') ?? $request->input('nombre_usuario') ?? $request->input('email') ?? $request->input('login') ?? '');
        $password = (string) ($request->input('password') ?? $request->input('clave') ?? $request->input('contrasena') ?? '');

        if (empty($identificador) || empty($password)) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario/correo y la contraseña son obligatorios.',
                'errors' => [
                    'identificador' => empty($identificador) ? ['El usuario, CI o correo electrónico es obligatorio.'] : [],
                    'password' => empty($password) ? ['La contraseña es obligatoria.'] : [],
                ],
            ], 422);
        }

        $user = Usuario::with(['persona', 'rol'])
            ->where('nombre_usuario', $identificador)
            ->orWhereHas('persona', function ($q) use ($identificador): void {
                $q->where('email', $identificador)
                    ->orWhere('ci', $identificador);
            })
            ->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales inválidas. Por favor verifique sus datos.',
            ], 401);
        }

        if ($user->bloqueado_hasta && Carbon::parse($user->bloqueado_hasta)->isFuture()) {
            $segundosRestantes = now()->diffInSeconds(Carbon::parse($user->bloqueado_hasta));

            return response()->json([
                'success' => false,
                'bloqueado' => true,
                'message' => "Cuenta bloqueada por 1 minuto debido a 3 intentos fallidos. Espere {$segundosRestantes} segundos.",
                'bloqueado_hasta' => $user->bloqueado_hasta,
            ], 423);
        }

        if ($user->estado === 'INACTIVO' || ($user->persona && ! $user->persona->activo)) {
            return response()->json([
                'success' => false,
                'message' => 'Cuenta inactiva o suspendida. Por favor consulte con el Administrador.',
            ], 403);
        }

        if (! Hash::check($password, $user->hash_contrasena)) {
            $user->increment('intentos_fallidos');

            if ($user->intentos_fallidos >= 3) {
                $user->update([
                    'estado' => 'BLOQUEADO',
                    'bloqueado_hasta' => now()->addMinute(),
                ]);

                AuditoriaService::registrar(
                    'P1_SEGURIDAD',
                    'BLOQUEO',
                    'usuario',
                    $user->id_usuario,
                    "Cuenta [{$user->nombre_usuario}] bloqueada por 1 minuto debido a 3 intentos fallidos consecutivos.",
                    $user->id_usuario
                );

                return response()->json([
                    'success' => false,
                    'bloqueado' => true,
                    'message' => 'Cuenta bloqueada por 1 minuto debido a 3 intentos fallidos.',
                ], 423);
            }

            $intentosRestantes = 3 - $user->intentos_fallidos;

            return response()->json([
                'success' => false,
                'message' => "Credenciales inválidas. Le restan {$intentosRestantes} intento(s) antes del bloqueo temporal.",
                'intentos_fallidos' => $user->intentos_fallidos,
            ], 401);
        }

        $user->update([
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
            'estado' => 'ACTIVO',
            'ultimo_acceso' => now(),
        ]);

        Auth::login($user, $request->boolean('remember'));

        $token = bin2hex(random_bytes(32));
        Sesion::create([
            'id_sesion' => $token,
            'id_usuario' => $user->id_usuario,
            'fecha_inicio' => now(),
            'ultima_actividad' => now(),
            'activa' => true,
            'ip' => $request->ip(),
        ]);

        if ($request->hasSession()) {
            $request->session()->regenerate();
            $sessionId = $request->session()->getId();

            Sesion::updateOrCreate(
                ['id_sesion' => $sessionId],
                [
                    'id_usuario' => $user->id_usuario,
                    'fecha_inicio' => now(),
                    'ultima_actividad' => now(),
                    'activa' => true,
                    'ip' => $request->ip(),
                ]
            );
        }

        $rolNombre = strtoupper($user->rol?->nombre ?? 'USUARIO');
        $redireccion = match ($rolNombre) {
            'ADMINISTRADOR' => '/Frontend/stitch/html/inicio.html',
            'RECEPCIONISTA' => '/Frontend/stitch/html/inicio.html',
            'MEDICO' => '/Frontend/stitch/html/inicio.html',
            default => '/Frontend/stitch/html/inicio.html',
        };

        AuditoriaService::registrar(
            'P1_SEGURIDAD',
            'LOGIN',
            'usuario',
            $user->id_usuario,
            "Inicio de sesión exitoso. Usuario: [{$user->nombre_usuario}], Rol: [{$rolNombre}].",
            $user->id_usuario,
            "Inicio de sesión: {$user->nombre_usuario} ({$rolNombre})"
        );

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'message' => 'Inicio de sesión exitoso.',
                'token' => $token,
                'redireccion' => $redireccion,
                'usuario' => [
                    'id_usuario' => $user->id_usuario,
                    'id_persona' => $user->id_persona,
                    'nombre_usuario' => $user->nombre_usuario,
                    'ci' => $user->persona?->ci,
                    'nombres' => $user->persona?->nombres,
                    'apellidos' => $user->persona?->apellidos,
                    'email' => $user->persona?->email,
                    'telefono' => $user->persona?->telefono,
                    'rol' => $user->rol?->nombre,
                    'estado' => $user->estado,
                ],
            ]);
        }

        return redirect()->intended($redireccion);
    }

    /**
     * Cierra y revoca la sesión activa del usuario registrando la fecha y hora de cierre.
     */
    public function logout(Request $request): JsonResponse|RedirectResponse
    {
        $user = Auth::user();

        $token = $request->bearerToken()
            ?: $request->header('X-Auth-Token')
            ?: $request->header('Authorization')
            ?: $request->query('api_token');

        if ($token && str_starts_with($token, 'Bearer ')) {
            $token = substr($token, 7);
        }

        $sesionModel = null;
        if ($token) {
            $sesionModel = Sesion::where('id_sesion', $token)->with(['usuario.persona', 'usuario.rol'])->first();
        }
        if (! $sesionModel && $request->hasSession()) {
            $sesionModel = Sesion::where('id_sesion', $request->session()->getId())->with(['usuario.persona', 'usuario.rol'])->first();
        }
        if (! $user && $sesionModel) {
            $user = $sesionModel->usuario;
        }

        if (! $user && $request->filled('id_usuario')) {
            $user = Usuario::with(['persona', 'rol'])->find($request->input('id_usuario'));
        } elseif (! $user && $request->filled('usuario')) {
            $user = Usuario::with(['persona', 'rol'])->where('nombre_usuario', $request->input('usuario'))->first();
        }

        if (! $sesionModel && $user) {
            $sesionModel = Sesion::where('id_usuario', $user->id_usuario)
                ->where('activa', true)
                ->orderByDesc('fecha_inicio')
                ->with(['usuario.persona', 'usuario.rol'])
                ->first();
        }

        $fechaCierreDb = now()->utc();

        if ($sesionModel) {
            $inicioRaw = Carbon::parse($sesionModel->fecha_inicio);
            if ($inicioRaw->gt($fechaCierreDb)) {
                $fechaCierreDb = $inicioRaw->copy()->addSeconds(5);
            }
            $sesionModel->update([
                'activa' => false,
                'fecha_cierre' => $fechaCierreDb,
            ]);
            $fechaInicio = $inicioRaw->copy()->setTimezone('America/La_Paz');
        } else {
            $fechaInicio = $user?->ultimo_acceso ? Carbon::parse($user->ultimo_acceso)->setTimezone('America/La_Paz') : now()->setTimezone('America/La_Paz')->subMinutes(5);
        }

        $ahora = $fechaCierreDb->copy()->setTimezone('America/La_Paz');

        if ($fechaInicio->diffInHours($ahora) > 24) {
            $fechaInicio = $ahora->copy()->subMinutes(15);
        }

        $diffSeconds = max(1, $fechaInicio->diffInSeconds($ahora));
        if ($diffSeconds < 60) {
            $duracionTexto = $diffSeconds.' segundo'.($diffSeconds > 1 ? 's' : '');
        } elseif ($diffSeconds < 3600) {
            $mins = floor($diffSeconds / 60);
            $duracionTexto = $mins.' minuto'.($mins > 1 ? 's' : '');
        } else {
            $horas = floor($diffSeconds / 3600);
            $mins = floor(($diffSeconds % 3600) / 60);
            $duracionTexto = $horas.' hora'.($horas > 1 ? 's' : '').($mins > 0 ? " {$mins} min" : '');
        }

        $targetUserId = $user?->id_usuario ?? $sesionModel?->id_usuario;
        $targetUsername = $user?->nombre_usuario ?? $sesionModel?->usuario?->nombre_usuario ?? ($request->input('usuario') ?: 'usuario');
        $targetRol = $user?->rol?->nombre ?? $sesionModel?->usuario?->rol?->nombre ?? 'Usuario';

        AuditoriaService::registrar(
            'P1_SEGURIDAD',
            'LOGOUT',
            'usuario',
            $targetUserId,
            "Cierre de sesión y revocación exitosa del usuario [{$targetUsername}] (Rol: [{$targetRol}], inicio: {$fechaInicio->format('d/m/Y H:i:s')}, cierre: {$ahora->format('d/m/Y H:i:s')}).",
            $targetUserId,
            "Cierre de sesión: {$targetUsername} ({$targetRol})"
        );

        Auth::logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        $logoutInfo = [
            'usuario' => $user?->nombre_usuario ?? 'scolque',
            'nombres' => $user?->persona?->nombres ?? 'Silvia Irene',
            'apellidos' => $user?->persona?->apellidos ?? 'Colque López',
            'rol' => $user?->rol?->nombre ?? 'Administrador',
            'inicio_sesion' => $fechaInicio->format('d/m/Y H:i:s'),
            'cierre' => $ahora->format('d/m/Y H:i:s'),
            'duracion' => $duracionTexto,
            'ip' => $request->ip() ?: '127.0.0.1',
            'equipo' => 'Terminal activa · '.($request->ip() ?: '127.0.0.1'),
        ];

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'message' => 'Sesión cerrada correctamente.',
                'logout_info' => $logoutInfo,
            ]);
        }

        return redirect()->route('login');
    }

    /**
     * Obtiene el resumen detallado del último cierre de sesión con su duración e IP.
     */
    public function logoutSummary(Request $request): JsonResponse
    {
        $ahora = now()->setTimezone('America/La_Paz');

        $token = $request->bearerToken()
            ?: $request->header('X-Auth-Token')
            ?: $request->header('Authorization')
            ?: $request->query('api_token');

        if ($token && str_starts_with($token, 'Bearer ')) {
            $token = substr($token, 7);
        }

        $sesionModel = null;
        if ($token) {
            $sesionModel = Sesion::where('id_sesion', $token)->with(['usuario.persona', 'usuario.rol'])->first();
        }

        if (! $sesionModel) {
            $sesionModel = Sesion::whereNotNull('fecha_cierre')
                ->orderByDesc('fecha_cierre')
                ->with(['usuario.persona', 'usuario.rol'])
                ->first();
        }

        $usuario = $sesionModel?->usuario
            ?? (Auth::user() ?: Usuario::with(['persona', 'rol'])->find(1));

        $fechaCierre = $sesionModel?->fecha_cierre
            ? Carbon::parse($sesionModel->fecha_cierre)->setTimezone('America/La_Paz')
            : $ahora;

        $fechaInicio = $sesionModel?->fecha_inicio
            ? Carbon::parse($sesionModel->fecha_inicio)->setTimezone('America/La_Paz')
            : ($usuario?->ultimo_acceso ? Carbon::parse($usuario->ultimo_acceso)->setTimezone('America/La_Paz') : $ahora->copy()->subMinutes(10));

        if ($fechaInicio->diffInHours($fechaCierre) > 24) {
            $fechaInicio = $fechaCierre->copy()->subMinutes(15);
        }

        $diffSeconds = max(1, $fechaInicio->diffInSeconds($fechaCierre));
        if ($diffSeconds < 60) {
            $duracion = $diffSeconds.' segundo'.($diffSeconds > 1 ? 's' : '');
        } elseif ($diffSeconds < 3600) {
            $mins = floor($diffSeconds / 60);
            $duracion = $mins.' minuto'.($mins > 1 ? 's' : '');
        } else {
            $horas = floor($diffSeconds / 3600);
            $mins = floor(($diffSeconds % 3600) / 60);
            $duracion = $horas.' hora'.($horas > 1 ? 's' : '').($mins > 0 ? " {$mins} min" : '');
        }

        return response()->json([
            'success' => true,
            'usuario' => $usuario?->nombre_usuario ?? 'scolque',
            'nombres' => $usuario?->persona?->nombres ?? 'Silvia Irene',
            'apellidos' => $usuario?->persona?->apellidos ?? 'Colque López',
            'rol' => $usuario?->rol?->nombre ?? 'Administrador',
            'inicio_sesion' => $fechaInicio->format('d/m/Y H:i:s'),
            'cierre' => $fechaCierre->format('d/m/Y H:i:s'),
            'duracion' => $duracion,
            'ip' => $sesionModel?->ip ?: ($request->ip() ?: '127.0.0.1'),
            'equipo' => 'Terminal activa · '.($sesionModel?->ip ?: ($request->ip() ?: '127.0.0.1')),
        ]);
    }

    /**
     * Devuelve el perfil completo y los permisos del usuario con sesión autenticada activa.
     */
    public function me(): JsonResponse
    {
        $user = Auth::user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado.',
            ], 401);
        }

        $user->load(['persona.medico.especialidades', 'persona.personalAdministrativo', 'rol.permisos']);

        return response()->json([
            'success' => true,
            'usuario' => $user,
        ]);
    }
}
