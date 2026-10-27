<?php

namespace App\Http\Controllers;

use App\Models\Bitacora;
use App\Models\Persona;
use App\Models\Sesion;
use App\Models\TokenRecuperacion;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * CU01: Iniciar Sesión en la Plataforma Web
     * CU04: Bloqueo Automático por Intentos Fallidos
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

        // Buscar usuario por nombre_usuario o a través de su registro en persona (email o CI)
        $user = Usuario::with(['persona', 'rol'])
            ->where('nombre_usuario', $identificador)
            ->orWhereHas('persona', function ($q) use ($identificador) {
                $q->where('email', $identificador)
                  ->orWhere('ci', $identificador);
            })
            ->first();

        // Si el usuario no existe en la base de datos
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales inválidas. Por favor verifique sus datos.',
            ], 401);
        }

        // CU04 / A2: Verificar si la cuenta se encuentra temporalmente bloqueada
        if ($user->bloqueado_hasta && Carbon::parse($user->bloqueado_hasta)->isFuture()) {
            $segundosRestantes = now()->diffInSeconds(Carbon::parse($user->bloqueado_hasta));
            return response()->json([
                'success' => false,
                'bloqueado' => true,
                'message' => "Cuenta bloqueada por 1 minuto debido a 3 intentos fallidos. Espere {$segundosRestantes} segundos.",
                'bloqueado_hasta' => $user->bloqueado_hasta,
            ], 423);
        }

        // A3: Verificar si la cuenta está Inactiva o Suspendida
        if ($user->estado === 'INACTIVO' || ($user->persona && !$user->persona->activo)) {
            return response()->json([
                'success' => false,
                'message' => 'Cuenta inactiva o suspendida. Por favor consulte con el Administrador.',
            ], 403);
        }

        // CU01 Paso 4: Verificar clave contra hash_contrasena
        if (!Hash::check($password, $user->hash_contrasena)) {
            // A1: Credenciales inválidas -> Sumar intento fallido
            $user->increment('intentos_fallidos');

            // CU04: Al acumular 3 intentos fallidos consecutivos, bloquear por 1 minuto
            if ($user->intentos_fallidos >= 3) {
                $user->update([
                    'estado' => 'BLOQUEADO',
                    'bloqueado_hasta' => now()->addMinute(),
                ]);

                // Registrar alerta de seguridad en la bitácora (CU10)
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

        // CU01 Paso 5: Autenticación exitosa -> restablecer contadores y estado activo
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

            // Registrar en tabla sesion (P1/P2)
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

        // Determinar destino según Rol (CU01 Paso 6)
        $rolNombre = strtoupper($user->rol?->nombre ?? 'USUARIO');
        $redireccion = match ($rolNombre) {
            'ADMINISTRADOR' => '/Frontend/stitch/html/inicio.html',
            'RECEPCIONISTA' => '/Frontend/stitch/html/inicio.html',
            'MEDICO' => '/Frontend/stitch/html/inicio.html',
            default => '/Frontend/stitch/html/inicio.html',
        };

        // CU01 Paso 7: Registrar evento de LOGIN en bitácora de auditoría (CU10)
        AuditoriaService::registrar(
            'P1_SEGURIDAD',
            'LOGIN',
            'usuario',
            $user->id_usuario,
            "Inicio de sesión exitoso. Usuario: [{$user->nombre_usuario}], Rol: [{$rolNombre}]."
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
     * CU02: Cerrar Sesión y Revocar Sesión
     */
    public function logout(Request $request): JsonResponse|RedirectResponse
    {
        $user = Auth::user();

        $ahora = now();
        $sesionModel = null;
        $token = $request->bearerToken() 
            ?: $request->header('X-Auth-Token') 
            ?: $request->query('api_token');

        if ($token) {
            $sesionModel = Sesion::where('id_sesion', $token)->first();
        }
        if (!$sesionModel && $request->hasSession()) {
            $sesionModel = Sesion::where('id_sesion', $request->session()->getId())->first();
        }
        if (!$sesionModel && $user) {
            $sesionModel = Sesion::where('id_usuario', $user->id_usuario)
                ->where('activa', true)
                ->orderByDesc('fecha_inicio')
                ->first();
        }

        if ($sesionModel) {
            $fechaInicio = Carbon::parse($sesionModel->fecha_inicio);
            $sesionModel->update([
                'activa' => false,
                'fecha_cierre' => $ahora,
            ]);
        } else {
            $fechaInicio = $user?->ultimo_acceso ? Carbon::parse($user->ultimo_acceso) : $ahora;
        }

        if ($user) {
            // CU02 Paso 5: Registrar evento LOGOUT en bitácora de auditoría (CU10)
            AuditoriaService::registrar(
                'P1_SEGURIDAD',
                'LOGOUT',
                'usuario',
                $user->id_usuario,
                "Cierre de sesión y revocación exitosa del usuario [{$user->nombre_usuario}] (inicio: {$fechaInicio->format('d/m/Y H:i:s')}, cierre: {$ahora->format('d/m/Y H:i:s')})."
            );
        }

        // CU02 Paso 4: Destruir la sesión activa
        Auth::logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        $duracionTexto = $fechaInicio->diffForHumans($ahora, true);

        $logoutInfo = [
            'usuario' => $user?->nombre_usuario ?? 'scolque',
            'nombres' => $user?->persona?->nombres ?? 'Silvia Irene',
            'apellidos' => $user?->persona?->apellidos ?? 'Colque López',
            'rol' => $user?->rol?->nombre ?? 'Administrador',
            'inicio_sesion' => $fechaInicio->format('d/m/Y H:i:s'),
            'cierre' => $ahora->format('d/m/Y H:i:s'),
            'duracion' => $duracionTexto,
            'ip' => $request->ip() ?: '127.0.0.1',
            'equipo' => 'Terminal activa · ' . ($request->ip() ?: '127.0.0.1'),
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
     * CU02: Resumen en tiempo real del último cierre de sesión (para pantalla cu02-sesion-cerrada.html)
     */
    public function logoutSummary(Request $request): JsonResponse
    {
        $ultimaSesion = Sesion::whereNotNull('fecha_cierre')
            ->orderByDesc('fecha_cierre')
            ->with(['usuario.persona', 'usuario.rol'])
            ->first();

        $ultimoLogoutBitacora = Bitacora::where('tipo_accion', 'LOGOUT')
            ->orderByDesc('id_bitacora')
            ->with(['usuario.persona', 'usuario.rol'])
            ->first();

        $usuario = $ultimaSesion?->usuario 
            ?? $ultimoLogoutBitacora?->usuario 
            ?? (Auth::user() ?: Usuario::with(['persona', 'rol'])->find(1));

        $ahora = now();
        $fechaCierre = $ultimaSesion?->fecha_cierre 
            ? Carbon::parse($ultimaSesion->fecha_cierre) 
            : ($ultimoLogoutBitacora?->fecha_hora ? Carbon::parse($ultimoLogoutBitacora->fecha_hora) : $ahora);

        $fechaInicio = $ultimaSesion?->fecha_inicio 
            ? Carbon::parse($ultimaSesion->fecha_inicio) 
            : ($usuario?->ultimo_acceso ? Carbon::parse($usuario->ultimo_acceso) : $fechaCierre);

        $duracion = $fechaInicio->diffForHumans($fechaCierre, true);

        return response()->json([
            'success' => true,
            'usuario' => $usuario?->nombre_usuario ?? 'scolque',
            'nombres' => $usuario?->persona?->nombres ?? 'Silvia Irene',
            'apellidos' => $usuario?->persona?->apellidos ?? 'Colque López',
            'rol' => $usuario?->rol?->nombre ?? 'Administrador',
            'inicio_sesion' => $fechaInicio->format('d/m/Y H:i:s'),
            'cierre' => $fechaCierre->format('d/m/Y H:i:s'),
            'duracion' => $duracion,
            'ip' => $ultimaSesion?->ip ?: ($ultimoLogoutBitacora?->ip ?: ($request->ip() ?: '127.0.0.1')),
            'equipo' => 'Terminal activa · ' . ($ultimaSesion?->ip ?: ($ultimoLogoutBitacora?->ip ?: ($request->ip() ?: '127.0.0.1'))),
        ]);
    }

    /**
     * CU03: Solicitar Código Temporal para Recuperar Contraseña
     */
    public function solicitarRecuperacion(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'identificador' => 'required|string', // CI, correo electrónico o nombre de usuario
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $identificador = trim($request->input('identificador'));

        // Buscar usuario en base de datos
        $user = Usuario::with('persona')
            ->where('nombre_usuario', $identificador)
            ->orWhereHas('persona', function ($q) use ($identificador) {
                $q->where('email', $identificador)
                  ->orWhere('ci', $identificador);
            })
            ->first();

        // CU03 / A1: Usuario no encontrado -> Respuesta neutra contra ataques de enumeración
        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'Si los datos corresponden a un usuario registrado, se ha generado el código de verificación.',
            ]);
        }

        // Invalidar tokens previos no usados
        TokenRecuperacion::where('id_usuario', $user->id_usuario)
            ->where('usado', false)
            ->update(['usado' => true]);

        // CU03 Paso 3: Generar código de 6 dígitos
        $codigo = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $tokenHash = hash('sha256', $codigo);

        TokenRecuperacion::create([
            'id_usuario' => $user->id_usuario,
            'token_hash' => $tokenHash,
            'fecha_generacion' => now(),
            'fecha_expiracion' => now()->addMinutes(15),
            'usado' => false,
        ]);

        AuditoriaService::registrar(
            'P1_SEGURIDAD',
            'RECUPERACION_SOLICITADA',
            'token_recuperacion',
            $user->id_usuario,
            "Solicitud de restablecimiento de contraseña para usuario [{$user->nombre_usuario}].",
            $user->id_usuario
        );

        return response()->json([
            'success' => true,
            'message' => 'Código de verificación de 6 dígitos generado con éxito (válido por 15 minutos).',
            'codigo_demo' => $codigo, // Código expuesto para pruebas
            'validez_minutos' => 15,
        ]);
    }

    /**
     * CU03: Restablecer Contraseña con Código de Verificación
     */
    public function restablecerContrasena(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'identificador' => 'required|string',
            'codigo' => 'required|string|size:6',
            'password' => 'required|string|min:6|confirmed',
        ], [
            'codigo.size' => 'El código de verificación debe contener exactamente 6 dígitos.',
            'password.confirmed' => 'La confirmación de la contraseña no coincide.',
            'password.min' => 'La contraseña debe tener al menos 6 caracteres.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $identificador = trim($request->input('identificador'));
        $codigoIngresado = trim($request->input('codigo'));
        $tokenHash = hash('sha256', $codigoIngresado);

        $user = Usuario::where('nombre_usuario', $identificador)
            ->orWhereHas('persona', function ($q) use ($identificador) {
                $q->where('email', $identificador)
                  ->orWhere('ci', $identificador);
            })
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        // Buscar token válido
        $registroToken = TokenRecuperacion::where('id_usuario', $user->id_usuario)
            ->where('token_hash', $tokenHash)
            ->where('usado', false)
            ->where('fecha_expiracion', '>', now())
            ->first();

        if (!$registroToken) {
            return response()->json([
                'success' => false,
                'message' => 'Código de verificación inválido o expirado (máximo 15 minutos de vigencia).',
            ], 400);
        }

        // CU03 Paso 5: Actualizar hash_contrasena
        $user->update([
            'hash_contrasena' => Hash::make($request->input('password')),
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
            'estado' => $user->estado === 'BLOQUEADO' ? 'ACTIVO' : $user->estado,
        ]);

        $registroToken->update(['usado' => true]);

        AuditoriaService::registrar(
            'P1_SEGURIDAD',
            'RESTABLECER_CONTRASENA',
            'usuario',
            $user->id_usuario,
            "Contraseña restablecida exitosamente para el usuario [{$user->nombre_usuario}].",
            $user->id_usuario
        );

        return response()->json([
            'success' => true,
            'message' => 'Contraseña actualizada exitosamente. Ya puede iniciar sesión con su nueva clave.',
        ]);
    }

    /**
     * Retorna el perfil del usuario autenticado
     */
    public function me(): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
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
