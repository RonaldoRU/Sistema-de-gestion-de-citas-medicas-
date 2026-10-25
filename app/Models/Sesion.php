<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sesion extends Model
{
    use HasFactory;

    protected $table = 'sesion';
    protected $primaryKey = 'id_sesion';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id_sesion',
        'id_usuario',
        'fecha_inicio',
        'ultima_actividad',
        'fecha_cierre',
        'activa',
        'ip',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'datetime',
            'ultima_actividad' => 'datetime',
            'fecha_cierre' => 'datetime',
            'activa' => 'boolean',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id_usuario');
    }
}
