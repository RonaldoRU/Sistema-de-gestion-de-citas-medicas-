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

        // Orden cronológico inverso (CU11 Paso 2)
        $bitacora = $query->orderBy('fecha_hora', 'desc')
            ->orderBy('id_bitacora', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $bitacora,
            'filtros_aplicados' => [
                'usuario' => $request->input('usuario'),
                'modulo' => $request->input('modulo'),
                'tipo_accion' => $request->input('tipo_accion'),
                'fecha_desde' => $request->input('fecha_desde'),
                'fecha_hasta' => $request->input('fecha_hasta'),
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
     * Resumen estadístico de auditoría
     */
    public function resumen(): JsonResponse
    {
        $porModulo = Bitacora::selectRaw('modulo, count(*) as total')
            ->groupBy('modulo')
            ->get();

        $porAccion = Bitacora::selectRaw('tipo_accion, count(*) as total')
            ->groupBy('tipo_accion')
            ->get();

        $ultimosEventos = Bitacora::with('usuario.persona')
            ->orderBy('id_bitacora', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'resumen' => [
                'por_modulo' => $porModulo,
                'por_accion' => $porAccion,
                'ultimos_eventos' => $ultimosEventos,
            ],
        ]);
    }
}
