<?php

namespace App\Http\Controllers;

use App\Models\Permiso;
use App\Models\Rol;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RolController extends Controller
{
    /**
     * Listar Roles con sus Permisos asociados
     */
    public function index(): JsonResponse
    {
        $roles = Rol::with('permisos')->get();

        return response()->json([
            'success' => true,
            'total' => $roles->count(),
            'data' => $roles,
        ]);
    }

    /**
     * Ver un rol con sus permisos y usuarios
     */
    public function show(int $id): JsonResponse
    {
        $rol = Rol::with(['permisos', 'usuarios.persona'])->find($id);

        if (!$rol) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'rol' => $rol,
        ]);
    }

    /**
     * Crear un nuevo Rol
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:50|unique:rol,nombre',
            'descripcion' => 'nullable|string',
            'permisos' => 'nullable|array',
            'permisos.*' => 'exists:permiso,id_permiso',
        ], [
            'nombre.unique' => 'Ya existe un rol con ese nombre.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $rol = Rol::create([
            'nombre' => strtoupper(trim($request->input('nombre'))),
            'descripcion' => $request->input('descripcion'),
        ]);

        if ($request->has('permisos')) {
            $rol->permisos()->sync($request->input('permisos'));
        }

        AuditoriaService::registrar(
            'P2_RBAC',
            'CREAR',
            'rol',
            $rol->id_rol,
            "Se creó el rol [{$rol->nombre}] en la matriz RBAC."
        );

        return response()->json([
            'success' => true,
            'message' => 'Rol creado exitosamente.',
            'rol' => $rol->load('permisos'),
        ], 201);
    }

    /**
     * Asignar permisos a un Rol
     */
    public function sincronizarPermisos(Request $request, int $id): JsonResponse
    {
        $rol = Rol::find($id);

        if (!$rol) {
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

    /**
     * Catálogo de todos los permisos disponibles
     */
    public function permisos(): JsonResponse
    {
        $permisos = Permiso::orderBy('modulo', 'asc')->get();

        return response()->json([
            'success' => true,
            'total' => $permisos->count(),
            'data' => $permisos,
        ]);
    }
}
