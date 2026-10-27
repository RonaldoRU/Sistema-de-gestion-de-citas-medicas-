<?php

namespace App\Http\Middleware;

use App\Models\Sesion;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateWithTokenOrSession
{
    /**
     * Handle an incoming request.
     * Soporta autenticación por sesión web, header Bearer token, header X-Auth-Token o query string.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            $token = $request->bearerToken() 
                ?: $request->header('X-Auth-Token') 
                ?: $request->query('api_token');

            if ($token) {
                $sesion = Sesion::where('id_sesion', $token)
                    ->where('activa', true)
                    ->first();

                if ($sesion && $sesion->id_usuario) {
                    Auth::loginUsingId($sesion->id_usuario);
                    $sesion->update(['ultima_actividad' => now()]);
                }
            }
        }

        return $next($request);
    }
}
