<?php

namespace App\Models;

use App\Models\Traits\SerializesDatesToBoliviaTime;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo Reembolso (Tabla 7.3 del Diccionario de Datos - Módulo P8)
 */
class Reembolso extends Model
{
    use HasFactory;
    use SerializesDatesToBoliviaTime;

    protected $table = 'reembolso';

    protected $primaryKey = 'id_reembolso';

    public $timestamps = false;

    protected $fillable = [
        'id_pago',
        'id_usuario_autoriza',
        'monto',
        'motivo',
        'estado',
        'fecha_solicitud',
        'fecha_procesado',
        'referencia_externa',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'fecha_solicitud' => 'datetime',
            'fecha_procesado' => 'datetime',
        ];
    }

    public function pago(): BelongsTo
    {
        return $this->belongsTo(Pago::class, 'id_pago', 'id_pago');
    }

    public function usuarioAutoriza(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'id_usuario_autoriza', 'id_usuario');
    }
}
