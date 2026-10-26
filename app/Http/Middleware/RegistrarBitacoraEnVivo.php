<?php

namespace App\Http\Middleware;

use App\Services\AuditoriaService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RegistrarBitacoraEnVivo
{
    /**
     * Rutas que no deben ser auditadas automáticamente para evitar bucles o sobrecarga.
     */
    protected array $excluirRutas = [
        'api/bitacora',
        'api/bitacora/resumen',
        'api/bitacora/live',
        'api/bitacora/stream',
        'up',
        '_ignition',
        'sanctum',
    ];

    /**
     * Manejar la petición y registrar auditoría en vivo si es una acción modificadora.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Si ya fue registrada explícitamente en el controlador o servicio, no duplicar
        if ($request->attributes->get('vs_audit_logged')) {
            return $response;
        }

        $path = trim($request->path(), '/');

        // Ignorar rutas excluidas
        foreach ($this->excluirRutas as $excluir) {
            if (str_starts_with($path, $excluir)) {
                return $response;
            }
        }

        $metodo = strtoupper($request->method());

        // Auditar mutaciones (POST, PUT, PATCH, DELETE) o login/logout
        $esMutacion = in_array($metodo, ['POST', 'PUT', 'PATCH', 'DELETE']);
        $esAuth = str_contains($path, 'login') || str_contains($path, 'logout');

        if (!$esMutacion && !$esAuth) {
            return $response;
        }

        // Determinar Módulo
        $modulo = 'GENERAL';
        if (str_contains($path, 'auth')) {
            $modulo = 'P1 SEGURIDAD';
        } elseif (str_contains($path, 'usuario') || str_contains($path, 'role')) {
            $modulo = 'P2 USUARIOS';
        } elseif (str_contains($path, 'bitacora')) {
            $modulo = 'P3 AUDITORIA';
        } elseif (str_contains($path, 'paciente')) {
            $modulo = 'P4 PACIENTES';
        } elseif (str_contains($path, 'medico') || str_contains($path, 'especialidad') || str_contains($path, 'bloqueo')) {
            $modulo = 'P5 MEDICOS Y HORARIOS';
        } elseif (str_contains($path, 'cita')) {
            $modulo = 'P6 CITAS';
        } elseif (str_contains($path, 'reporte')) {
            $modulo = 'P7 REPORTES';
        }

        // Determinar Tipo de Acción
        if (str_contains($path, 'login')) {
            $tipoAccion = 'LOGIN';
        } elseif (str_contains($path, 'logout')) {
            $tipoAccion = 'LOGOUT';
        } elseif (str_contains($path, 'bloque') || str_contains($path, 'inactivar')) {
            $tipoAccion = 'BLOQUEO';
        } elseif ($metodo === 'POST') {
            $tipoAccion = 'CREAR';
        } elseif ($metodo === 'PUT' || $metodo === 'PATCH') {
            $tipoAccion = 'MODIFICAR';
        } elseif ($metodo === 'DELETE') {
            $tipoAccion = 'ELIMINAR';
        } else {
            $tipoAccion = 'MODIFICAR';
        }

        // Determinar Tabla y Registro Afectado
        $tablaAfectada = null;
        if (str_contains($path, 'cita')) {
            $tablaAfectada = 'cita';
        } elseif (str_contains($path, 'paciente')) {
            $tablaAfectada = 'paciente';
        } elseif (str_contains($path, 'usuario')) {
            $tablaAfectada = 'usuario';
        } elseif (str_contains($path, 'medico')) {
            $tablaAfectada = 'medico';
        } elseif (str_contains($path, 'especialidad')) {
            $tablaAfectada = 'especialidad';
        } elseif (str_contains($path, 'rol')) {
            $tablaAfectada = 'rol';
        } elseif (str_contains($path, 'bloqueo')) {
            $tablaAfectada = 'bloqueo_agenda';
        }

        $idRegistro = null;
        // Buscar un ID numérico en la ruta
        $segmentos = explode('/', $path);
        foreach ($segmentos as $seg) {
            if (is_numeric($seg)) {
                $idRegistro = (int) $seg;
                break;
            }
        }

        // Preparar detalle seguro omitiendo campos confidenciales
        $datos = $request->except(['password', 'contrasena', 'hash_contrasena', 'password_confirmation', 'token', '_token']);
        $usuarioNombre = Auth::user() ? (Auth::user()->nombre_usuario ?? 'Usuario #' . Auth::id()) : 'Sistema';
        $status = $response->getStatusCode();

        $detalleTexto = "[{$metodo}] {$path} (HTTP {$status}) por {$usuarioNombre}";
        if (!empty($datos)) {
            $detalleTexto .= ' | Parámetros: ' . json_encode($datos, JSON_UNESCAPED_UNICODE);
        }

        try {
            AuditoriaService::registrar(
                modulo: $modulo,
                tipoAccion: $tipoAccion,
                tablaAfectada: $tablaAfectada,
                idRegistroAfectado: $idRegistro,
                detalle: $detalleTexto,
                idUsuario: Auth::id()
            );
        } catch (\Throwable $e) {
            // Evitar que un error al auditar rompa la respuesta del usuario
            logger()->error('Error al registrar auditoría en vivo en middleware: ' . $e->getMessage());
        }

        return $response;
    }
}
