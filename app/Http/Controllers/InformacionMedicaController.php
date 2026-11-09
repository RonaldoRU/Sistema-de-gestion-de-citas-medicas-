<?php

namespace App\Http\Controllers;

use App\Models\InformacionMedica;
use App\Models\Paciente;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InformacionMedicaController extends Controller
{
    /**
     * Obtiene la ficha de información médica básica asociada a un paciente por su ID.
     */
    public function show(int $id): JsonResponse
    {
        $user = Auth::user();
        if ($user && $user->tieneRol('PACIENTE') && $user->id_persona != $id) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. Solo puedes consultar tu propia información médica.',
            ], 403);
        }

        $infoMedica = InformacionMedica::where('id_paciente', $id)->first();

        if (! $infoMedica) {
            return response()->json([
                'success' => true,
                'message' => 'El paciente no registra información médica previa.',
                'informacion_medica' => null,
                'data' => null,
                'registrado_por' => null,
            ], 200);
        }

        // Obtener el responsable del registro desde bitácora
        $bitacora = DB::table('bitacora')
            ->where('tabla_afectada', 'informacion_medica')
            ->where('id_registro_afectado', $infoMedica->id_informacion)
            ->orderByDesc('id_bitacora')
            ->first();

        $registradoPor = null;
        if ($bitacora && $bitacora->id_usuario) {
            $u = Usuario::with(['persona', 'rol'])->find($bitacora->id_usuario);
            if ($u) {
                $nombre = $u->persona ? "{$u->persona->nombres} {$u->persona->apellidos}" : $u->nombre_usuario;
                $rol = $u->rol?->nombre ?? 'USUARIO';
                $esMedico = ($rol === 'MEDICO');
                $texto = $esMedico ? "Dr(a). {$nombre} (Médico tratante)" : "{$nombre} (Rol: {$rol})";
                $registradoPor = [
                    'nombre' => $nombre,
                    'rol' => $rol,
                    'es_medico' => $esMedico,
                    'fecha_hora' => $bitacora->fecha_hora,
                    'texto' => $texto,
                ];
            }
        }

        if (! $registradoPor) {
            $userActual = Auth::user();
            if ($userActual) {
                $nombre = $userActual->persona ? "{$userActual->persona->nombres} {$userActual->persona->apellidos}" : $userActual->nombre_usuario;
                $rol = $userActual->rol?->nombre ?? 'ADMINISTRADOR';
                $esMedico = ($rol === 'MEDICO');
                $texto = $esMedico ? "Dr(a). {$nombre} (Médico tratante)" : "{$nombre} (Rol: {$rol})";
                $registradoPor = [
                    'nombre' => $nombre,
                    'rol' => $rol,
                    'es_medico' => $esMedico,
                    'fecha_hora' => $infoMedica->fecha_actualizacion ?? now(),
                    'texto' => $texto,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'informacion_medica' => $infoMedica,
            'registrado_por' => $registradoPor,
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
            'tipo_sangre' => 'nullable|string|max:20',
            'grupo_sanguineo' => 'nullable|string|max:20',
            'alergias' => 'nullable|string',
            'enfermedades_cronicas' => 'nullable|string',
            'medicamentos_habituales' => 'nullable|string',
            'antecedentes_relevantes' => 'nullable|string',
            'antecedentes' => 'nullable|string',
            'observaciones' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $rawSangre = $request->input('tipo_sangre') ?: $request->input('grupo_sanguineo');
        $tipoSangre = $rawSangre ? substr(trim((string) $rawSangre), 0, 10) : null;
        $antecedentes = $request->input('antecedentes_relevantes') ?? $request->input('antecedentes');

        $infoMedica = InformacionMedica::updateOrCreate(
            ['id_paciente' => $paciente->id_persona],
            [
                'tipo_sangre' => $tipoSangre,
                'alergias' => $request->input('alergias'),
                'enfermedades_cronicas' => $request->input('enfermedades_cronicas'),
                'medicamentos_habituales' => $request->input('medicamentos_habituales'),
                'antecedentes_relevantes' => $antecedentes,
                'observaciones' => $request->input('observaciones'),
                'fecha_actualizacion' => now(),
            ]
        );

        $user = Auth::user();
        $nombreRegistrador = 'Personal Autorizado';
        $rolRegistrador = 'SISTEMA';
        if ($user) {
            $personaUser = $user->persona;
            $rolRegistrador = $user->rol?->nombre ?? 'USUARIO';
            $nombreRegistrador = $personaUser ? "{$personaUser->nombres} {$personaUser->apellidos}" : $user->nombre_usuario;
        }

        $esMedico = ($rolRegistrador === 'MEDICO');
        $textoRegistrador = $esMedico ? "Dr(a). {$nombreRegistrador} (Médico tratante)" : "{$nombreRegistrador} (Rol: {$rolRegistrador})";

        AuditoriaService::registrar(
            'P4_PACIENTES',
            'MODIFICAR',
            'informacion_medica',
            $infoMedica->id_informacion,
            "Información médica básica actualizada para el paciente [{$paciente->codigo}] por {$textoRegistrador}."
        );

        return response()->json([
            'success' => true,
            'message' => 'Ficha clínica de referencia médica guardada exitosamente.',
            'informacion_medica' => $infoMedica,
            'registrado_por' => [
                'nombre' => $nombreRegistrador,
                'rol' => $rolRegistrador,
                'es_medico' => $esMedico,
                'fecha_hora' => now(),
                'texto' => $textoRegistrador,
            ],
        ]);
    }
}
