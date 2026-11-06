<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bitacora', function (Blueprint $table): void {
            $table->id('id_bitacora');
            $table->foreignId('id_usuario')->nullable()->constrained('usuario', 'id_usuario')->nullOnDelete();
            $table->timestamp('fecha_hora')->useCurrent();
            $table->string('modulo', 60);
            $table->string('tipo_accion', 30);
            $table->string('tabla_afectada', 60)->nullable();
            $table->bigInteger('id_registro_afectado')->nullable();
            $table->text('detalle')->nullable();
            $table->string('ip', 45)->nullable();
        });

        if (DB::getDriverName() === 'pgsql') {
            $hasEnum = DB::select("SELECT 1 FROM pg_type WHERE typname = 'tipo_accion'");
            if (! empty($hasEnum)) {
                $schemaRow = DB::select("SELECT n.nspname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'tipo_accion' LIMIT 1");
                $schema = ! empty($schemaRow) ? $schemaRow[0]->nspname : 'public';
                foreach (['INACTIVAR', 'REGISTRAR', 'RENOVAR', 'REACTIVAR'] as $val) {
                    try {
                        DB::statement("ALTER TYPE {$schema}.tipo_accion ADD VALUE IF NOT EXISTS '{$val}'");
                    } catch (Throwable $e) {
                        // Ignore if value already exists
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bitacora');
    }
};
