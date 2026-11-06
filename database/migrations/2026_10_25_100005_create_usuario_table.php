<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('usuario', function (Blueprint $table): void {
            $table->id('id_usuario');
            $table->foreignId('id_persona')->unique()->constrained('persona', 'id_persona')->cascadeOnDelete();
            $table->foreignId('id_rol')->constrained('rol', 'id_rol');
            $table->string('nombre_usuario', 50)->unique();
            $table->string('hash_contrasena', 255);
            $table->string('estado', 20)->default('ACTIVO');
            $table->smallInteger('intentos_fallidos')->default(0);
            $table->timestamp('bloqueado_hasta')->nullable();
            $table->timestamp('ultimo_acceso')->nullable();
            $table->timestamp('fecha_creacion')->useCurrent();
            $table->rememberToken();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('usuario');
    }
};
