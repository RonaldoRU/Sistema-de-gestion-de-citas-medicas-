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
        Schema::create('contacto_emergencia', function (Blueprint $table): void {
            $table->id('id_contacto');
            $table->foreignId('id_paciente')->constrained('paciente', 'id_persona')->cascadeOnDelete();
            $table->string('nombre_completo', 150);
            $table->string('parentesco', 40);
            $table->string('telefono', 20);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacto_emergencia');
    }
};
