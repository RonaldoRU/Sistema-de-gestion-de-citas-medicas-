<?php

namespace App\Http\Controllers;

use App\Models\Persona;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PersonaController extends Controller
{
    /**
     * Lista las personas registradas permitiendo filtrar por CI, nombres, apellidos o correo.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Persona::query();

        if ($request->filled('buscar')) {
            $buscar = trim($request->input('buscar'));
            $query->where(function ($q) use ($buscar): void {
                $q->where('ci', 'like', "%{$buscar}%")
                    ->orWhere('nombres', 'like', "%{$buscar}%")
                    ->orWhere('apellidos', 'like', "%{$buscar}%")
                    ->orWhere('email', 'like', "%{$buscar}%");
            });
        }

        if ($request->filled('activo')) {
            $query->where('activo', filter_var($request->input('activo'), FILTER_VALIDATE_BOOLEAN));
        }

        $personas = $query->orderBy('id_persona', 'desc')->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $personas,
        ]);
    }

    /**
     * Obtiene los datos personales detallados de una persona específica por su ID.
     */
    public function show(int $id): JsonResponse
    {
        $persona = Persona::find($id);

        if (! $persona) {
            return response()->json([
                'success' => false,
                'message' => 'Persona no encontrada.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'persona' => $persona,
        ]);
    }

    /**
     * Registra una nueva persona validando la unicidad de su CI y correo electrónico.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ci' => ['required', 'string', 'max:20', 'regex:/^[0-9]+$/', 'unique:persona,ci'],
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'telefono' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:150|unique:persona,email',
        ], [
            'ci.unique' => 'La Cédula de Identidad (CI) ya se encuentra registrada.',
            'ci.regex' => 'El Carnet de Identidad (CI) debe contener únicamente dígitos numéricos.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $persona = Persona::create([
            'ci' => trim($request->input('ci')),
            'nombres' => trim($request->input('nombres')),
            'apellidos' => trim($request->input('apellidos')),
            'telefono' => $request->input('telefono'),
            'email' => $request->input('email') ? trim($request->input('email')) : null,
            'activo' => true,
        ]);

        AuditoriaService::registrar(
            'P2_USUARIOS',
            'REGISTRAR',
            'persona',
            $persona->id_persona,
            "Se registró la persona [{$persona->nombres} {$persona->apellidos}] con CI [{$persona->ci}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Persona registrada exitosamente.',
            'persona' => $persona,
        ], 201);
    }

    /**
     * Actualiza los datos básicos de identificación y contacto de una persona existente.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $persona = Persona::find($id);

        if (! $persona) {
            return response()->json([
                'success' => false,
                'message' => 'Persona no encontrada.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'ci' => ['required', 'string', 'max:20', 'regex:/^[0-9]+$/', Rule::unique('persona', 'ci')->ignore($persona->id_persona, 'id_persona')],
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'telefono' => 'nullable|string|max:20',
            'email' => ['nullable', 'email', 'max:150', Rule::unique('persona', 'email')->ignore($persona->id_persona, 'id_persona')],
            'activo' => 'nullable|boolean',
        ], [
            'ci.unique' => 'La Cédula de Identidad (CI) ya se encuentra registrada.',
            'ci.regex' => 'El Carnet de Identidad (CI) debe contener únicamente dígitos numéricos.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $persona->update([
            'ci' => trim($request->input('ci')),
            'nombres' => trim($request->input('nombres')),
            'apellidos' => trim($request->input('apellidos')),
            'telefono' => $request->input('telefono'),
            'email' => $request->input('email') ? trim($request->input('email')) : null,
            'activo' => $request->input('activo', $persona->activo),
        ]);

        AuditoriaService::registrar(
            'P2_USUARIOS',
            'MODIFICAR',
            'persona',
            $persona->id_persona,
            "Se modificaron los datos personales de [{$persona->nombres} {$persona->apellidos}] (CI {$persona->ci})."
        );

        return response()->json([
            'success' => true,
            'message' => 'Datos de la persona actualizados correctamente.',
            'persona' => $persona,
        ]);
    }
}
