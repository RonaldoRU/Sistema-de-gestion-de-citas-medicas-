<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bitacora extends Model
{
    use HasFactory;

    protected $table = 'bitacora';
    protected $primaryKey = 'id_bitacora';
    public $timestamps = false;

    protected $fillable = [
        'id_usuario',
        'fecha_hora',
        'modulo',
        'tipo_accion',
        'tabla_afectada',
        'id_registro_afectado',
        'detalle',
        'ip',
    ];

    protected function casts(): array
    {
        return [
            'fecha_hora' => 'datetime',
            'id_registro_afectado' => 'integer',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id_usuario');
    }
}
