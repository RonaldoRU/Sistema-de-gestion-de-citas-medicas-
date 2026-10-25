<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notificacion extends Model
{
    use HasFactory;

    protected $table = 'notificacion';
    protected $primaryKey = 'id_notificacion';

    protected $fillable = [
        'id_cita',
        'id_usuario_gestion',
        'mensaje',
        'fecha_programada',
        'fecha_envio',
        'estado',
        'intentos',
    ];

    protected function casts(): array
    {
        return [
            'fecha_programada' => 'datetime',
            'fecha_envio' => 'datetime',
            'intentos' => 'integer',
        ];
    }

    public function cita(): BelongsTo
    {
        return $this->belongsTo(Cita::class, 'id_cita', 'id_cita');
    }

    public function usuarioGestion(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'id_usuario_gestion', 'id_usuario');
    }
}
