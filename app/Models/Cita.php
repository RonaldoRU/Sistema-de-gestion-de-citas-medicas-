<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cita extends Model
{
    use HasFactory;

    protected $table = 'cita';
    protected $primaryKey = 'id_cita';
    public $timestamps = false;

    protected $fillable = [
        'codigo',
        'id_paciente',
        'id_medico',
        'id_especialidad',
        'id_usuario_registro',
        'id_cita_origen',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'motivo_consulta',
        'estado',
        'motivo_cancelacion',
        'observacion_atencion',
        'fecha_hora_atencion',
        'fecha_creacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
            'fecha_hora_atencion' => 'datetime',
            'fecha_creacion' => 'datetime',
        ];
    }

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(Paciente::class, 'id_paciente', 'id_persona');
    }

    public function medico(): BelongsTo
    {
        return $this->belongsTo(Medico::class, 'id_medico', 'id_persona');
    }

    public function especialidad(): BelongsTo
    {
        return $this->belongsTo(Especialidad::class, 'id_especialidad', 'id_especialidad');
    }

    public function usuarioRegistro(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'id_usuario_registro', 'id_usuario');
    }

    public function citaOrigen(): BelongsTo
    {
        return $this->belongsTo(Cita::class, 'id_cita_origen', 'id_cita');
    }

    public function citasDerivadas(): HasMany
    {
        return $this->hasMany(Cita::class, 'id_cita_origen', 'id_cita');
    }

    public function historialEstados(): HasMany
    {
        return $this->hasMany(HistorialEstadoCita::class, 'id_cita', 'id_cita');
    }

    public function notificaciones(): HasMany
    {
        return $this->hasMany(Notificacion::class, 'id_cita', 'id_cita');
    }
}
