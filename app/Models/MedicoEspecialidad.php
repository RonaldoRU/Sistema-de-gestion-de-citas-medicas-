<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicoEspecialidad extends Model
{
    use HasFactory;

    protected $table = 'medico_especialidad';
    public $timestamps = false;
    public $incrementing = false;

    protected $fillable = [
        'id_medico',
        'id_especialidad',
        'fecha_asignacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_asignacion' => 'datetime',
        ];
    }

    public function medico(): BelongsTo
    {
        return $this->belongsTo(Medico::class, 'id_medico', 'id_persona');
    }

    public function especialidad(): BelongsTo
    {
        return $this->belongsTo(Especialidad::class, 'id_especialidad', 'id_especialidad');
    }
}
