<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CodigoRecuperacion extends Model
{
    use HasFactory;

    protected $table = 'codigos_recuperacion';

    protected $fillable = [
        'ci_o_email',
        'codigo',
        'expires_at',
        'usado',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'usado' => 'boolean',
        ];
    }

    public function esValido(): bool
    {
        return !$this->usado && $this->expires_at->isFuture();
    }
}
