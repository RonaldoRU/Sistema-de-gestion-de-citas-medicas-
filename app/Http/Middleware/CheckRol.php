<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckRol
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado. Por favor inicie sesión.',
            ], 401);
        }

        if ($user->estado !== 'ACTIVO') {
            return response()->json([
                'success' => false,
                'message' => 'Su cuenta no se encuentra activa.',
            ], 403);
        }

        if (!empty($roles) && !$user->tieneRol(...$roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. No posee los permisos requeridos para esta acción.',
                'roles_requeridos' => $roles,
            ], 403);
        }

        return $next($request);
    }
}
