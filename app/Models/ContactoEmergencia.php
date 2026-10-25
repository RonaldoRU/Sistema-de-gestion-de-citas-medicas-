<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactoEmergencia extends Model
{
    use HasFactory;

    protected $table = 'contacto_emergencia';
    protected $primaryKey = 'id_contacto';

    protected $fillable = [
        'id_paciente',
        'nombre_completo',
        'parentesco',
        'telefono',
    ];

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(Paciente::class, 'id_paciente', 'id_persona');
    }
}
