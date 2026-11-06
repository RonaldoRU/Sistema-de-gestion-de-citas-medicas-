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
        Schema::create('bloqueo_agenda', function (Blueprint $table): void {
            $table->id('id_bloqueo');
            $table->foreignId('id_medico')->nullable()->constrained('medico', 'id_persona')->cascadeOnDelete();
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->string('motivo', 200);
            $table->string('tipo', 30);
            $table->boolean('aplica_a_todos')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bloqueo_agenda');
    }
};
