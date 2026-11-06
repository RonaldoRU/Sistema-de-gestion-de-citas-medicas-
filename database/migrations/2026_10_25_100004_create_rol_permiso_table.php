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
        Schema::create('rol_permiso', function (Blueprint $table): void {
            $table->foreignId('id_rol')->constrained('rol', 'id_rol')->cascadeOnDelete();
            $table->foreignId('id_permiso')->constrained('permiso', 'id_permiso')->cascadeOnDelete();
            $table->timestamp('fecha_asignacion')->useCurrent();
            $table->primary(['id_rol', 'id_permiso']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rol_permiso');
    }
};
