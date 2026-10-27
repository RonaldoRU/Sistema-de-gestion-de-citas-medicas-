<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            $hasEnum = DB::select("SELECT 1 FROM pg_type WHERE typname = 'tipo_accion'");
            if (!empty($hasEnum)) {
                $schemaRow = DB::select("SELECT n.nspname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'tipo_accion' LIMIT 1");
                $schema = !empty($schemaRow) ? $schemaRow[0]->nspname : 'public';
                foreach (['INACTIVAR', 'REGISTRAR', 'RENOVAR', 'REACTIVAR'] as $val) {
                    try {
                        DB::statement("ALTER TYPE {$schema}.tipo_accion ADD VALUE IF NOT EXISTS '{$val}'");
                    } catch (\Throwable $e) {
                        // Ignorar si ya existe
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
        // En PostgreSQL no es trivial remover valores de un ENUM sin recrearlo,
        // por lo que se mantiene seguro sin rollback destructivo.
    }
};
