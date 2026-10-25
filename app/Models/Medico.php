<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medico extends Model
{
    use HasFactory;

    protected $table = 'medico';
    protected $primaryKey = 'id_persona';
    public $incrementing = false;

    protected $fillable = [
        'id_persona',
        'codigo',
        'matricula',
    ];

    public function persona(): BelongsTo
    {
        return $this->belongsTo(Persona::class, 'id_persona', 'id_persona');
    }

    public function especialidades(): BelongsToMany
    {
        return $this->belongsToMany(Especialidad::class, 'medico_especialidad', 'id_medico', 'id_especialidad')
            ->withPivot('fecha_asignacion');
    }

    public function horarios(): HasMany
    {
        return $this->hasMany(Horario::class, 'id_medico', 'id_persona');
    }

    public function bloqueos(): HasMany
    {
        return $this->hasMany(BloqueoAgenda::class, 'id_medico', 'id_persona');
    }

    public function citas(): HasMany
    {
        return $this->hasMany(Cita::class, 'id_medico', 'id_persona');
    }

    public function citasFuturasPendientes(): HasMany
    {
        return $this->hasMany(Cita::class, 'id_medico', 'id_persona')
            ->where('fecha', '>=', now()->toDateString())
            ->whereIn('estado', ['PROGRAMADA', 'CONFIRMADA']);
    }

    public function getNombreCompletoAttribute(): string
    {
        return $this->persona ? "{$this->persona->nombres} {$this->persona->apellidos}" : '';
    }
}
