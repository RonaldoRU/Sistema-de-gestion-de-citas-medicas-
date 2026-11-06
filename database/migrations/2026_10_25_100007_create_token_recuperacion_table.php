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
        Schema::create('token_recuperacion', function (Blueprint $table): void {
            $table->id('id_token');
            $table->foreignId('id_usuario')->constrained('usuario', 'id_usuario')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('fecha_generacion')->useCurrent();
            $table->timestamp('fecha_expiracion');
            $table->boolean('usado')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('token_recuperacion');
    }
};
