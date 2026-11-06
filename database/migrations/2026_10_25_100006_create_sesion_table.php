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
        Schema::create('sesion', function (Blueprint $table): void {
            $table->string('id_sesion', 128)->primary();
            $table->foreignId('id_usuario')->constrained('usuario', 'id_usuario')->cascadeOnDelete();
            $table->timestamp('fecha_inicio')->useCurrent();
            $table->timestamp('ultima_actividad')->useCurrent();
            $table->timestamp('fecha_cierre')->nullable();
            $table->boolean('activa')->default(true);
            $table->string('ip', 45)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sesion');
    }
};
