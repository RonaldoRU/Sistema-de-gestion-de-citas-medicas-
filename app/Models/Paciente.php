<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Paciente extends Model
{
    use HasFactory;

    protected $table = 'paciente';
    protected $primaryKey = 'id_persona';
    public $incrementing = false;

    protected $fillable = [
        'id_persona',
        'codigo',
        'sexo',
        'fecha_nacimiento',
        'direccion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_nacimiento' => 'date',
        ];
    }

    public function persona(): BelongsTo
    {
        return $this->belongsTo(Persona::class, 'id_persona', 'id_persona');
    }

    public function informacionMedica(): HasOne
    {
        return $this->hasOne(InformacionMedica::class, 'id_paciente', 'id_persona');
    }

    public function contactosEmergencia(): HasMany
    {
        return $this->hasMany(ContactoEmergencia::class, 'id_paciente', 'id_persona');
    }

    public function citas(): HasMany
    {
        return $this->hasMany(Cita::class, 'id_paciente', 'id_persona');
    }

    public function citasFuturasProgramadas(): HasMany
    {
        return $this->hasMany(Cita::class, 'id_paciente', 'id_persona')
            ->where('fecha', '>=', now()->toDateString())
            ->whereIn('estado', ['PROGRAMADA', 'CONFIRMADA']);
    }

    public function getNombreCompletoAttribute(): string
    {
        return $this->persona ? "{$this->persona->nombres} {$this->persona->apellidos}" : '';
    }

    public function getCiAttribute(): ?string
    {
        return $this->persona?->ci;
    }
}
