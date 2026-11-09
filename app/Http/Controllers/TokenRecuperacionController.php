<?php

namespace App\Http\Controllers;

use App\Models\TokenRecuperacion;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use App\Services\EmailNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class TokenRecuperacionController extends Controller
{
    /**
     * Lista los tokens de recuperación de contraseña generados junto con el usuario solicitante.
     */
    public function index(): JsonResponse
    {
        $tokens = TokenRecuperacion::with('usuario.persona')
            ->orderByDesc('fecha_generacion')
            ->limit(25)
            ->get();

        return response()->json([
            'success' => true,
            'total' => $tokens->count(),
            'data' => $tokens,
        ]);
    }

    /**
     * Genera un código temporal de 6 dígitos con vigencia de 15 minutos para recuperar la contraseña.
     */
    public function solicitarRecuperacion(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'identificador' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $identificador = trim($request->input('identificador'));

        $user = Usuario::with('persona')
            ->where('nombre_usuario', $identificador)
            ->orWhereHas('persona', function ($q) use ($identificador): void {
                $q->where('email', $identificador)
                    ->orWhere('ci', $identificador);
            })
            ->first();

        if (! $user) {
            return response()->json([
                'success' => true,
                'message' => 'Si los datos corresponden a un usuario registrado, se ha generado el código de verificación.',
            ]);
        }

        TokenRecuperacion::where('id_usuario', $user->id_usuario)
            ->where('usado', false)
            ->update(['usado' => true]);

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

        EmailNotificationService::enviarCodigoRecuperacion($user, $codigo);

        return response()->json([
            'success' => true,
            'message' => 'Código de verificación de 6 dígitos generado con éxito (válido por 15 minutos).',
            'codigo_demo' => $codigo,
            'validez_minutos' => 15,
        ]);
    }

    /**
     * Valida el código de verificación temporal y restablece la contraseña del usuario.
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
            ->orWhereHas('persona', function ($q) use ($identificador): void {
                $q->where('email', $identificador)
                    ->orWhere('ci', $identificador);
            })
            ->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        $registroToken = TokenRecuperacion::where('id_usuario', $user->id_usuario)
            ->where('token_hash', $tokenHash)
            ->where('usado', false)
            ->where('fecha_expiracion', '>', now())
            ->first();

        if (! $registroToken) {
            return response()->json([
                'success' => false,
                'message' => 'Código de verificación inválido o expirado (máximo 15 minutos de vigencia).',
            ], 400);
        }

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
}
