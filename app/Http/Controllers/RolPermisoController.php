<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Models\RolPermiso;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RolPermisoController extends Controller
{
    /**
     * Lista todas las asignaciones de permisos activas para un rol específico.
     */
    public function index(int $id): JsonResponse
    {
        $asignaciones = RolPermiso::with('permiso')->where('id_rol', $id)->get();

        return response()->json([
            'success' => true,
            'total' => $asignaciones->count(),
            'data' => $asignaciones,
        ]);
    }

    /**
     * Sincroniza y actualiza la matriz de permisos asignados a un rol específico.
     */
    public function sincronizarPermisos(Request $request, int $id): JsonResponse
    {
        $rol = Rol::find($id);

        if (! $rol) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'permisos' => 'required|array',
            'permisos.*' => 'exists:permiso,id_permiso',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $rol->permisos()->sync($request->input('permisos'));

        AuditoriaService::registrar(
            'P2_RBAC',
            'MODIFICAR',
            'rol_permiso',
            $rol->id_rol,
            "Permisos actualizados para el rol [{$rol->nombre}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Matriz de permisos actualizada exitosamente para el rol.',
            'rol' => $rol->load('permisos'),
        ]);
    }
}
