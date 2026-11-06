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
        Schema::create('paciente', function (Blueprint $table): void {
            $table->foreignId('id_persona')->primary()->constrained('persona', 'id_persona')->cascadeOnDelete();
            $table->string('codigo', 15)->unique();
            $table->char('sexo', 1);
            $table->date('fecha_nacimiento');
            $table->string('direccion', 200)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('paciente');
    }
};
