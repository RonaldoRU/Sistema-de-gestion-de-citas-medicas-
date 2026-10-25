<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Superclase Abstracta / Entidad Base Persona
 */
class Persona extends Model
{
    use HasFactory;

    protected $table = 'persona';
    protected $primaryKey = 'id_persona';
    public $timestamps = false;

    protected $fillable = [
        'ci',
        'nombres',
        'apellidos',
        'telefono',
        'email',
        'activo',
        'fecha_registro',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'fecha_registro' => 'datetime',
        ];
    }

    public function usuario(): HasOne
    {
        return $this->hasOne(Usuario::class, 'id_persona', 'id_persona');
    }

    public function paciente(): HasOne
    {
        return $this->hasOne(Paciente::class, 'id_persona', 'id_persona');
    }

    public function medico(): HasOne
    {
        return $this->hasOne(Medico::class, 'id_persona', 'id_persona');
    }

    public function personalAdministrativo(): HasOne
    {
        return $this->hasOne(PersonalAdministrativo::class, 'id_persona', 'id_persona');
    }

    public function getNombreCompletoAttribute(): string
    {
        return "{$this->nombres} {$this->apellidos}";
    }
}
