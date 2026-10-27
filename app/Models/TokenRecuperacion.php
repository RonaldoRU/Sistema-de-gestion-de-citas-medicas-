<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TokenRecuperacion extends Model
{
    use HasFactory;

    protected $table = 'token_recuperacion';
    protected $primaryKey = 'id_token';
    public $timestamps = false;

    protected $fillable = [
        'id_usuario',
        'token_hash',
        'fecha_generacion',
        'fecha_expiracion',
        'usado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_generacion' => 'datetime',
            'fecha_expiracion' => 'datetime',
            'usado' => 'boolean',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id_usuario');
    }

    public function esValido(): bool
    {
        return !$this->usado && $this->fecha_expiracion->isFuture();
    }
}
