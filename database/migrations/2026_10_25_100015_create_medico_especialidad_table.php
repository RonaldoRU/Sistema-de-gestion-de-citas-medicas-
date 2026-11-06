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
        Schema::create('medico_especialidad', function (Blueprint $table): void {
            $table->foreignId('id_medico')->constrained('medico', 'id_persona')->cascadeOnDelete();
            $table->foreignId('id_especialidad')->constrained('especialidad', 'id_especialidad')->cascadeOnDelete();
            $table->timestamp('fecha_asignacion')->useCurrent();
            $table->primary(['id_medico', 'id_especialidad']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medico_especialidad');
    }
};
