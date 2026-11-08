<?php

namespace App\Models;

use App\Models\Traits\SerializesDatesToBoliviaTime;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo ComprobantePago (Tabla 7.2 del Diccionario de Datos - Módulo P8)
 */
class ComprobantePago extends Model
{
    use HasFactory;
    use SerializesDatesToBoliviaTime;

    protected $table = 'comprobante_pago';

    protected $primaryKey = 'id_comprobante';

    public $timestamps = false;

    protected $fillable = [
        'id_pago',
        'numero',
        'fecha_emision',
        'monto_total',
        'ruta_archivo',
    ];

    protected function casts(): array
    {
        return [
            'fecha_emision' => 'datetime',
            'monto_total' => 'decimal:2',
        ];
    }

    public function pago(): BelongsTo
    {
        return $this->belongsTo(Pago::class, 'id_pago', 'id_pago');
    }
}
