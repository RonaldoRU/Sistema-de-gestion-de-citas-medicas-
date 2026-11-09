<?php

namespace App\Http\Controllers;

use App\Models\Bitacora;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BitacoraController extends Controller
{
    /**
     * Consulta y filtra de forma paginada los registros de la bitácora de auditoría por usuario, módulo, acción y fechas.
     */
    public function index(Request $request): JsonResponse
    {
        if (! Auth::user()?->esAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. La bitácora de auditoría es exclusiva para el rol ADMINISTRADOR.',
            ], 403);
        }

        $query = Bitacora::with([
            'usuario:id_usuario,id_persona,id_rol,nombre_usuario',
            'usuario.persona:id_persona,ci,nombres,apellidos,email',
            'usuario.rol:id_rol,nombre',
        ]);

        if ($request->filled('id_usuario')) {
            $query->where('id_usuario', $request->input('id_usuario'));
        } elseif ($request->filled('usuario')) {
            $busqueda = trim($request->input('usuario'));
            $query->whereHas('usuario', function ($uq) use ($busqueda): void {
                $uq->where('nombre_usuario', 'ilike', "%{$busqueda}%")
                    ->orWhereHas('persona', function ($pq) use ($busqueda): void {
                        $pq->where('ci', 'ilike', "%{$busqueda}%")
                            ->orWhere('nombres', 'ilike', "%{$busqueda}%")
                            ->orWhere('apellidos', 'ilike', "%{$busqueda}%")
                            ->orWhere('email', 'ilike', "%{$busqueda}%");
                    });
            });
        }

        if ($request->filled('modulo')) {
            $mod = strtoupper(trim($request->input('modulo')));
            if (preg_match('/^(P\d+)/i', $mod, $matches)) {
                $prefix = strtoupper($matches[1]);
                $query->where(function ($mq) use ($prefix, $mod): void {
                    $mq->where('modulo', $mod)
                        ->orWhere('modulo', 'like', "{$prefix}%");
                });
            } else {
                $query->where('modulo', 'ilike', "%{$mod}%");
            }
        }

        if ($request->filled('tipo_accion')) {
            $accion = strtoupper(trim($request->input('tipo_accion')));
            if (in_array($accion, ['REGISTRAR', 'CREAR', 'ALTA'])) {
                $query->whereIn('tipo_accion', ['REGISTRAR', 'CREAR']);
            } elseif (in_array($accion, ['RENOVAR', 'REACTIVAR', 'HABILITAR'])) {
                $query->whereIn('tipo_accion', ['RENOVAR', 'REACTIVAR']);
            } elseif (in_array($accion, ['INACTIVAR', 'SUSPENDER', 'BAJA'])) {
                $query->whereIn('tipo_accion', ['INACTIVAR', 'BLOQUEO']);
            } elseif (in_array($accion, ['MODIFICAR', 'CAMBIO_ROL', 'EDITAR', 'UPDATE'])) {
                $query->where('tipo_accion', 'MODIFICAR');
            } else {
                $query->where('tipo_accion', $accion);
            }
        }

        if ($request->filled('fecha_desde')) {
            $query->whereDate('fecha_hora', '>=', $request->input('fecha_desde'));
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('fecha_hora', '<=', $request->input('fecha_hasta'));
        }

        if ($request->filled('q')) {
            $busqueda = trim($request->input('q'));
            $query->where(function ($sq) use ($busqueda): void {
                $sq->where('detalle', 'ilike', "%{$busqueda}%")
                    ->orWhere('descripcion', 'ilike', "%{$busqueda}%")
                    ->orWhere('modulo', 'ilike', "%{$busqueda}%")
                    ->orWhere('tabla_afectada', 'ilike', "%{$busqueda}%");
            });
        }

        $bitacora = $query->orderBy('fecha_hora', 'desc')
            ->orderBy('id_bitacora', 'desc')
            ->paginate($request->input('per_page', 200));

        $totalHoy = Bitacora::whereDate('fecha_hora', now()->toDateString())->count();
        $alertasHoy = Bitacora::whereDate('fecha_hora', now()->toDateString())
            ->where('tipo_accion', 'BLOQUEO')->count();

        return response()->json([
            'success' => true,
            'data' => $bitacora,
            'total_hoy' => $totalHoy,
            'alertas_hoy' => $alertasHoy,
            'filtros_aplicados' => [
                'usuario' => $request->input('usuario'),
                'modulo' => $request->input('modulo'),
                'tipo_accion' => $request->input('tipo_accion'),
                'fecha_desde' => $request->input('fecha_desde'),
                'fecha_hasta' => $request->input('fecha_hasta'),
                'q' => $request->input('q'),
            ],
        ]);
    }

    /**
     * Obtiene los eventos de auditoría más recientes en tiempo real junto con los indicadores clave del día y mes.
     */
    public function live(Request $request): JsonResponse
    {
        if (! Auth::user()?->esAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. La bitácora de auditoría es exclusiva para el rol ADMINISTRADOR.',
            ], 403);
        }

        $query = Bitacora::with([
            'usuario:id_usuario,id_persona,id_rol,nombre_usuario',
            'usuario.persona:id_persona,ci,nombres,apellidos,email',
            'usuario.rol:id_rol,nombre',
        ]);

        $afterId = $request->input('after_id') ?? $request->input('last_id');
        if ($afterId && is_numeric($afterId)) {
            $query->where('id_bitacora', '>', (int) $afterId)
                ->orderBy('fecha_hora', 'desc')
                ->orderBy('id_bitacora', 'desc');
            $nuevos = $query->limit(50)->get();
        } else {
            $query->orderBy('fecha_hora', 'desc')
                ->orderBy('id_bitacora', 'desc');
            $nuevos = $query->limit($request->input('limit', 25))->get();
        }

        $totalHoy = Bitacora::whereDate('fecha_hora', now()->toDateString())->count();
        $totalMes = Bitacora::whereMonth('fecha_hora', now()->month)
            ->whereYear('fecha_hora', now()->year)->count();
        $alertasHoy = Bitacora::whereDate('fecha_hora', now()->toDateString())
            ->where('tipo_accion', 'BLOQUEO')->count();

        $ultimoRegistro = Bitacora::orderBy('fecha_hora', 'desc')->orderBy('id_bitacora', 'desc')->first();
        $segundosDesdeUltimo = $ultimoRegistro ? now()->diffInSeconds($ultimoRegistro->fecha_hora) : 0;

        return response()->json([
            'success' => true,
            'data' => $nuevos,
            'ultimo_id' => $ultimoRegistro?->id_bitacora ?? 0,
            'kpis' => [
                'total_hoy' => $totalHoy,
                'total_mes' => $totalMes,
                'alertas_hoy' => $alertasHoy,
                'ultimo_evento' => $ultimoRegistro?->fecha_hora?->toIso8601String(),
                'segundos_desde_ultimo' => $segundosDesdeUltimo,
                'estado_registro' => 'Activo',
            ],
        ]);
    }

    /**
     * Muestra el detalle completo de un registro específico de la bitácora de auditoría por su ID.
     */
    public function show(int $id): JsonResponse
    {
        if (! Auth::user()?->esAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. La bitácora de auditoría es exclusiva para el rol ADMINISTRADOR.',
            ], 403);
        }

        $registro = Bitacora::with([
            'usuario.persona',
            'usuario.rol',
        ])->find($id);

        if (! $registro) {
            return response()->json([
                'success' => false,
                'message' => 'Registro de auditoría no encontrado.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'registro' => $registro,
        ]);
    }

    /**
     * Calcula y devuelve el resumen estadístico de eventos de auditoría agrupados por módulo y tipo de acción.
     */
    public function resumen(): JsonResponse
    {
        if (! Auth::user()?->esAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. La bitácora de auditoría es exclusiva para el rol ADMINISTRADOR.',
            ], 403);
        }

        $porModulo = Bitacora::selectRaw('modulo, count(*) as total')
            ->groupBy('modulo')
            ->orderByDesc('total')
            ->get();

        $porAccion = Bitacora::selectRaw('tipo_accion, count(*) as total')
            ->groupBy('tipo_accion')
            ->orderByDesc('total')
            ->get();

        $ultimosEventos = Bitacora::with([
            'usuario:id_usuario,id_persona,id_rol,nombre_usuario',
            'usuario.persona:id_persona,ci,nombres,apellidos',
        ])
            ->orderBy('fecha_hora', 'desc')
            ->orderBy('id_bitacora', 'desc')
            ->limit(10)
            ->get();

        $totalHoy = Bitacora::whereDate('fecha_hora', now()->toDateString())->count();
        $totalMes = Bitacora::whereMonth('fecha_hora', now()->month)
            ->whereYear('fecha_hora', now()->year)->count();
        $alertasHoy = Bitacora::whereDate('fecha_hora', now()->toDateString())
            ->where('tipo_accion', 'BLOQUEO')->count();

        $ultimoRegistro = Bitacora::orderBy('fecha_hora', 'desc')->orderBy('id_bitacora', 'desc')->first();
        $segundosDesdeUltimo = $ultimoRegistro ? now()->diffInSeconds($ultimoRegistro->fecha_hora) : 0;

        return response()->json([
            'success' => true,
            'resumen' => [
                'total_hoy' => $totalHoy,
                'total_mes' => $totalMes,
                'alertas_hoy' => $alertasHoy,
                'segundos_desde_ultimo' => $segundosDesdeUltimo,
                'ultimo_id' => $ultimoRegistro?->id_bitacora ?? 0,
                'por_modulo' => $porModulo,
                'por_accion' => $porAccion,
                'ultimos_eventos' => $ultimosEventos,
            ],
        ]);
    }
}
