<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PersonalAdministrativo extends Model
{
    use HasFactory;

    protected $table = 'personal_administrativo';
    protected $primaryKey = 'id_persona';
    public $incrementing = false;

    protected $fillable = [
        'id_persona',
        'cargo',
    ];

    public function persona(): BelongsTo
    {
        return $this->belongsTo(Persona::class, 'id_persona', 'id_persona');
    }
}
