<?php

namespace App\Http\Controllers;

use App\Models\Medico;
use App\Models\MedicoEspecialidad;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MedicoEspecialidadController extends Controller
{
    /**
     * Obtiene las especialidades médicas asignadas a un médico específico.
     */
    public function index(int $id): JsonResponse
    {
        $asignaciones = MedicoEspecialidad::with('especialidad')->where('id_medico', $id)->get();

        return response()->json([
            'success' => true,
            'total' => $asignaciones->count(),
            'data' => $asignaciones,
        ]);
    }

    /**
     * Sincroniza y actualiza las especialidades médicas asignadas a un médico.
     */
    public function sincronizar(Request $request, int $id): JsonResponse
    {
        $medico = Medico::find($id);

        if (! $medico) {
            return response()->json([
                'success' => false,
                'message' => 'Médico no encontrado.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'especialidades' => 'required|array|min:1',
            'especialidades.*' => 'exists:especialidad,id_especialidad',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $medico->especialidades()->sync($request->input('especialidades'));

        AuditoriaService::registrar(
            'P5_MEDICOS',
            'MODIFICAR',
            'medico_especialidad',
            $medico->id_persona,
            "Especialidades actualizadas para el médico [{$medico->nombre_completo}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Especialidades del médico actualizadas correctamente.',
            'medico' => $medico->load('especialidades'),
        ]);
    }
}
