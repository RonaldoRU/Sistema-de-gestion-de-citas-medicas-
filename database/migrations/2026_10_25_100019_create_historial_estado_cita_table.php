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
        Schema::create('historial_estado_cita', function (Blueprint $table): void {
            $table->id('id_historial');
            $table->foreignId('id_cita')->constrained('cita', 'id_cita')->cascadeOnDelete();
            $table->foreignId('id_usuario')->constrained('usuario', 'id_usuario');
            $table->string('estado_anterior', 30)->nullable();
            $table->string('estado_nuevo', 30);
            $table->date('fecha_anterior')->nullable();
            $table->time('hora_anterior')->nullable();
            $table->string('motivo', 200)->nullable();
            $table->timestamp('fecha_cambio')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historial_estado_cita');
    }
};
