<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BloqueoAgenda extends Model
{
    use HasFactory;

    protected $table = 'bloqueo_agenda';
    protected $primaryKey = 'id_bloqueo';

    protected $fillable = [
        'id_medico',
        'fecha_inicio',
        'fecha_fin',
        'motivo',
        'tipo',
        'aplica_a_todos',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'fecha_fin' => 'date',
            'aplica_a_todos' => 'boolean',
        ];
    }

    public function medico(): BelongsTo
    {
        return $this->belongsTo(Medico::class, 'id_medico', 'id_persona');
    }
}
