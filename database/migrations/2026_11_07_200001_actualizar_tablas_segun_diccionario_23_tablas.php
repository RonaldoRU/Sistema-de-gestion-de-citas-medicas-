<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations according to Docs/Documento/modelo_y_diccionario_completo_de_base_de_datos_23_tablas.md.
     */
    public function up(): void
    {
        // 1. Actualizar tabla bitacora (Módulo P3: Bitácora y Auditoría General)
        if (Schema::hasTable('bitacora')) {
            Schema::table('bitacora', function (Blueprint $table): void {
                if (! Schema::hasColumn('bitacora', 'descripcion')) {
                    $table->string('descripcion', 255)->default('');
                }
                if (! Schema::hasColumn('bitacora', 'navegador')) {
                    $table->string('navegador', 255)->default('Chrome / Mozilla');
                }
            });
        }

        // 2. Actualizar tabla cita (Módulo P6: Citas Médicas y Concurrencia)
        if (Schema::hasTable('cita')) {
            Schema::table('cita', function (Blueprint $table): void {
                if (! Schema::hasColumn('cita', 'origen')) {
                    $table->string('origen', 20)->default('WEB');
                }
                if (! Schema::hasColumn('cita', 'expira_en')) {
                    $table->timestamp('expira_en')->nullable();
                }
            });
        }

        // 3. Actualizar tabla paciente (Módulo P4: Pacientes y Personas)
        if (Schema::hasTable('paciente')) {
            Schema::table('paciente', function (Blueprint $table): void {
                if (! Schema::hasColumn('paciente', 'fecha_registro')) {
                    $table->timestamp('fecha_registro')->useCurrent();
                }
            });
        }

        // 4. Crear tabla recuperacion_contrasena (Módulo P1: Tabla 2.2)
        if (! Schema::hasTable('recuperacion_contrasena')) {
            Schema::create('recuperacion_contrasena', function (Blueprint $table): void {
                $table->id('id_recuperacion');
                $table->foreignId('id_usuario')->constrained('usuario', 'id_usuario')->cascadeOnDelete();
                $table->string('token_hash', 255)->unique();
                $table->timestamp('fecha_generacion')->useCurrent();
                $table->timestamp('fecha_expiracion');
                $table->boolean('usado')->default(false);
            });
        }

        // 5. Crear tabla pago (Módulo P8: Pagos, Facturación y Reembolsos - Tabla 7.1)
        if (! Schema::hasTable('pago')) {
            Schema::create('pago', function (Blueprint $table): void {
                $table->id('id_pago');
                $table->foreignId('id_cita')->constrained('cita', 'id_cita')->cascadeOnDelete();
                $table->foreignId('id_usuario_registro')->constrained('usuario', 'id_usuario');
                $table->decimal('monto', 10, 2);
                $table->string('moneda', 5)->default('BOB');
                $table->string('metodo', 30); // TARJETA, QR, EFECTIVO
                $table->string('estado', 20); // INICIADO, APROBADO, RECHAZADO, REEMBOLSADO
                $table->string('referencia_externa', 100)->nullable()->unique();
                $table->timestamp('fecha_hora')->useCurrent();
            });
        }

        // 6. Crear tabla comprobante_pago (Módulo P8: Tabla 7.2)
        if (! Schema::hasTable('comprobante_pago')) {
            Schema::create('comprobante_pago', function (Blueprint $table): void {
                $table->id('id_comprobante');
                $table->foreignId('id_pago')->unique()->constrained('pago', 'id_pago')->cascadeOnDelete();
                $table->string('numero', 50)->unique();
                $table->timestamp('fecha_emision')->useCurrent();
                $table->decimal('monto_total', 10, 2);
                $table->string('ruta_archivo', 255);
            });
        }

        // 7. Crear tabla reembolso (Módulo P8: Tabla 7.3)
        if (! Schema::hasTable('reembolso')) {
            Schema::create('reembolso', function (Blueprint $table): void {
                $table->id('id_reembolso');
                $table->foreignId('id_pago')->constrained('pago', 'id_pago')->cascadeOnDelete();
                $table->foreignId('id_usuario_autoriza')->constrained('usuario', 'id_usuario');
                $table->decimal('monto', 10, 2);
                $table->string('motivo', 255);
                $table->string('estado', 20)->default('SOLICITADO'); // SOLICITADO, PROCESADO, RECHAZADO
                $table->timestamp('fecha_solicitud')->useCurrent();
                $table->timestamp('fecha_procesado')->nullable();
                $table->string('referencia_externa', 100)->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reembolso');
        Schema::dropIfExists('comprobante_pago');
        Schema::dropIfExists('pago');
        Schema::dropIfExists('recuperacion_contrasena');

        if (Schema::hasTable('paciente') && Schema::hasColumn('paciente', 'fecha_registro')) {
            Schema::table('paciente', function (Blueprint $table): void {
                $table->dropColumn('fecha_registro');
            });
        }

        if (Schema::hasTable('cita')) {
            Schema::table('cita', function (Blueprint $table): void {
                if (Schema::hasColumn('cita', 'expira_en')) {
                    $table->dropColumn('expira_en');
                }
                if (Schema::hasColumn('cita', 'origen')) {
                    $table->dropColumn('origen');
                }
            });
        }

        if (Schema::hasTable('bitacora')) {
            Schema::table('bitacora', function (Blueprint $table): void {
                if (Schema::hasColumn('bitacora', 'navegador')) {
                    $table->dropColumn('navegador');
                }
                if (Schema::hasColumn('bitacora', 'descripcion')) {
                    $table->dropColumn('descripcion');
                }
            });
        }
    }
};
