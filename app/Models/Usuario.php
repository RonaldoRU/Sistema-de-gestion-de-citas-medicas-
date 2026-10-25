<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Usuario extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'usuario';
    protected $primaryKey = 'id_usuario';
    public $timestamps = false;

    protected $fillable = [
        'id_persona',
        'id_rol',
        'nombre_usuario',
        'hash_contrasena',
        'estado',
        'intentos_fallidos',
        'bloqueado_hasta',
        'ultimo_acceso',
        'fecha_creacion',
    ];

    protected $hidden = [
        'hash_contrasena',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'intentos_fallidos' => 'integer',
            'bloqueado_hasta' => 'datetime',
            'ultimo_acceso' => 'datetime',
            'fecha_creacion' => 'datetime',
        ];
    }

    public function getAuthPasswordName(): string
    {
        return 'hash_contrasena';
    }

    public function getAuthPassword(): ?string
    {
        return $this->hash_contrasena;
    }

    public function getAuthIdentifierName(): string
    {
        return 'id_usuario';
    }

    public function persona(): BelongsTo
    {
        return $this->belongsTo(Persona::class, 'id_persona', 'id_persona');
    }

    public function rol(): BelongsTo
    {
        return $this->belongsTo(Rol::class, 'id_rol', 'id_rol');
    }

    public function sesiones(): HasMany
    {
        return $this->hasMany(Sesion::class, 'id_usuario', 'id_usuario');
    }

    public function tokensRecuperacion(): HasMany
    {
        return $this->hasMany(TokenRecuperacion::class, 'id_usuario', 'id_usuario');
    }

    public function bitacoras(): HasMany
    {
        return $this->hasMany(Bitacora::class, 'id_usuario', 'id_usuario');
    }

    public function citasRegistradas(): HasMany
    {
        return $this->hasMany(Cita::class, 'id_usuario_registro', 'id_usuario');
    }

    public function reportes(): HasMany
    {
        return $this->hasMany(Reporte::class, 'id_usuario', 'id_usuario');
    }

    public function tieneRol(string ...$roles): bool
    {
        if (!$this->rol) {
            return false;
        }

        $nombreRol = strtoupper($this->rol->nombre);
        $rolesUpper = array_map('strtoupper', $roles);

        return in_array($nombreRol, $rolesUpper, true);
    }

    public function tienePermiso(string $nombrePermiso): bool
    {
        if (!$this->rol) {
            return false;
        }

        return $this->rol->permisos->contains('nombre', $nombrePermiso);
    }

    public function esAdmin(): bool
    {
        return $this->tieneRol('ADMINISTRADOR');
    }

    public function esRecepcionista(): bool
    {
        return $this->tieneRol('RECEPCIONISTA');
    }

    public function esMedico(): bool
    {
        return $this->tieneRol('MEDICO');
    }
}
