<?php

namespace App\Http\Controllers;

use App\Models\PersonalAdministrativo;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PersonalAdministrativoController extends Controller
{
    /**
     * Lista todo el personal administrativo registrado junto con sus datos personales.
     */
    public function index(): JsonResponse
    {
        $personal = PersonalAdministrativo::with('persona')->orderBy('id_persona', 'asc')->get();

        return response()->json([
            'success' => true,
            'total' => $personal->count(),
            'data' => $personal,
        ]);
    }

    /**
     * Obtiene el detalle y cargo de un miembro del personal administrativo por su ID de persona.
     */
    public function show(int $id): JsonResponse
    {
        $personal = PersonalAdministrativo::with('persona')->find($id);

        if (! $personal) {
            return response()->json([
                'success' => false,
                'message' => 'Personal administrativo no encontrado.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'personal_administrativo' => $personal,
        ]);
    }

    /**
     * Registra o asigna el cargo administrativo a una persona existente.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'id_persona' => 'required|exists:persona,id_persona',
            'cargo' => 'required|string|max:60',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $personal = PersonalAdministrativo::updateOrCreate(
            ['id_persona' => $request->input('id_persona')],
            ['cargo' => trim($request->input('cargo'))]
        );

        AuditoriaService::registrar(
            'P2_USUARIOS',
            'REGISTRAR',
            'personal_administrativo',
            $personal->id_persona,
            "Se registró o actualizó el cargo administrativo [{$personal->cargo}] para la persona ID [{$personal->id_persona}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Personal administrativo registrado exitosamente.',
            'personal_administrativo' => $personal->load('persona'),
        ], 201);
    }

    /**
     * Modifica el cargo asignado a un miembro del personal administrativo.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $personal = PersonalAdministrativo::find($id);

        if (! $personal) {
            return response()->json([
                'success' => false,
                'message' => 'Personal administrativo no encontrado.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'cargo' => 'required|string|max:60',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $personal->update([
            'cargo' => trim($request->input('cargo')),
        ]);

        AuditoriaService::registrar(
            'P2_USUARIOS',
            'MODIFICAR',
            'personal_administrativo',
            $personal->id_persona,
            "Se modificó el cargo administrativo a [{$personal->cargo}] para la persona ID [{$personal->id_persona}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Cargo administrativo actualizado correctamente.',
            'personal_administrativo' => $personal->load('persona'),
        ]);
    }
}
