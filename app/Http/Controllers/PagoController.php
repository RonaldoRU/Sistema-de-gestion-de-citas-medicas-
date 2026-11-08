<?php

namespace App\Http\Controllers;

use App\Models\Cita;
use App\Models\ComprobantePago;
use App\Models\HistorialEstadoCita;
use App\Models\Pago;
use App\Models\Reembolso;
use App\Services\AuditoriaService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class PagoController extends Controller
{
    /**
     * Listado dinámico de pagos y transacciones vinculados a citas médicas (CU42).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Pago::with([
            'cita.paciente.persona',
            'cita.medico.persona',
            'cita.especialidad',
            'comprobantePago',
            'reembolsos',
            'usuarioRegistro.persona',
        ]);

        if ($request->filled('estado')) {
            $query->where('estado', strtoupper(trim((string) $request->input('estado'))));
        }

        if ($request->filled('metodo')) {
            $query->where('metodo', 'ilike', '%'.trim((string) $request->input('metodo')).'%');
        }

        if ($request->filled('fecha_desde')) {
            $query->whereDate('fecha_hora', '>=', $request->input('fecha_desde'));
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('fecha_hora', '<=', $request->input('fecha_hasta'));
        }

        if ($request->filled('id_cita')) {
            $query->where('id_cita', $request->input('id_cita'));
        }

        $pagos = $query->orderBy('id_pago', 'desc')
            ->paginate($request->input('per_page', 25));

        $totalRecaudado = (float) Pago::where('estado', 'APROBADO')->sum('monto');
        $totalReembolsado = (float) Reembolso::where('estado', 'PROCESADO')->sum('monto');
        $pagosHoy = Pago::whereDate('fecha_hora', now()->toDateString())->count();

        return response()->json([
            'success' => true,
            'data' => $pagos,
            'kpis' => [
                'total_recaudado' => $totalRecaudado,
                'total_reembolsado' => $totalReembolsado,
                'pagos_hoy' => $pagosHoy,
            ],
        ]);
    }

    /**
     * Detalle de un pago específico.
     */
    public function show(int $id): JsonResponse
    {
        $pago = Pago::with([
            'cita.paciente.persona',
            'cita.medico.persona',
            'cita.especialidad',
            'comprobantePago',
            'reembolsos',
            'usuarioRegistro.persona',
        ])->find($id);

        if (! $pago) {
            return response()->json([
                'success' => false,
                'message' => 'Registro de pago no encontrado.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $pago,
        ]);
    }

    /**
     * Registrar un nuevo pago (CU41 - Pasarela de Pago: QR Simple / Tarjeta / Stripe / Efectivo).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'id_cita' => 'required|exists:cita,id_cita',
            'monto' => 'required|numeric|min:0.5',
            'metodo' => 'required|string',
            'referencia_externa' => 'nullable|string|max:100',
            'nit_ci' => 'nullable|string|max:30',
        ]);

        $cita = Cita::with(['paciente.persona', 'medico.persona', 'especialidad'])->findOrFail($request->input('id_cita'));

        $metodo = strtoupper(trim((string) $request->input('metodo')));
        if ($metodo === 'QR_SIMPLE') {
            $metodo = 'QR';
        }

        $pago = DB::transaction(function () use ($request, $cita, $metodo) {
            $nuevoPago = Pago::create([
                'id_cita' => $cita->id_cita,
                'id_usuario_registro' => Auth::id() ?? 1,
                'monto' => $request->input('monto'),
                'moneda' => 'BOB',
                'metodo' => $metodo,
                'estado' => 'APROBADO',
                'referencia_externa' => $request->input('referencia_externa') ?? ('TX-'.strtoupper(uniqid())),
                'fecha_hora' => now(),
            ]);

            $numeroComp = 'COMP-'.now()->format('Y').'-'.str_pad((string) $nuevoPago->id_pago, 4, '0', STR_PAD_LEFT);

            ComprobantePago::create([
                'id_pago' => $nuevoPago->id_pago,
                'numero' => $numeroComp,
                'fecha_emision' => now(),
                'monto_total' => $nuevoPago->monto,
                'ruta_archivo' => 'comprobantes/'.$numeroComp.'.pdf',
            ]);

            $estadoAnt = $cita->estado;
            if ($cita->estado !== 'CONFIRMADA' && $cita->estado !== 'ATENDIDA') {
                $cita->update(['estado' => 'CONFIRMADA']);

                HistorialEstadoCita::create([
                    'id_cita' => $cita->id_cita,
                    'id_usuario' => Auth::id() ?? 1,
                    'estado_anterior' => $estadoAnt,
                    'estado_nuevo' => 'CONFIRMADA',
                    'motivo' => "Pago confirmado vía {$metodo}. Comprobante {$numeroComp}.",
                    'fecha_cambio' => now(),
                ]);
            }

            AuditoriaService::registrar(
                'P8_PAGOS',
                'REGISTRAR',
                'pago',
                $nuevoPago->id_pago,
                "Pago aprobado de Bs {$nuevoPago->monto} para la cita [{$cita->codigo}] vía {$metodo}. Comprobante: {$numeroComp}."
            );

            return $nuevoPago;
        });

        return response()->json([
            'success' => true,
            'message' => "Pago registrado y cita [{$cita->codigo}] confirmada exitosamente.",
            'data' => $pago->load(['cita.paciente.persona', 'comprobantePago']),
        ], 201);
    }

    /**
     * Procesar reembolso y cancelar cita médica (CU42).
     */
    public function reembolsar(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'motivo' => 'required|string|min:4|max:255',
            'monto' => 'nullable|numeric|min:0',
        ]);

        // Puede buscarse por id_pago o id_cita
        $pago = Pago::with(['cita', 'comprobantePago'])->find($id);
        if (! $pago) {
            $pago = Pago::with(['cita', 'comprobantePago'])->where('id_cita', $id)->latest('id_pago')->first();
        }

        if (! $pago) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró un registro de pago asociado para procesar el reembolso.',
            ], 404);
        }

        $motivo = trim((string) $request->input('motivo'));
        $montoReembolso = $request->input('monto') ?? $pago->monto;

        $reembolso = DB::transaction(function () use ($pago, $motivo, $montoReembolso) {
            $pago->update(['estado' => 'REEMBOLSADO']);

            $nuevoReembolso = Reembolso::create([
                'id_pago' => $pago->id_pago,
                'id_usuario_autoriza' => Auth::id() ?? 1,
                'monto' => $montoReembolso,
                'motivo' => $motivo,
                'estado' => 'PROCESADO',
                'fecha_solicitud' => now(),
                'fecha_procesado' => now(),
                'referencia_externa' => 'REF-'.strtoupper(uniqid()),
            ]);

            if ($pago->cita && $pago->cita->estado !== 'CANCELADA') {
                $estadoAnt = $pago->cita->estado;
                $pago->cita->update([
                    'estado' => 'CANCELADA',
                    'motivo_cancelacion' => "Reembolso procesado: {$motivo}",
                ]);

                HistorialEstadoCita::create([
                    'id_cita' => $pago->cita->id_cita,
                    'id_usuario' => Auth::id() ?? 1,
                    'estado_anterior' => $estadoAnt,
                    'estado_nuevo' => 'CANCELADA',
                    'motivo' => "Reembolso procesado ({$motivo}). Bloque horario liberado.",
                    'fecha_cambio' => now(),
                ]);
            }

            AuditoriaService::registrar(
                'P8_PAGOS',
                'MODIFICAR',
                'pago',
                $pago->id_pago,
                "Reembolso de Bs {$montoReembolso} procesado para el pago #{$pago->id_pago}. Motivo: {$motivo}."
            );

            return $nuevoReembolso;
        });

        return response()->json([
            'success' => true,
            'message' => 'Reembolso procesado exitosamente y cita cancelada liberando el bloque horario.',
            'data' => $reembolso->load(['pago.cita']),
        ]);
    }

    /**
     * Crear una sesión o Payment Intent con Stripe para cobros en línea.
     */
    public function crearIntentoStripe(Request $request): JsonResponse
    {
        $request->validate([
            'id_cita' => 'required|exists:cita,id_cita',
            'monto' => 'required|numeric|min:1',
        ]);

        $cita = Cita::with(['paciente.persona'])->findOrFail($request->input('id_cita'));
        $monto = (float) $request->input('monto');
        $stripeSecret = config('services.stripe.secret') ?: env('STRIPE_SECRET');
        $currency = strtolower(config('services.stripe.currency') ?: env('STRIPE_CURRENCY', 'bob'));

        // Si hay API key real configurada, llamar a la API de Stripe
        if ($stripeSecret && ! str_contains($stripeSecret, 'placeholder')) {
            try {
                $response = Http::withBasicAuth($stripeSecret, '')
                    ->asForm()
                    ->post('https://api.stripe.com/v1/payment_intents', [
                        'amount' => (int) round($monto * 100),
                        'currency' => $currency,
                        'payment_method_types' => ['card'],
                        'description' => "Consulta médica cita {$cita->codigo} - Clínica Vida Salud",
                        'metadata' => [
                            'id_cita' => $cita->id_cita,
                            'codigo_cita' => $cita->codigo,
                            'paciente' => $cita->paciente?->persona?->nombres.' '.$cita->paciente?->persona?->apellidos,
                        ],
                    ]);

                if ($response->successful()) {
                    $intent = $response->json();

                    return response()->json([
                        'success' => true,
                        'modo' => 'live_stripe',
                        'client_secret' => $intent['client_secret'] ?? null,
                        'payment_intent_id' => $intent['id'] ?? null,
                        'monto' => $monto,
                        'moneda' => strtoupper($currency),
                    ]);
                }
            } catch (Exception $e) {
                // Si falla la conexión con Stripe live, continúa al fallback de simulación
            }
        }

        // Simulación controlada para desarrollo cuando la clave de Stripe no está provista
        $simulatedId = 'pi_test_'.substr(md5(uniqid((string) mt_rand(), true)), 0, 24);

        return response()->json([
            'success' => true,
            'modo' => 'test_simulation',
            'client_secret' => $simulatedId.'_secret_'.substr(md5(uniqid()), 0, 16),
            'payment_intent_id' => $simulatedId,
            'monto' => $monto,
            'moneda' => strtoupper($currency),
            'mensaje' => 'Sesión de pago Stripe iniciada (modo de prueba listo para confirmar).',
        ]);
    }
}
