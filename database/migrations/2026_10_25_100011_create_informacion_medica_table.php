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
        Schema::create('informacion_medica', function (Blueprint $table): void {
            $table->id('id_informacion');
            $table->foreignId('id_paciente')->unique()->constrained('paciente', 'id_persona')->cascadeOnDelete();
            $table->string('tipo_sangre', 3)->nullable();
            $table->text('alergias')->nullable();
            $table->text('enfermedades_cronicas')->nullable();
            $table->text('medicamentos_habituales')->nullable();
            $table->text('antecedentes_relevantes')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamp('fecha_actualizacion')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('informacion_medica');
    }
};
