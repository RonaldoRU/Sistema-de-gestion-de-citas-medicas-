<?php

namespace App\Http\Controllers;

use App\Models\InformacionMedica;
use App\Models\Paciente;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InformacionMedicaController extends Controller
{
    /**
     * Obtiene la ficha de información médica básica asociada a un paciente por su ID.
     */
    public function show(int $id): JsonResponse
    {
        $infoMedica = InformacionMedica::where('id_paciente', $id)->first();

        if (! $infoMedica) {
            return response()->json([
                'success' => false,
                'message' => 'Información médica no encontrada para el paciente.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'informacion_medica' => $infoMedica,
        ]);
    }

    /**
     * Registra o actualiza la información médica básica (tipo de sangre, alergias, antecedentes) de un paciente.
     */
    public function guardarInfoMedica(Request $request, int $id): JsonResponse
    {
        $paciente = Paciente::find($id);

        if (! $paciente) {
            return response()->json([
                'success' => false,
                'message' => 'El paciente especificado no existe.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'tipo_sangre' => 'nullable|string|max:3',
            'alergias' => 'nullable|string',
            'enfermedades_cronicas' => 'nullable|string',
            'medicamentos_habituales' => 'nullable|string',
            'antecedentes_relevantes' => 'nullable|string',
            'observaciones' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $infoMedica = InformacionMedica::updateOrCreate(
            ['id_paciente' => $paciente->id_persona],
            [
                'tipo_sangre' => $request->input('tipo_sangre'),
                'alergias' => $request->input('alergias'),
                'enfermedades_cronicas' => $request->input('enfermedades_cronicas'),
                'medicamentos_habituales' => $request->input('medicamentos_habituales'),
                'antecedentes_relevantes' => $request->input('antecedentes_relevantes'),
                'observaciones' => $request->input('observaciones'),
                'fecha_actualizacion' => now(),
            ]
        );

        AuditoriaService::registrar(
            'P4_PACIENTES',
            'INFO_MEDICA',
            'informacion_medica',
            $infoMedica->id_informacion,
            "Información médica actualizada para el paciente [{$paciente->codigo}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Ficha clínica de referencia médica guardada exitosamente.',
            'informacion_medica' => $infoMedica,
        ]);
    }
}
