<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reporte extends Model
{
    use HasFactory;

    protected $table = 'reporte';
    protected $primaryKey = 'id_reporte';
    public $timestamps = false;

    protected $fillable = [
        'id_usuario',
        'tipo',
        'fecha_desde',
        'fecha_hasta',
        'filtros',
        'formato',
        'fecha_generacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_desde' => 'date',
            'fecha_hasta' => 'date',
            'filtros' => 'array',
            'fecha_generacion' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id_usuario');
    }
}
