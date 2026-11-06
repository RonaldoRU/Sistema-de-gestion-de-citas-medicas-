<?php

namespace App\Http\Controllers;

use App\Models\Permiso;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PermisoController extends Controller
{
    /**
     * Obtiene el catálogo completo de permisos del sistema ordenados por módulo.
     */
    public function index(): JsonResponse
    {
        $permisos = Permiso::orderBy('modulo', 'asc')->get();

        return response()->json([
            'success' => true,
            'total' => $permisos->count(),
            'data' => $permisos,
        ]);
    }

    /**
     * Muestra el detalle de un permiso específico junto con los roles que lo tienen asignado.
     */
    public function show(int $id): JsonResponse
    {
        $permiso = Permiso::with('roles')->find($id);

        if (! $permiso) {
            return response()->json([
                'success' => false,
                'message' => 'Permiso no encontrado.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'permiso' => $permiso,
        ]);
    }

    /**
     * Registra un nuevo permiso de acceso asociado a un módulo y ruta de menú.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:80|unique:permiso,nombre',
            'modulo' => 'required|string|max:60',
            'ruta_menu' => 'nullable|string|max:150',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $permiso = Permiso::create([
            'nombre' => strtoupper(trim($request->input('nombre'))),
            'modulo' => strtoupper(trim($request->input('modulo'))),
            'ruta_menu' => $request->input('ruta_menu'),
        ]);

        AuditoriaService::registrar(
            'P2_RBAC',
            'REGISTRAR',
            'permiso',
            $permiso->id_permiso,
            "Se creó el permiso [{$permiso->nombre}] para el módulo [{$permiso->modulo}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Permiso creado exitosamente.',
            'permiso' => $permiso,
        ], 201);
    }
}
