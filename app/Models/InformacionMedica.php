<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InformacionMedica extends Model
{
    use HasFactory;

    protected $table = 'informacion_medica';
    protected $primaryKey = 'id_informacion';
    public $timestamps = false;

    protected $fillable = [
        'id_paciente',
        'tipo_sangre',
        'alergias',
        'enfermedades_cronicas',
        'medicamentos_habituales',
        'antecedentes_relevantes',
        'observaciones',
        'fecha_actualizacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_actualizacion' => 'datetime',
        ];
    }

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(Paciente::class, 'id_paciente', 'id_persona');
    }
}
