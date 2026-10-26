<?php

namespace App\Http\Controllers;

use App\Models\Especialidad;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class EspecialidadController extends Controller
{
    /**
     * CU18: Consultar Catálogo de Especialidades Médicas
     */
    public function index(Request $request): JsonResponse
    {
        $query = Especialidad::withCount('medicos');

        if ($request->filled('activo')) {
            $query->where('activo', filter_var($request->input('activo'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('buscar')) {
            $buscar = trim($request->input('buscar'));
            $query->where('nombre', 'like', "%{$buscar}%");
        }

        $especialidades = $query->orderBy('nombre', 'asc')->get();

        return response()->json([
            'success' => true,
            'total' => $especialidades->count(),
            'data' => $especialidades,
        ]);
    }

    /**
     * CU18: Crear Nueva Especialidad Médica
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:80|unique:especialidad,nombre',
            'descripcion' => 'nullable|string|max:200',
        ], [
            'nombre.unique' => 'La especialidad médica ya se encuentra registrada en el sistema.',
            'nombre.required' => 'El nombre de la especialidad es obligatorio.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar especialidad: La especialidad ya se encuentra registrada.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $especialidad = Especialidad::create([
            'nombre' => trim($request->input('nombre')),
            'descripcion' => $request->input('descripcion'),
            'activo' => true,
        ]);

        AuditoriaService::registrar(
            'P5_MEDICOS',
            'REGISTRAR',
            'especialidad',
            $especialidad->id_especialidad,
            "Registro de especialidad médica [{$especialidad->nombre}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Especialidad médica registrada exitosamente.',
            'especialidad' => $especialidad,
        ], 201);
    }

    /**
     * CU18: Modificar Especialidad Médica
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $especialidad = Especialidad::find($id);

        if (!$especialidad) {
            return response()->json([
                'success' => false,
                'message' => 'Especialidad médica no encontrada.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nombre' => ['required', 'string', 'max:80', Rule::unique('especialidad', 'nombre')->ignore($especialidad->id_especialidad, 'id_especialidad')],
            'descripcion' => 'nullable|string|max:200',
            'activo' => 'nullable|boolean',
        ], [
            'nombre.unique' => 'Ya existe otra especialidad con este mismo nombre.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $especialidad->update([
            'nombre' => trim($request->input('nombre')),
            'descripcion' => $request->input('descripcion', $especialidad->descripcion),
            'activo' => $request->input('activo', $especialidad->activo),
        ]);

        AuditoriaService::registrar(
            'P5_MEDICOS',
            'MODIFICAR',
            'especialidad',
            $especialidad->id_especialidad,
            "Especialidad médica [{$especialidad->nombre}] modificada exitosamente."
        );

        return response()->json([
            'success' => true,
            'message' => 'Especialidad médica actualizada correctamente.',
            'especialidad' => $especialidad,
        ]);
    }

    /**
     * Desactivar Especialidad
     */
    public function destroy(int $id): JsonResponse
    {
        $especialidad = Especialidad::find($id);

        if (!$especialidad) {
            return response()->json([
                'success' => false,
                'message' => 'Especialidad no encontrada.',
            ], 404);
        }

        $especialidad->update(['activo' => false]);

        AuditoriaService::registrar(
            'P5_MEDICOS',
            'INACTIVAR',
            'especialidad',
            $especialidad->id_especialidad,
            "Especialidad médica [{$especialidad->nombre}] desactivada."
        );

        return response()->json([
            'success' => true,
            'message' => 'Especialidad médica inactivada.',
        ]);
    }
}
