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
            DB::statement("ALTER TYPE vida_salud.tipo_accion ADD VALUE IF NOT EXISTS 'INACTIVAR'");
            DB::statement("ALTER TYPE vida_salud.tipo_accion ADD VALUE IF NOT EXISTS 'REGISTRAR'");
            DB::statement("ALTER TYPE vida_salud.tipo_accion ADD VALUE IF NOT EXISTS 'RENOVAR'");
            DB::statement("ALTER TYPE vida_salud.tipo_accion ADD VALUE IF NOT EXISTS 'REACTIVAR'");
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
