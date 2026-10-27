<?php

namespace App\Http\Controllers;

use App\Models\Cita;
use App\Models\Paciente;
use App\Models\Reporte;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ReporteController extends Controller
{
    /**
     * Listar historial de reportes administrativos emitidos
     */
    public function index(Request $request): JsonResponse
    {
        $query = Reporte::with('usuario.persona');

        if ($request->filled('tipo')) {
            $query->where('tipo', strtoupper($request->input('tipo')));
        }

        $reportes = $query->orderBy('fecha_generacion', 'desc')->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $reportes,
        ]);
    }

    /**
     * Generar Reporte Administrativo (P7)
     * Tipos: CITAS_PERIODO, ATENCIONES_MEDICO_ESPECIALIDAD, CONTROL_ASISTENCIA, PACIENTES_REGISTRADOS
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'tipo' => 'required|string|in:CITAS_PERIODO,ATENCIONES_MEDICO_ESPECIALIDAD,CONTROL_ASISTENCIA,PACIENTES_REGISTRADOS',
            'fecha_desde' => 'nullable|date',
            'fecha_hasta' => 'nullable|date|after_or_equal:fecha_desde',
            'formato' => 'nullable|string|in:PDF,CSV',
            'filtros' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $tipo = strtoupper($request->input('tipo'));
        $fechaDesde = $request->input('fecha_desde');
        $fechaHasta = $request->input('fecha_hasta');
        $filtros = $request->input('filtros', []);
        $formato = $request->input('formato', 'PDF');

        $datos = [];

        switch ($tipo) {
            case 'CITAS_PERIODO':
                $q = Cita::with(['paciente.persona', 'medico.persona', 'especialidad']);
                if ($fechaDesde) $q->where('fecha', '>=', $fechaDesde);
                if ($fechaHasta) $q->where('fecha', '<=', $fechaHasta);
                $datos = [
                    'total_citas' => $q->count(),
                    'citas' => $q->get(),
                ];
                break;

            case 'ATENCIONES_MEDICO_ESPECIALIDAD':
                $q = Cita::with(['medico.persona', 'especialidad'])
                    ->where('estado', 'ATENDIDA');
                if ($fechaDesde) $q->where('fecha', '>=', $fechaDesde);
                if ($fechaHasta) $q->where('fecha', '<=', $fechaHasta);
                $datos = [
                    'total_atenciones' => $q->count(),
                    'atenciones' => $q->get(),
                ];
                break;

            case 'CONTROL_ASISTENCIA':
                $q = Cita::with(['paciente.persona', 'medico.persona']);
                if ($fechaDesde) $q->where('fecha', '>=', $fechaDesde);
                if ($fechaHasta) $q->where('fecha', '<=', $fechaHasta);
                $datos = [
                    'atendidas' => (clone $q)->where('estado', 'ATENDIDA')->count(),
                    'inasistencias' => (clone $q)->where('estado', 'INASISTENCIA')->count(),
                    'canceladas' => (clone $q)->where('estado', 'CANCELADA')->count(),
                ];
                break;

            case 'PACIENTES_REGISTRADOS':
                $q = Paciente::with(['persona', 'informacionMedica']);
                $datos = [
                    'total_pacientes' => $q->count(),
                    'pacientes' => $q->get(),
                ];
                break;
        }

        $reporte = Reporte::create([
            'id_usuario' => Auth::id() ?? 1,
            'tipo' => $tipo,
            'fecha_desde' => $fechaDesde,
            'fecha_hasta' => $fechaHasta,
            'filtros' => $filtros,
            'formato' => $formato,
            'fecha_generacion' => now(),
        ]);

        AuditoriaService::registrar(
            'P7_REPORTES',
            'CREAR',
            'reporte',
            $reporte->id_reporte,
            "Reporte emitido de tipo [{$tipo}] en formato [{$formato}]."
        );

        return response()->json([
            'success' => true,
            'message' => "Reporte {$tipo} generado exitosamente.",
            'reporte' => $reporte,
            'resultado' => $datos,
        ], 201);
    }
}
