<?php

namespace App\Services;

use App\Models\Cita;
use App\Models\Paciente;
use App\Models\Pago;
use App\Models\Persona;
use App\Models\Usuario;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailNotificationService
{
    /**
     * Envía correo de bienvenida y confirmación de alta al paciente registrado.
     */
    public static function enviarBienvenidaPaciente(Persona $persona, Usuario $usuario, ?Paciente $paciente = null): bool
    {
        $destinatario = trim((string) $persona->email);
        if (! filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $nombreCompleto = trim("{$persona->nombres} {$persona->apellidos}");
        $codigoPaciente = $paciente?->codigo ?? 'PAC-'.str_pad((string) $persona->id_persona, 4, '0', STR_PAD_LEFT);

        $html = "
        <div style='font-family: Arial, sans-serif; background-color: #F6F8FB; padding: 25px;'>
            <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #D9E0EA; overflow: hidden;'>
                <div style='background-color: #1E4E8C; padding: 25px; text-align: center; color: #ffffff;'>
                    <h1 style='margin: 0; font-size: 22px;'>Clínica Vida Salud</h1>
                    <p style='margin: 5px 0 0; font-size: 13px; color: #BFD0EA;'>Portal Oficial de Pacientes · Santa Cruz</p>
                </div>
                <div style='padding: 30px; color: #16243A;'>
                    <h2 style='color: #1E4E8C; margin-top: 0;'>¡Bienvenido(a), {$nombreCompleto}!</h2>
                    <p style='line-height: 1.6; font-size: 15px;'>Tu cuenta personal de paciente ha sido registrada exitosamente en nuestro sistema clínico integral.</p>
                    <div style='background-color: #F1F5F9; border-left: 4px solid #2F6B55; padding: 15px; margin: 20px 0;'>
                        <p style='margin: 3px 0;'><strong>Código de Paciente:</strong> {$codigoPaciente}</p>
                        <p style='margin: 3px 0;'><strong>Usuario de Acceso:</strong> {$usuario->nombre_usuario}</p>
                        <p style='margin: 3px 0;'><strong>Cédula de Identidad:</strong> {$persona->ci}</p>
                        <p style='margin: 3px 0;'><strong>Correo Registrado:</strong> {$destinatario}</p>
                    </div>
                    <p style='line-height: 1.6; font-size: 14px;'>Desde tu portal podrás:</p>
                    <ul style='color: #55617A; font-size: 14px; line-height: 1.6;'>
                        <li>Reservar turnos y fichas médicas con especialistas en tiempo real.</li>
                        <li>Pagar tus consultas en línea con QR Simple o Tarjeta de débito/crédito.</li>
                        <li>Descargar tus comprobantes oficiales e historial de citas médicas.</li>
                    </ul>
                </div>
                <div style='background-color: #F8FAFD; padding: 15px; text-align: center; font-size: 12px; color: #8794AA; border-top: 1px solid #E2E8F0;'>
                    © ".date('Y').' Clínica Vida Salud. Todos los derechos reservados.
                </div>
            </div>
        </div>';

        return self::enviar($destinatario, '¡Bienvenido(a) a Clínica Vida Salud! - Tu cuenta ha sido activada', $html);
    }

    /**
     * Envía correo de confirmación de reserva de cita médica.
     */
    public static function enviarConfirmacionCita(Cita $cita): bool
    {
        $cita->loadMissing(['paciente.persona', 'medico.persona', 'especialidad']);
        $persona = $cita->paciente?->persona;
        $destinatario = trim((string) ($persona?->email));

        if (! filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $pacienteNombre = trim("{$persona->nombres} {$persona->apellidos}");
        $medicoNombre = trim("Dr(a). {$cita->medico?->persona?->nombres} {$cita->medico?->persona?->apellidos}");
        $especialidad = $cita->especialidad?->nombre ?? 'Medicina General';
        $costo = number_format((float) ($cita->especialidad?->costo ?? 120.00), 2);
        $fecha = date('d/m/Y', strtotime($cita->fecha));
        $hora = substr((string) ($cita->hora_inicio ?? '08:00'), 0, 5);

        $html = "
        <div style='font-family: Arial, sans-serif; background-color: #F6F8FB; padding: 25px;'>
            <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #D9E0EA; overflow: hidden;'>
                <div style='background-color: #1E4E8C; padding: 25px; text-align: center; color: #ffffff;'>
                    <h1 style='margin: 0; font-size: 22px;'>Clínica Vida Salud</h1>
                    <p style='margin: 5px 0 0; font-size: 13px; color: #BFD0EA;'>Confirmación de Reserva de Ficha Médica</p>
                </div>
                <div style='padding: 30px; color: #16243A;'>
                    <h2 style='color: #1E4E8C; margin-top: 0;'>Ficha Médica: {$cita->codigo}</h2>
                    <p style='line-height: 1.6; font-size: 15px;'>Estimado(a) <strong>{$pacienteNombre}</strong>, tu cita médica ha sido agendada con éxito.</p>
                    <div style='background-color: #F3F6FB; border: 1px solid #D5E0EA; border-radius: 6px; padding: 18px; margin: 20px 0;'>
                        <p style='margin: 5px 0;'><strong>Especialidad:</strong> {$especialidad}</p>
                        <p style='margin: 5px 0;'><strong>Médico Asignado:</strong> {$medicoNombre}</p>
                        <p style='margin: 5px 0;'><strong>Fecha:</strong> {$fecha}</p>
                        <p style='margin: 5px 0;'><strong>Hora Citada:</strong> {$hora}</p>
                        <p style='margin: 5px 0;'><strong>Arancel de Consulta:</strong> <span style='color: #2F6B55; font-weight: bold;'>Bs {$costo} BOB</span></p>
                        <p style='margin: 5px 0;'><strong>Estado:</strong> <span style='color: #1E4E8C; font-weight: bold;'>{$cita->estado}</span></p>
                    </div>
                    <p style='font-size: 13px; color: #55617A; line-height: 1.5;'>Por favor preséntate 10 minutos antes en recepción o realiza el pago en línea desde tu portal para confirmar tu lugar automáticamente.</p>
                </div>
                <div style='background-color: #F8FAFD; padding: 15px; text-align: center; font-size: 12px; color: #8794AA; border-top: 1px solid #E2E8F0;'>
                    © ".date('Y').' Clínica Vida Salud · Santa Cruz, Bolivia
                </div>
            </div>
        </div>';

        return self::enviar($destinatario, "Reserva de Cita Médica Confirmada - Ficha {$cita->codigo}", $html);
    }

    /**
     * Envía comprobante oficial de pago al paciente.
     */
    public static function enviarComprobantePago(Pago $pago): bool
    {
        $pago->loadMissing(['cita.paciente.persona', 'cita.medico.persona', 'cita.especialidad', 'comprobantePago']);
        $persona = $pago->cita?->paciente?->persona;
        $destinatario = trim((string) ($persona?->email));

        if (! filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $pacienteNombre = trim("{$persona->nombres} {$persona->apellidos}");
        $numComprobante = $pago->comprobantePago?->numero ?? 'COMP-2026-'.str_pad((string) $pago->id_pago, 4, '0', STR_PAD_LEFT);
        $monto = number_format((float) $pago->monto, 2);
        $metodo = $pago->metodo ?? 'QR Simple';
        $especialidad = $pago->cita?->especialidad?->nombre ?? 'Consulta Especializada';
        $fechaHora = date('d/m/Y H:i', strtotime($pago->fecha_hora ?? now()));

        $html = "
        <div style='font-family: Arial, sans-serif; background-color: #F6F8FB; padding: 25px;'>
            <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #D9E0EA; overflow: hidden;'>
                <div style='background-color: #2F6B55; padding: 25px; text-align: center; color: #ffffff;'>
                    <h1 style='margin: 0; font-size: 22px;'>Clínica Vida Salud</h1>
                    <p style='margin: 5px 0 0; font-size: 13px; color: #E4F1EA;'>Comprobante Digital Oficial de Pago</p>
                </div>
                <div style='padding: 30px; color: #16243A;'>
                    <div style='text-align: center; margin-bottom: 20px;'>
                        <span style='font-size: 12px; color: #55617A; text-transform: uppercase;'>N.º de Transacción</span>
                        <h2 style='color: #2F6B55; margin: 3px 0 0;'>{$numComprobante}</h2>
                    </div>
                    <p style='line-height: 1.6; font-size: 15px;'>Estimado(a) <strong>{$pacienteNombre}</strong>, hemos registrado tu pago exitosamente.</p>
                    <div style='background-color: #F8FAFD; border: 1px dashed #CBD5E1; border-radius: 6px; padding: 18px; margin: 20px 0;'>
                        <p style='margin: 4px 0;'><strong>Concepto:</strong> {$especialidad}</p>
                        <p style='margin: 4px 0;'><strong>Ficha Médica:</strong> {$pago->cita?->codigo}</p>
                        <p style='margin: 4px 0;'><strong>Fecha y Hora de Pago:</strong> {$fechaHora}</p>
                        <p style='margin: 4px 0;'><strong>Método de Pago:</strong> {$metodo}</p>
                        <p style='margin: 8px 0 4px; font-size: 16px;'><strong>TOTAL PAGADO:</strong> <span style='color: #2F6B55; font-weight: bold;'>Bs {$monto} BOB</span></p>
                        <p style='margin: 4px 0;'><strong>Estado:</strong> <span style='color: #2F6B55; font-weight: bold;'>PAGADO / APROBADO</span></p>
                    </div>
                    <p style='font-size: 12px; color: #64748B; text-align: center;'>Este documento constituye la constancia formal y electrónica del pago de su consulta médica.</p>
                </div>
                <div style='background-color: #F8FAFD; padding: 15px; text-align: center; font-size: 12px; color: #8794AA; border-top: 1px solid #E2E8F0;'>
                    © ".date('Y').' Clínica Vida Salud · NIT: 1028493021
                </div>
            </div>
        </div>';

        return self::enviar($destinatario, "Comprobante de Pago Digital - {$numComprobante}", $html);
    }

    /**
     * Envía notificación de cancelación justificada de cita médica.
     */
    public static function enviarCancelacionCita(Cita $cita, string $motivo): bool
    {
        $cita->loadMissing(['paciente.persona', 'medico.persona', 'especialidad']);
        $persona = $cita->paciente?->persona;
        $destinatario = trim((string) ($persona?->email));

        if (! filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $pacienteNombre = trim("{$persona->nombres} {$persona->apellidos}");
        $fecha = date('d/m/Y', strtotime($cita->fecha));
        $hora = substr((string) ($cita->hora_inicio ?? '08:00'), 0, 5);

        $html = "
        <div style='font-family: Arial, sans-serif; background-color: #F6F8FB; padding: 25px;'>
            <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #D9E0EA; overflow: hidden;'>
                <div style='background-color: #9B2E17; padding: 25px; text-align: center; color: #ffffff;'>
                    <h1 style='margin: 0; font-size: 22px;'>Clínica Vida Salud</h1>
                    <p style='margin: 5px 0 0; font-size: 13px; color: #FBE6DF;'>Notificación de Cancelación de Cita</p>
                </div>
                <div style='padding: 30px; color: #16243A;'>
                    <h2 style='color: #9B2E17; margin-top: 0;'>Ficha Médica: {$cita->codigo}</h2>
                    <p style='line-height: 1.6; font-size: 15px;'>Estimado(a) <strong>{$pacienteNombre}</strong>, te informamos que tu cita médica programada para el <strong>{$fecha} a las {$hora}</strong> ha sido cancelada.</p>
                    <div style='background-color: #FFF5F5; border-left: 4px solid #9B2E17; padding: 15px; margin: 20px 0;'>
                        <p style='margin: 0; color: #7F1D1D;'><strong>Motivo Justificado:</strong> {$motivo}</p>
                    </div>
                    <p style='font-size: 14px; color: #55617A; line-height: 1.5;'>Puedes agendar una nueva cita en el horario que mejor te convenga desde tu portal web.</p>
                </div>
                <div style='background-color: #F8FAFD; padding: 15px; text-align: center; font-size: 12px; color: #8794AA; border-top: 1px solid #E2E8F0;'>
                    © ".date('Y').' Clínica Vida Salud
                </div>
            </div>
        </div>';

        return self::enviar($destinatario, "Cancelación de Cita Médica - Ficha {$cita->codigo}", $html);
    }

    /**
     * Envía código de verificación para recuperación de contraseña.
     */
    public static function enviarCodigoRecuperacion(Usuario $usuario, string $codigo): bool
    {
        $usuario->loadMissing('persona');
        $destinatario = trim((string) ($usuario->persona?->email));

        if (! filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $nombre = trim($usuario->persona?->nombres ?? $usuario->nombre_usuario);

        $html = "
        <div style='font-family: Arial, sans-serif; background-color: #F6F8FB; padding: 25px;'>
            <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #D9E0EA; overflow: hidden;'>
                <div style='background-color: #1E4E8C; padding: 25px; text-align: center; color: #ffffff;'>
                    <h1 style='margin: 0; font-size: 22px;'>Clínica Vida Salud</h1>
                    <p style='margin: 5px 0 0; font-size: 13px; color: #BFD0EA;'>Recuperación de Contraseña</p>
                </div>
                <div style='padding: 30px; color: #16243A; text-align: center;'>
                    <h2 style='color: #1E4E8C; margin-top: 0;'>Código de Seguridad</h2>
                    <p style='line-height: 1.6; font-size: 15px;'>Hola <strong>{$nombre}</strong>, has solicitado restablecer tu contraseña. Usa el siguiente código de verificación:</p>
                    <div style='background-color: #F3F6FB; border: 2px dashed #1E4E8C; border-radius: 8px; padding: 18px; margin: 25px auto; max-width: 260px;'>
                        <span style='font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1E4E8C;'>{$codigo}</span>
                    </div>
                    <p style='font-size: 13px; color: #55617A;'>Este código vencerá en 15 minutos por razones de seguridad. Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
                </div>
                <div style='background-color: #F8FAFD; padding: 15px; text-align: center; font-size: 12px; color: #8794AA; border-top: 1px solid #E2E8F0;'>
                    © ".date('Y').' Clínica Vida Salud
                </div>
            </div>
        </div>';

        return self::enviar($destinatario, "Código para restablecer tu contraseña: {$codigo}", $html);
    }

    /**
     * Enrutador centralizado de envío seguro vía Mail de Laravel.
     */
    protected static function enviar(string $destinatario, string $asunto, string $html): bool
    {
        try {
            Mail::html($html, function ($message) use ($destinatario, $asunto): void {
                $message->to($destinatario)
                    ->subject($asunto);
            });

            return true;
        } catch (\Throwable $e) {
            Log::warning("Fallo al enviar correo SMTP a [{$destinatario}]: ".$e->getMessage());

            return false;
        }
    }
}
