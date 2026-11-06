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
        Schema::create('notificacion', function (Blueprint $table): void {
            $table->id('id_notificacion');
            $table->foreignId('id_cita')->constrained('cita', 'id_cita')->cascadeOnDelete();
            $table->foreignId('id_usuario_gestion')->nullable()->constrained('usuario', 'id_usuario')->nullOnDelete();
            $table->text('mensaje');
            $table->timestamp('fecha_programada');
            $table->timestamp('fecha_envio')->nullable();
            $table->string('estado', 30)->default('PENDIENTE');
            $table->smallInteger('intentos')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notificacion');
    }
};
