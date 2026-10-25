<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistorialEstadoCita extends Model
{
    use HasFactory;

    protected $table = 'historial_estado_cita';
    protected $primaryKey = 'id_historial';
    public $timestamps = false;

    protected $fillable = [
        'id_cita',
        'id_usuario',
        'estado_anterior',
        'estado_nuevo',
        'fecha_anterior',
        'hora_anterior',
        'motivo',
        'fecha_cambio',
    ];

    protected function casts(): array
    {
        return [
            'fecha_anterior' => 'date',
            'fecha_cambio' => 'datetime',
        ];
    }

    public function cita(): BelongsTo
    {
        return $this->belongsTo(Cita::class, 'id_cita', 'id_cita');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id_usuario');
    }
}
