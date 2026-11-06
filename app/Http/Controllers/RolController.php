<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RolController extends Controller
{
    /**
     * Obtiene el listado completo de roles del sistema junto con sus permisos asignados.
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
     * Consulta el detalle de un rol específico junto con sus permisos y usuarios asociados.
     */
    public function show(int $id): JsonResponse
    {
        $rol = Rol::with(['permisos', 'usuarios.persona'])->find($id);

        if (! $rol) {
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
     * Crea un nuevo rol en el sistema validando que su nombre sea único.
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
     * Actualiza el nombre o la descripción de un rol existente.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $rol = Rol::find($id);

        if (! $rol) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nombre' => ['required', 'string', 'max:50', Rule::unique('rol', 'nombre')->ignore($rol->id_rol, 'id_rol')],
            'descripcion' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $rol->update([
            'nombre' => strtoupper(trim($request->input('nombre'))),
            'descripcion' => $request->input('descripcion', $rol->descripcion),
        ]);

        AuditoriaService::registrar(
            'P2_RBAC',
            'MODIFICAR',
            'rol',
            $rol->id_rol,
            "Se actualizó el rol [{$rol->nombre}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Rol actualizado correctamente.',
            'rol' => $rol,
        ]);
    }
}
