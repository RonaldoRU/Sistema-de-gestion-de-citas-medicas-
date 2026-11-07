<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Modelo Pago (Tabla 7.1 del Diccionario de Datos - Módulo P8)
 */
class Pago extends Model
{
    use HasFactory;

    protected $table = 'pago';

    protected $primaryKey = 'id_pago';

    public $timestamps = false;

    protected $fillable = [
        'id_cita',
        'id_usuario_registro',
        'monto',
        'moneda',
        'metodo',
        'estado',
        'referencia_externa',
        'fecha_hora',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'fecha_hora' => 'datetime',
        ];
    }

    public function cita(): BelongsTo
    {
        return $this->belongsTo(Cita::class, 'id_cita', 'id_cita');
    }

    public function usuarioRegistro(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'id_usuario_registro', 'id_usuario');
    }

    public function comprobante(): HasOne
    {
        return $this->hasOne(ComprobantePago::class, 'id_pago', 'id_pago');
    }

    public function comprobantePago(): HasOne
    {
        return $this->hasOne(ComprobantePago::class, 'id_pago', 'id_pago');
    }

    public function reembolsos(): HasMany
    {
        return $this->hasMany(Reembolso::class, 'id_pago', 'id_pago');
    }
}
