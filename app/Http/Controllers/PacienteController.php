<?php

namespace App\Http\Controllers;

use App\Models\Cita;
use App\Models\ContactoEmergencia;
use App\Models\InformacionMedica;
use App\Models\Paciente;
use App\Models\Persona;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PacienteController extends Controller
{
    /**
     * CU15: Buscar Pacientes por CI, Nombre o Apellido / Listado General
     */
    public function index(Request $request): JsonResponse
    {
        $query = Paciente::with(['persona', 'informacionMedica', 'contactosEmergencia']);

        // Búsqueda por CI, Nombres, Apellidos o Código correlativo
        if ($request->filled('buscar')) {
            $buscar = trim($request->input('buscar'));
            $query->where(function ($q) use ($buscar) {
                $q->where('codigo', 'like', "%{$buscar}%")
                  ->orWhereHas('persona', function ($pq) use ($buscar) {
                      $pq->where('ci', 'like', "%{$buscar}%")
                         ->orWhere('nombres', 'like', "%{$buscar}%")
                         ->orWhere('apellidos', 'like', "%{$buscar}%")
                         ->orWhere('email', 'like', "%{$buscar}%");
                  });
            });
        }

        // Filtro por Estado (activo / inactivo en persona)
        if ($request->filled('activo')) {
            $activo = filter_var($request->input('activo'), FILTER_VALIDATE_BOOLEAN);
            $query->whereHas('persona', function ($pq) use ($activo) {
                $pq->where('activo', $activo);
            });
        }

        $pacientes = $query->orderBy('id_persona', 'desc')->paginate($request->input('per_page', 15));

        // CU15 / A1: Si no se encuentran resultados
        if ($request->filled('buscar') && $pacientes->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontraron registros de pacientes que coincidan con la búsqueda.',
                'sugerencia' => 'Puede proceder a registrar un nuevo paciente en la plataforma.',
                'data' => $pacientes,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $pacientes,
        ]);
    }

    /**
     * Ver expediente completo de un paciente
     */
    public function show(int $id): JsonResponse
    {
        $paciente = Paciente::with([
            'persona',
            'informacionMedica',
            'contactosEmergencia',
            'citas.medico.persona',
            'citas.especialidad'
        ])->find($id);

        if (!$paciente) {
            return response()->json([
                'success' => false,
                'message' => 'Paciente no encontrado en el sistema.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'paciente' => $paciente,
        ]);
    }

    /**
     * CU12: Registrar Paciente
     * Crea Persona base y especialización Paciente con código PAC-0001
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ci' => 'required|string|max:20|unique:persona,ci',
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'sexo' => 'required|string|in:M,F',
            'fecha_nacimiento' => 'required|date',
            'telefono' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:150|unique:persona,email',
            'direccion' => 'nullable|string|max:200',
        ], [
            'ci.unique' => 'La Cédula de Identidad (CI) ya pertenece a otra persona registrada.',
            'ci.required' => 'La Cédula de Identidad (CI) es obligatoria.',
            'sexo.in' => 'El sexo debe ser M o F.',
            'fecha_nacimiento.required' => 'La fecha de nacimiento es obligatoria.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación al registrar paciente.',
                'errors' => $validator->errors(),
            ], 422);
        }

        return DB::transaction(function () use ($request) {
            // 1. Crear Persona base
            $persona = Persona::create([
                'ci' => trim($request->input('ci')),
                'nombres' => trim($request->input('nombres')),
                'apellidos' => trim($request->input('apellidos')),
                'telefono' => $request->input('telefono'),
                'email' => trim($request->input('email')),
                'activo' => true,
            ]);

            // 2. Generar código correlativo PAC-0001
            $ultimoId = Paciente::max('id_persona') ?? 0;
            $codigoCorrelativo = 'PAC-' . str_pad((string) ($ultimoId + 1), 4, '0', STR_PAD_LEFT);

            // 3. Crear Subclase Paciente
            $paciente = Paciente::create([
                'id_persona' => $persona->id_persona,
                'codigo' => $codigoCorrelativo,
                'sexo' => strtoupper($request->input('sexo')),
                'fecha_nacimiento' => $request->input('fecha_nacimiento'),
                'direccion' => $request->input('direccion'),
            ]);

            // CU12 Paso 6: Auditar la acción en la bitácora (CU10)
            AuditoriaService::registrar(
                'P4_PACIENTES',
                'CREAR',
                'paciente',
                $paciente->id_persona,
                "Se registró al paciente [{$persona->nombre_completo}] con CI [{$persona->ci}] y código [{$paciente->codigo}]."
            );

            return response()->json([
                'success' => true,
                'message' => 'Paciente registrado exitosamente.',
                'paciente' => $paciente->load('persona'),
            ], 201);
        });
    }

    /**
     * CU15: Buscar y Modificar Datos de Paciente
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $paciente = Paciente::with('persona')->find($id);

        if (!$paciente) {
            return response()->json([
                'success' => false,
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $personaId = $paciente->id_persona;

        $validator = Validator::make($request->all(), [
            'ci' => ['required', 'string', 'max:20', Rule::unique('persona', 'ci')->ignore($personaId, 'id_persona')],
            'nombres' => 'required|string|max:80',
            'apellidos' => 'required|string|max:80',
            'sexo' => 'required|string|in:M,F',
            'fecha_nacimiento' => 'required|date',
            'telefono' => 'nullable|string|max:20',
            'email' => ['nullable', 'email', 'max:150', Rule::unique('persona', 'email')->ignore($personaId, 'id_persona')],
            'direccion' => 'nullable|string|max:200',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $paciente->persona->update([
            'ci' => trim($request->input('ci')),
            'nombres' => trim($request->input('nombres')),
            'apellidos' => trim($request->input('apellidos')),
            'telefono' => $request->input('telefono'),
            'email' => trim($request->input('email')),
        ]);

        $paciente->update([
            'sexo' => strtoupper($request->input('sexo')),
            'fecha_nacimiento' => $request->input('fecha_nacimiento'),
            'direccion' => $request->input('direccion'),
        ]);

        AuditoriaService::registrar(
            'P4_PACIENTES',
            'MODIFICAR',
            'paciente',
            $paciente->id_persona,
            "Datos personales del paciente [{$paciente->codigo}] actualizados."
        );

        return response()->json([
            'success' => true,
            'message' => 'Datos del paciente actualizados exitosamente.',
            'paciente' => $paciente->fresh(['persona']),
        ]);
    }

    /**
     * CU13: Registrar y Gestionar Información Médica Básica del Paciente
     */
    public function guardarInfoMedica(Request $request, int $id): JsonResponse
    {
        $paciente = Paciente::find($id);

        if (!$paciente) {
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

    /**
     * CU14: Registrar Contacto de Emergencia
     */
    public function agregarContactoEmergencia(Request $request, int $id): JsonResponse
    {
        $paciente = Paciente::find($id);

        if (!$paciente) {
            return response()->json([
                'success' => false,
                'message' => 'El paciente no existe.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nombre_completo' => 'required|string|max:150',
            'parentesco' => 'required|string|max:40',
            'telefono' => 'required|string|max:20',
        ], [
            'nombre_completo.required' => 'El nombre del contacto de emergencia es obligatorio.',
            'parentesco.required' => 'El parentesco es obligatorio.',
            'telefono.required' => 'El teléfono directo es obligatorio.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $contacto = ContactoEmergencia::create([
            'id_paciente' => $paciente->id_persona,
            'nombre_completo' => trim($request->input('nombre_completo')),
            'parentesco' => trim($request->input('parentesco')),
            'telefono' => trim($request->input('telefono')),
        ]);

        AuditoriaService::registrar(
            'P4_PACIENTES',
            'CONTACTO_EMERGENCIA',
            'contacto_emergencia',
            $contacto->id_contacto,
            "Se agregó contacto de emergencia [{$contacto->nombre_completo}] al paciente [{$paciente->codigo}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Contacto de emergencia registrado exitosamente.',
            'contacto' => $contacto,
        ], 201);
    }

    /**
     * Eliminar contacto de emergencia
     */
    public function eliminarContactoEmergencia(int $id, int $contactoId): JsonResponse
    {
        $contacto = ContactoEmergencia::where('id_paciente', $id)->where('id_contacto', $contactoId)->first();

        if (!$contacto) {
            return response()->json([
                'success' => false,
                'message' => 'Contacto de emergencia no encontrado.',
            ], 404);
        }

        $contacto->delete();

        return response()->json([
            'success' => true,
            'message' => 'Contacto de emergencia eliminado correctamente.',
        ]);
    }

    /**
     * CU16: Consultar Historial de Citas del Paciente
     */
    public function historialCitas(int $id): JsonResponse
    {
        $paciente = Paciente::with('persona')->find($id);

        if (!$paciente) {
            return response()->json([
                'success' => false,
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $citas = Cita::with([
            'medico.persona',
            'especialidad'
        ])
        ->where('id_paciente', $paciente->id_persona)
        ->orderBy('fecha', 'desc')
        ->orderBy('hora_inicio', 'desc')
        ->get();

        // CU16 / A1: Sin Antecedentes
        if ($citas->isEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'El paciente no registra citas previas en la clínica.',
                'paciente' => [
                    'id_persona' => $paciente->id_persona,
                    'codigo' => $paciente->codigo,
                    'nombre_completo' => $paciente->nombre_completo,
                ],
                'citas' => [],
            ]);
        }

        return response()->json([
            'success' => true,
            'paciente' => [
                'id_persona' => $paciente->id_persona,
                'codigo' => $paciente->codigo,
                'nombre_completo' => $paciente->nombre_completo,
            ],
            'total_citas' => $citas->count(),
            'citas' => $citas,
        ]);
    }

    /**
     * CU17: Desactivar Registro de Paciente (Baja Lógica)
     */
    public function inactivar(int $id): JsonResponse
    {
        $paciente = Paciente::with('persona')->find($id);

        if (!$paciente) {
            return response()->json([
                'success' => false,
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        // CU17 / A1: Citas Pendientes
        $citasFuturas = Cita::where('id_paciente', $paciente->id_persona)
            ->where('fecha', '>=', now()->toDateString())
            ->whereIn('estado', ['PROGRAMADA', 'CONFIRMADA'])
            ->with(['medico.persona', 'especialidad'])
            ->get();

        if ($citasFuturas->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'El paciente registra citas futuras agendadas. Se requiere cancelar o reprogramar las citas antes de procesar la baja.',
                'total_citas_pendientes' => $citasFuturas->count(),
                'citas_pendientes' => $citasFuturas,
            ], 422);
        }

        // CU17 Paso 3: Baja lógica en Persona
        $paciente->persona->update(['activo' => false]);

        // CU17 Paso 4: Audita la baja en la bitácora (CU10)
        AuditoriaService::registrar(
            'P4_PACIENTES',
            'BAJA_LOGICA',
            'paciente',
            $paciente->id_persona,
            "Paciente [{$paciente->codigo} - {$paciente->nombre_completo}] dado de baja lógica (activo = false)."
        );

        return response()->json([
            'success' => true,
            'message' => 'Paciente desactivado correctamente (baja lógica). Historial médico y citas conservadas.',
        ]);
    }

    /**
     * Reactivar paciente
     */
    public function reactivar(int $id): JsonResponse
    {
        $paciente = Paciente::with('persona')->find($id);

        if (!$paciente) {
            return response()->json([
                'success' => false,
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $paciente->persona->update(['activo' => true]);

        AuditoriaService::registrar(
            'P4_PACIENTES',
            'REACTIVAR',
            'paciente',
            $paciente->id_persona,
            "Paciente [{$paciente->codigo} - {$paciente->nombre_completo}] reactivado a estado activo."
        );

        return response()->json([
            'success' => true,
            'message' => 'Paciente reactivado exitosamente a estado activo.',
            'paciente' => $paciente->fresh('persona'),
        ]);
    }
}
