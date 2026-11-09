<?php

namespace App\Http\Controllers;

use App\Models\ContactoEmergencia;
use App\Models\Paciente;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ContactoEmergenciaController extends Controller
{
    /**
     * Lista todos los contactos de emergencia registrados para un paciente específico.
     */
    public function index(int $id): JsonResponse
    {
        $user = Auth::user();
        if ($user && $user->tieneRol('PACIENTE') && $user->id_persona != $id) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. Solo puedes consultar tus propios contactos de emergencia.',
            ], 403);
        }

        $contactos = ContactoEmergencia::where('id_paciente', $id)->get();

        return response()->json([
            'success' => true,
            'total' => $contactos->count(),
            'data' => $contactos,
        ]);
    }

    /**
     * Registra un nuevo contacto de emergencia vinculado a un paciente.
     */
    public function agregarContactoEmergencia(Request $request, int $id): JsonResponse
    {
        $paciente = Paciente::find($id);

        if (! $paciente) {
            return response()->json([
                'success' => false,
                'message' => 'El paciente no existe.',
            ], 404);
        }

        $nombreCompleto = trim((string) ($request->input('nombre_completo') ?: $request->input('nombre') ?: ''));
        $parentesco = trim((string) ($request->input('parentesco') ?: $request->input('relacion') ?: 'Familiar'));
        $request->merge([
            'nombre_completo' => $nombreCompleto,
            'parentesco' => $parentesco,
        ]);

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
            'nombre_completo' => $nombreCompleto,
            'parentesco' => $parentesco,
            'telefono' => trim($request->input('telefono')),
        ]);

        AuditoriaService::registrar(
            'P4_PACIENTES',
            'REGISTRAR',
            'contacto_emergencia',
            $contacto->id_contacto,
            "Se agregó contacto de emergencia [{$contacto->nombre_completo}] ({$contacto->parentesco}) al paciente [{$paciente->codigo}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Contacto de emergencia registrado exitosamente.',
            'contacto' => $contacto,
        ], 201);
    }

    /**
     * Elimina un contacto de emergencia específico perteneciente a un paciente.
     */
    public function eliminarContactoEmergencia(int $id, int $contactoId): JsonResponse
    {
        $contacto = ContactoEmergencia::where('id_paciente', $id)->where('id_contacto', $contactoId)->first();

        if (! $contacto) {
            return response()->json([
                'success' => false,
                'message' => 'Contacto de emergencia no encontrado.',
            ], 404);
        }

        $nombreContacto = $contacto->nombre_completo;
        $idContacto = $contacto->id_contacto;
        $contacto->delete();

        AuditoriaService::registrar(
            'P4_PACIENTES',
            'ELIMINAR',
            'contacto_emergencia',
            $idContacto,
            "Se eliminó el contacto de emergencia [{$nombreContacto}] del paciente ID [{$id}]."
        );

        return response()->json([
            'success' => true,
            'message' => 'Contacto de emergencia eliminado correctamente.',
        ]);
    }
}
