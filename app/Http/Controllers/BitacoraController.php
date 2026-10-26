<?php

namespace App\Http\Controllers;

use App\Models\Bitacora;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BitacoraController extends Controller
{
    /**
     * CU11: Consultar y Filtrar Bitácora de Auditoría
     */
    public function index(Request $request): JsonResponse
    {
        $query = Bitacora::with([
            'usuario:id_usuario,id_persona,id_rol,nombre_usuario',
            'usuario.persona:id_persona,ci,nombres,apellidos,email',
            'usuario.rol:id_rol,nombre'
        ]);

        // Filtro por ID de Usuario
        if ($request->filled('id_usuario')) {
            $query->where('id_usuario', $request->input('id_usuario'));
        } elseif ($request->filled('usuario')) {
            $busqueda = trim($request->input('usuario'));
            $query->whereHas('usuario', function ($uq) use ($busqueda) {
                $uq->where('nombre_usuario', 'like', "%{$busqueda}%")
                   ->orWhereHas('persona', function ($pq) use ($busqueda) {
                       $pq->where('ci', 'like', "%{$busqueda}%")
                          ->orWhere('nombres', 'like', "%{$busqueda}%")
                          ->orWhere('apellidos', 'like', "%{$busqueda}%")
                          ->orWhere('email', 'like', "%{$busqueda}%");
                   });
            });
        }

        // Filtro por Módulo (P1 a P7)
        if ($request->filled('modulo')) {
            $query->where('modulo', strtoupper($request->input('modulo')));
        }

        // Filtro por Tipo de Acción
        if ($request->filled('tipo_accion')) {
            $query->where('tipo_accion', strtoupper($request->input('tipo_accion')));
        }

        // Filtro por Rango de Fechas
        if ($request->filled('fecha_desde')) {
            $query->whereDate('fecha_hora', '>=', $request->input('fecha_desde'));
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('fecha_hora', '<=', $request->input('fecha_hasta'));
        }

        // Filtro por Texto en el Detalle (q)
        if ($request->filled('q')) {
            $busqueda = trim($request->input('q'));
            $query->where(function ($sq) use ($busqueda) {
                $sq->where('detalle', 'ilike', "%{$busqueda}%")
                   ->orWhere('modulo', 'ilike', "%{$busqueda}%")
                   ->orWhere('tabla_afectada', 'ilike', "%{$busqueda}%");
            });
        }

        // Orden cronológico inverso (CU11 Paso 2)
        $bitacora = $query->orderBy('fecha_hora', 'desc')
            ->orderBy('id_bitacora', 'desc')
            ->paginate($request->input('per_page', 20));

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
     * Endpoint en vivo para actualización en tiempo real (polling o live feed).
     */
    public function live(Request $request): JsonResponse
    {
        $query = Bitacora::with([
            'usuario:id_usuario,id_persona,id_rol,nombre_usuario',
            'usuario.persona:id_persona,ci,nombres,apellidos,email',
            'usuario.rol:id_rol,nombre'
        ]);

        $afterId = $request->input('after_id') ?? $request->input('last_id');
        if ($afterId && is_numeric($afterId)) {
            $query->where('id_bitacora', '>', (int)$afterId)
                  ->orderBy('id_bitacora', 'desc');
            $nuevos = $query->limit(50)->get();
        } else {
            $query->orderBy('fecha_hora', 'desc')
                  ->orderBy('id_bitacora', 'desc');
            $nuevos = $query->limit($request->input('limit', 20))->get();
        }

        $totalHoy = Bitacora::whereDate('fecha_hora', now()->toDateString())->count();
        $totalMes = Bitacora::whereMonth('fecha_hora', now()->month)
            ->whereYear('fecha_hora', now()->year)->count();
        $alertasHoy = Bitacora::whereDate('fecha_hora', now()->toDateString())
            ->where('tipo_accion', 'BLOQUEO')->count();

        $ultimoRegistro = Bitacora::orderBy('id_bitacora', 'desc')->first();
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
     * Ver detalle de un registro de bitácora
     */
    public function show(int $id): JsonResponse
    {
        $registro = Bitacora::with([
            'usuario.persona',
            'usuario.rol'
        ])->find($id);

        if (!$registro) {
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
     * Resumen estadístico de auditoría (CU10 / CU11)
     */
    public function resumen(): JsonResponse
    {
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
            'usuario.persona:id_persona,ci,nombres,apellidos'
        ])
            ->orderBy('id_bitacora', 'desc')
            ->limit(6)
            ->get();

        $totalHoy = Bitacora::whereDate('fecha_hora', now()->toDateString())->count();
        $totalMes = Bitacora::whereMonth('fecha_hora', now()->month)
            ->whereYear('fecha_hora', now()->year)->count();
        $alertasHoy = Bitacora::whereDate('fecha_hora', now()->toDateString())
            ->where('tipo_accion', 'BLOQUEO')->count();

        $ultimoRegistro = Bitacora::orderBy('id_bitacora', 'desc')->first();
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
