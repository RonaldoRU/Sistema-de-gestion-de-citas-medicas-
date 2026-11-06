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
        Schema::create('cita', function (Blueprint $table): void {
            $table->id('id_cita');
            $table->string('codigo', 12)->unique();
            $table->foreignId('id_paciente')->constrained('paciente', 'id_persona')->cascadeOnDelete();
            $table->foreignId('id_medico')->constrained('medico', 'id_persona')->cascadeOnDelete();
            $table->foreignId('id_especialidad')->constrained('especialidad', 'id_especialidad')->cascadeOnDelete();
            $table->foreignId('id_usuario_registro')->constrained('usuario', 'id_usuario');
            $table->foreignId('id_cita_origen')->nullable()->constrained('cita', 'id_cita')->nullOnDelete();
            $table->date('fecha');
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->string('motivo_consulta', 200);
            $table->string('estado', 30)->default('PROGRAMADA');
            $table->string('motivo_cancelacion', 200)->nullable();
            $table->text('observacion_atencion')->nullable();
            $table->timestamp('fecha_hora_atencion')->nullable();
            $table->timestamp('fecha_creacion')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cita');
    }
};
