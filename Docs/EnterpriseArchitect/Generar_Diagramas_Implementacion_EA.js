!INC Local Scripts.EAConstants - JScript
/*
 * ==========================================================================================
 * SISTEMA CLÍNICA VIDA SALUD - DIAGRAMAS DE IMPLEMENTACIÓN ARQUITECTÓNICOS
 * ==========================================================================================
 * Descripción: Script en JScript para Sparx Systems Enterprise Architect (v14/v15/v16/v17).
 * Genera automáticamente:
 * 
 * 1. DIAGRAMA GLOBAL DE IMPLEMENTACIÓN DEL SISTEMA:
 *    - Modelado de programas y herramientas utilizadas:
 *        • Build & Package Tools: Composer 2.7, Node.js 22, npm 10, Vite 6, Tailwind CSS v4, Git
 *        • Servidores y Motores: Apache/Nginx, PHP 8.3 FPM (pdo_pgsql), PostgreSQL 16 RDBMS
 *        • Framework & ORM: Laravel 11/13, Eloquent ORM, Artisan CLI
 *        • Frontend Runtime: HTML5 semántico, Tailwind v4 compilado, api.js, Blade / Vanilla JS
 *        • Base de Datos: Esquema vida_salud, 21 tablas, Triggers PL/pgSQL, Stored Procedures
 * 
 * 2. DIAGRAMAS DE IMPLEMENTACIÓN DE LOS 8 SUBSISTEMAS (POR PAQUETES P1 A P8):
 *    - Cada paquete con su propio diagrama de implementación individual detallando:
 *        • Artefactos Frontend (Vistas HTML/Blade y scripts JS)
 *        • Controladores REST y Middlewares Laravel
 *        • Modelos Eloquent ORM y Servicios de Negocio
 *        • Tablas Relacionales PostgreSQL y Triggers/SPs
 *        • Interfaces y relaciones de dependencia inter-paquetes («use»)
 * 
 * 3. FORMATO Y DISEÑO:
 *    - Tipografía Arial tamaño 12 pt (fontsz=120) en todos los elementos y notas.
 *    - Paleta de colores corporativa armónica diferenciada por capas y programas.
 *    - Código a prueba de fallos con manejo seguro de Session, WScript y COM.
 * ==========================================================================================
 */

// Utilidad de registro en consola (100% compatible con EA Session y WScript, a prueba de fallos)
function Log(msg) {
    try {
        if (typeof Session !== "undefined") {
            Session.Output(msg);
            return;
        }
    } catch (e1) {}

    try {
        if (typeof WScript !== "undefined") {
            WScript.Echo(msg);
            return;
        }
    } catch (e2) {}
}

// Helper para convertir color Hex (#RRGGBB) a entero BGR de Enterprise Architect
function hexToBgr(hex) {
    if (hex.charAt(0) == '#') {
        hex = hex.substring(1);
    }
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return (b * 65536) + (g * 256) + r;
}

// Helper para aplicar color, bordes y tipografía Arial Tamaño 12 a un DiagramObject
function styleDiagramObject(diagObj, bgHex, borderHex, borderWidth) {
    var bgrBg = hexToBgr(bgHex);
    var bgrBorder = hexToBgr(borderHex);
    var bWidth = borderWidth || 1;

    try {
        diagObj.BackgroundColor = bgrBg;
        diagObj.BorderColor = bgrBorder;
        diagObj.BorderWidth = bWidth;
    } catch (e) {}

    // Configuración explícita de fuente Arial tamaño 12 (fontsz=120 en decipuntos)
    diagObj.Style = "BCol=" + bgrBg + ";BFmt=0;LCol=" + bgrBorder + ";LWth=" + bWidth + ";font=Arial;fontsz=120;pitch=34;";
    diagObj.Update();
}

// Helper para agregar conectores de dependencia UML («use», «manifest», etc.)
function addDependency(sourceEl, targetEl, stereotype, noteText) {
    if (sourceEl == null || targetEl == null) return null;
    try {
        var con = sourceEl.Connectors.AddNew(noteText || "", "Dependency");
        con.SupplierID = targetEl.ElementID;
        if (stereotype && stereotype.length > 0) {
            con.Stereotype = stereotype;
        }
        con.Update();
        sourceEl.Connectors.Refresh();
        return con;
    } catch (e) {
        return null;
    }
}

// =============================================================================
// CATÁLOGO DE DATOS DE LOS 8 SUBSISTEMAS DEL SISTEMA (PAQUETES P1 A P8)
// =============================================================================
var SUBSYSTEMS_DATA = [
    {
        code: "P1",
        name: "Subsistema de Seguridad, Sesiones y Autenticación",
        cus: "CU01 (Login), CU02 (Logout), CU03 (Recuperar Clave), CU04 (Bloqueo Fallido), CU37 (Auto-registro)",
        colorHeader: "#1E3A8A",
        colorBg: "#EFF6FF",
        colorBorder: "#2563EB",
        frontArtifacts: [
            "«artifact» login-stitch.html (Formulario Login)",
            "«artifact» recuperar-password.html (Restablecer)",
            "«artifact» autoregistro-paciente.html (CU37 Web)",
            "«artifact» auth.js (Gestor Tokens Bearer & Storage)"
        ],
        backendControllers: [
            "«component» SesionController (Login, Logout, Bloqueo)",
            "«component» TokenRecuperacionController (Hash temporal)",
            "«component» PersonaController (Identidad básica)",
            "«component» AutenticacionMiddleware (Verificación Bearer)"
        ],
        domainModels: [
            "«component» Model: Usuario (Hash Bcrypt, intentos)",
            "«component» Model: Sesion (Tokens activos, IP, agente)",
            "«component» Model: TokenRecuperacion (Expiración 15min)",
            "«component» Model: Persona (CI, nombres, email)"
        ],
        databaseTables: [
            "«database table» Tabla: usuario (Credenciales y estado)",
            "«database table» Tabla: sesion (Tokens y sesiones)",
            "«database table» Tabla: token_recuperacion (Hashes)",
            "«database table» Tabla: persona (Padrón de identidades)"
        ],
        dbDetails: "Triggers: fn_auditoria_usuario | SP: sp_iniciar_sesion, sp_cerrar_sesion",
        deps: ["P2: Requiere Roles y Permisos RBAC para conceder acceso", "P3: Emite eventos de auditoría a Bitácora"]
    },
    {
        code: "P2",
        name: "Subsistema de Administración de Usuarios y Roles (RBAC)",
        cus: "CU06 (Crear Usuario), CU07 (Listar Usuarios), CU08 (Modificar), CU09 (Asignar Rol), CU10 (Baja Lógica)",
        colorHeader: "#0F766E",
        colorBg: "#F0FDFA",
        colorBorder: "#0D9488",
        frontArtifacts: [
            "«artifact» usuarios-gestion-stitch.html (CRUD Usuarios)",
            "«artifact» roles-permisos.html (Matriz de Permisos)",
            "«artifact» usuarios.js (Llamadas API REST /usuarios)"
        ],
        backendControllers: [
            "«component» UsuarioController (CRUD y cambio de rol)",
            "«component» RolController (Catálogo de roles del sistema)",
            "«component» PermisoController (Permisos atómicos)",
            "«component» RolPermisoController (Sincronización RBAC)",
            "«component» VerificarRolMiddleware (Guardia de rutas)"
        ],
        domainModels: [
            "«component» Model: Usuario (Relación con Rol y Persona)",
            "«component» Model: Rol (Administrador, Recepcionista, Médico)",
            "«component» Model: Permiso (Acciones por módulo)",
            "«component» Model: RolPermiso (Tabla pivote RBAC)",
            "«component» Model: PersonalAdministrativo (Cargo y área)"
        ],
        databaseTables: [
            "«database table» Tabla: usuario",
            "«database table» Tabla: rol (Roles del sistema)",
            "«database table» Tabla: permiso (Catálogo de accesos)",
            "«database table» Tabla: rol_permiso (Asignaciones)",
            "«database table» Tabla: personal_administrativo"
        ],
        dbDetails: "Integridad referencial estricta | Triggers de bitácora en actualización de roles",
        deps: ["P1: Valida tokens para autorizar llamadas", "P3: Registra modificaciones de roles en bitácora"]
    },
    {
        code: "P3",
        name: "Subsistema de Auditoría, Trazabilidad y Bitácora",
        cus: "CU11 (Registrar Acción Automática), CU12 (Consultar y Filtrar Bitácora en Vivo)",
        colorHeader: "#4338CA",
        colorBg: "#EEF2FF",
        colorBorder: "#6366F1",
        frontArtifacts: [
            "«artifact» bitacora-auditoria-stitch.html (Visor en Vivo)",
            "«artifact» bitacora.js (Filtros por módulo, fecha, usuario)",
            "«artifact» live-stream.js (Actualización en tiempo real)"
        ],
        backendControllers: [
            "«component» BitacoraController (Endpoints /api/bitacora)",
            "«component» AuditoriaService (Servicio centralizado)",
            "«component» RegistroAuditoriaMiddleware (Captura IP y ruta)",
            "«component» BitacoraResumenService (Métricas de eventos)"
        ],
        domainModels: [
            "«component» Model: Bitacora (Evento, tabla, IP, usuario)",
            "«component» Trait: RegistraBitacora (Auto-auditoría en modelos)",
            "«component» DTO: EventoAuditoria (Estructura de payload)"
        ],
        databaseTables: [
            "«database table» Tabla: bitacora (Registro inmutable)",
            "«database table» Triggers automáticos en PostgreSQL (INSERT/UPDATE/DELETE)",
            "«database table» Índices B-Tree en id_usuario, modulo, fecha_hora"
        ],
        dbDetails: "Garantía de inmutabilidad | Disparadores nativos PL/pgSQL",
        deps: ["P1: Traza inicios y cierres de sesión", "P2: Traza modificaciones administrativas", "P6: Traza cambios en citas"]
    },
    {
        code: "P4",
        name: "Subsistema de Gestión de Pacientes y Fichas Médicas",
        cus: "CU13 (Registrar Paciente), CU14 (Información Médica), CU15 (Contacto Emergencia), CU16 (Buscar/Modificar), CU17 (Historial), CU18 (Baja Lógica)",
        colorHeader: "#0369A1",
        colorBg: "#F0F9FF",
        colorBorder: "#0284C7",
        frontArtifacts: [
            "«artifact» pacientes-gestion.html (Padrón de Pacientes)",
            "«artifact» ficha-medica.html (Información Clínica Básica)",
            "«artifact» contactos-emergencia.html (Parientes/Tutores)",
            "«artifact» pacientes.js (Consumo REST /pacientes)"
        ],
        backendControllers: [
            "«component» PacienteController (CRUD, búsqueda por CI)",
            "«component» ContactoEmergenciaController (Asignación)",
            "«component» InformacionMedicaController (Grupo sanguíneo, alergias)",
            "«component» PacienteHistorialController (Citas pasadas)"
        ],
        domainModels: [
            "«component» Model: Paciente (Código paciente, estado)",
            "«component» Model: ContactoEmergencia (Parentesco, teléfono)",
            "«component» Model: InformacionMedica (Alergias, notas)",
            "«component» Model: Persona (Datos civiles, fecha nacimiento)"
        ],
        databaseTables: [
            "«database table» Tabla: paciente",
            "«database table» Tabla: contacto_emergencia",
            "«database table» Tabla: informacion_medica",
            "«database table» Tabla: persona"
        ],
        dbDetails: "Borrado lógico (soft-delete) | Restricción de duplicados por CI",
        deps: ["P1: Permite auto-registro web de pacientes", "P6: Es el sujeto de atención de las citas médicas"]
    },
    {
        code: "P5",
        name: "Subsistema de Gestión Médica, Especialidades y Horarios",
        cus: "CU19 (Especialidades), CU20 (Personal Médico), CU21 (Configurar Horarios), CU22 (Baja Lógica Médico), CU23 (Bloqueos de Agenda)",
        colorHeader: "#15803D",
        colorBg: "#F0FDF4",
        colorBorder: "#16A34A",
        frontArtifacts: [
            "«artifact» medicos-gestion.html (Directorio Médico)",
            "«artifact» especialidades.html (Catálogo Clínico)",
            "«artifact» horarios-config.html (Bloques de Disponibilidad)",
            "«artifact» bloqueos-agenda.html (Feriados / Licencias)",
            "«artifact» medicos.js (Consumo REST /medicos)"
        ],
        backendControllers: [
            "«component» MedicoController (CRUD y asignaciones)",
            "«component» EspecialidadController (Catálogo activo)",
            "«component» MedicoEspecialidadController (Pivote)",
            "«component» HorarioController (Días, horas inicio y fin)",
            "«component» BloqueoAgendaController (Períodos inhábiles)"
        ],
        domainModels: [
            "«component» Model: Medico (Nro colegiatura, consultorio)",
            "«component» Model: Especialidad (Nombre, descripción)",
            "«component» Model: MedicoEspecialidad (Vínculo profesional)",
            "«component» Model: Horario (Día semana, rango horario)",
            "«component» Model: BloqueoAgenda (Motivo, rango fechas)"
        ],
        databaseTables: [
            "«database table» Tabla: medico",
            "«database table» Tabla: especialidad",
            "«database table» Tabla: medico_especialidad",
            "«database table» Tabla: horario",
            "«database table» Tabla: bloqueo_agenda"
        ],
        dbDetails: "Validación de traslapes en horarios de médicos | Restricción de consultorios",
        deps: ["P4: Consulta médicos para derivaciones", "P6: Provee la matriz de disponibilidad horaria para citas"]
    },
    {
        code: "P6",
        name: "Subsistema de Gestión de Citas Médicas y Concurrencia",
        cus: "CU24 (Disponibilidad), CU25 (Reserva Web), CU26 (Programar Cita), CU27 (Control Concurrencia), CU28 (Reprogramar), CU29 (Cancelar), CU30 (Recordatorio), CU31 (Asistencia), CU32 (Agenda Diaria), CU33 (Atención Médica)",
        colorHeader: "#B45309",
        colorBg: "#FFFBEB",
        colorBorder: "#D97706",
        frontArtifacts: [
            "«artifact» citas-agenda.html (Matriz Interactiva de Citas)",
            "«artifact» reserva-cita-web.html (Portal Paciente)",
            "«artifact» atencion-medica.html (Módulo Médico de Consulta)",
            "«artifact» notificaciones.html (Panel de Alertas y Envíos)",
            "«artifact» citas.js (Control de traslapes y estados)"
        ],
        backendControllers: [
            "«component» CitaController (CRUD, reserva, reprogramación)",
            "«component» HistorialEstadoCitaController (Máquina estados)",
            "«component» NotificacionController (Alertas y recordatorios)",
            "«component» ControlConcurrenciaService (Bloqueos de 30 min)"
        ],
        domainModels: [
            "«component» Model: Cita (Fecha, hora, estado, motivo)",
            "«component» Model: HistorialEstadoCita (PENDIENTE, CONFIRMADA, ATENDIDA, CANCELADA)",
            "«component» Model: Notificacion (Canal email/sms, estado envío)",
            "«component» ValueObject: BloqueCita (Validación 30 minutos)"
        ],
        databaseTables: [
            "«database table» Tabla: cita (Núcleo transaccional)",
            "«database table» Tabla: historial_estado_cita (Auditoría de estados)",
            "«database table» Tabla: notificacion (Despacho de recordatorios)",
            "«database table» Stored Procedure: sp_registrar_cita_segura"
        ],
        dbDetails: "Control estricto de concurrencia y prevención de doble reserva | Bloques fijos de 30 min",
        deps: ["P4: Requiere Pacientes registrados", "P5: Requiere Médicos y Horarios disponibles", "P8: Vincula el Pago de la cita"]
    },
    {
        code: "P7",
        name: "Subsistema de Reportes Administrativos y Financieros",
        cus: "CU38 (Reporte Citas Período), CU39 (Atenciones por Médico), CU40 (Control Asistencia), CU41 (Ingresos Pasarela), CU42 (Padrón Pacientes), CU43 (Exportar PDF/CSV)",
        colorHeader: "#6B21A8",
        colorBg: "#FAF5FF",
        colorBorder: "#9333EA",
        frontArtifacts: [
            "«artifact» reportes-dashboard.html (Tableros Gráficos)",
            "«artifact» filtros-reportes.html (Selector de Parámetros)",
            "«artifact» exportacion.js (Descarga directa PDF / CSV)",
            "«artifact» chart-analytics.js (Gráficos interactivos)"
        ],
        backendControllers: [
            "«component» ReporteController (Generación de datasets)",
            "«component» ExportService (Renderizado PDF / CSV stream)",
            "«component» EstadisticasService (Agrupaciones analíticas)"
        ],
        domainModels: [
            "«component» Model: Reporte (Configuración guardada)",
            "«component» DTO: DatasetReporte (Datos tabulares agregados)",
            "«component» DTO: MetricasGenerales (Kpis de la clínica)"
        ],
        databaseTables: [
            "«database table» Consultas optimizadas sobre: cita, pago, medico, paciente",
            "«database table» Vistas Materializadas / Funciones analíticas",
            "«database table» Índices B-Tree compuestos para fechas y estados"
        ],
        dbDetails: "Consultas de lectura analítica con índices compuestos y agregaciones SQL",
        deps: ["P6: Analiza datos de citas y asistencias", "P8: Analiza datos de ingresos y cobros", "P5: Filtra por especialidad y médico"]
    },
    {
        code: "P8",
        name: "Subsistema de Pasarela de Pagos, Comprobantes y Reembolsos",
        cus: "CU34 (Pago en Línea), CU35 (Confirmar Transacción y Comprobante Digital), CU36 (Historial Pagos), CU37 (Reembolso / Anulación)",
        colorHeader: "#9D174D",
        colorBg: "#FDF2F8",
        colorBorder: "#DB2777",
        frontArtifacts: [
            "«artifact» pagos-checkout.html (Pasarela de Pago Segura)",
            "«artifact» comprobante-digital.html (Ticket con QR)",
            "«artifact» pagos-historial.html (Transacciones del Paciente)",
            "«artifact» pagos.js (Integración Stripe Elements y QR Simple)"
        ],
        backendControllers: [
            "«component» PagoController (Procesar cobro, estado, webhook)",
            "«component» StripeGatewayService (Conexión API Stripe)",
            "«component» ComprobanteService (Generación comprobante digital)",
            "«component» ReembolsoService (Anulación y devolución por cancelación)"
        ],
        domainModels: [
            "«component» Model: Pago (Monto, método, referencia, estado)",
            "«component» Model: ComprobantePago (Nro comprobante, código QR)",
            "«component» Model: Reembolso (Motivo, fecha, monto devuelto)"
        ],
        databaseTables: [
            "«database table» Tabla: pago (Registro transaccional)",
            "«database table» Tabla: comprobante_pago (Comprobantes digitales)",
            "«database table» Tabla: reembolso (Devoluciones registradas)"
        ],
        dbDetails: "Cumplimiento de estándares de seguridad y firma criptográfica de webhooks",
        deps: ["P6: Habilita la confirmación de la Cita Médica", "P4: Emite el comprobante a nombre del Paciente", "P7: Provee datos de ingresos"]
    }
];

function main() {
    Log("========================================================================");
    Log(" INICIANDO GENERACIÓN DE DIAGRAMAS DE IMPLEMENTACIÓN ARQUITECTÓNICOS ");
    Log(" 1 DIAGRAMA GLOBAL + 8 DIAGRAMAS DE SUBSISTEMAS (P1 A P8) ");
    Log(" TIPOGRAFÍA: ARIAL 12 PT | FORMATO ROBUSTO COMPATIBLE CON ENTERPRISE ARCHITECT ");
    Log("========================================================================");

    var eaRepo = null;
    if (typeof Repository !== "undefined") {
        eaRepo = Repository;
    } else {
        try {
            var eaApp = new ActiveXObject("EA.App");
            eaRepo = eaApp.Repository;
        } catch (e) {
            Log("[ERROR] No se pudo obtener la instancia del Repositorio de EA: " + e.message);
            return;
        }
    }

    if (!eaRepo) {
        Log("[ERROR] El objeto Repository no está disponible.");
        return;
    }

    var targetPackage = eaRepo.GetTreeSelectedPackage();
    if (!targetPackage) {
        if (eaRepo.Models.Count > 0) {
            targetPackage = eaRepo.Models.GetAt(0);
        } else {
            Log("[ERROR] Por favor abre un modelo y selecciona un paquete en el Project Browser.");
            return;
        }
    }

    Log("[INFO] Paquete destino seleccionado: " + targetPackage.Name);

    // =========================================================================
    // 1. CREAR PAQUETE RAÍZ DE DIAGRAMAS DE IMPLEMENTACIÓN
    // =========================================================================
    var rootPkgName = "Diagramas de Implementación - Clínica Vida Salud";
    var rootPackage = targetPackage.Packages.AddNew(rootPkgName, "");
    rootPackage.Notes = "Diagramas de Implementación de la Arquitectura del Sistema Web de Clínica Vida Salud:\n" +
                        "1. Diagrama Global de Implementación: programas, herramientas de construcción (Composer, npm, Vite 6, Tailwind v4), servidor Apache/Nginx, motor PHP 8.3, framework Laravel 11/13 y RDBMS PostgreSQL 16.\n" +
                        "2. Diagramas de Implementación de los 8 Subsistemas (Paquetes P1 a P8): estructura de artefactos frontend, controladores backend, modelos de dominio, tablas de base de datos y relaciones inter-subsistemas.";
    rootPackage.Update();
    targetPackage.Packages.Refresh();

    // =========================================================================
    // 2. DIAGRAMA GLOBAL DE IMPLEMENTACIÓN DEL SISTEMA
    // =========================================================================
    Log("-> Generando Diagrama Global de Implementación del Sistema...");
    var globalDiagram = rootPackage.Diagrams.AddNew("Diagrama de Implementación - Arquitectura Global del Sistema", "Component");
    globalDiagram.Notes = "Diagrama de Implementación Global que describe la arquitectura de software física y lógica, las herramientas de construcción y desarrollo (Vite, Composer, npm, Tailwind CSS), el servidor web Nginx/Apache, el backend Laravel 11/13 con PHP 8.3 y la persistencia en PostgreSQL 16.\nTipografía estándar: Arial 12 pt.";
    try {
        globalDiagram.StyleEx = "DefaultFont=Arial;DefaultFontSize=12;";
    } catch (eStyle) {}
    globalDiagram.Update();
    rootPackage.Diagrams.Refresh();

    function addGlobalElem(name, type, stereotype, left, right, top, bottom, bgHex, borderHex, borderWidth) {
        var el = rootPackage.Elements.AddNew(name, type);
        if (stereotype && stereotype.length > 0) {
            el.Stereotype = stereotype;
        }
        el.Update();

        var coordStr = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
        var diagObj = globalDiagram.DiagramObjects.AddNew(coordStr, "");
        diagObj.ElementID = el.ElementID;
        diagObj.Update();

        if (bgHex && borderHex) {
            styleDiagramObject(diagObj, bgHex, borderHex, borderWidth || 1);
        }
        return el;
    }

    // Título Global
    var titleGlobal = rootPackage.Elements.AddNew("Título - Arquitectura Global de Implementación", "Note");
    titleGlobal.Notes = "CLÍNICA VIDA SALUD — DIAGRAMA DE IMPLEMENTACIÓN DE LA ARQUITECTURA GLOBAL DEL SISTEMA\n" +
                        "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════\n" +
                        "Herramientas de Build & Dependencias · Capa de Presentación Web · Servidor Web & Backend Laravel 11 (PHP 8.3) · PostgreSQL 16\n" +
                        "Tipografía: Arial 12 pt | Modelado de Componentes, Artefactos, Programas y Relaciones de Dependencia («manifest», «use»)";
    titleGlobal.Update();
    var titleGlobalObj = globalDiagram.DiagramObjects.AddNew("l=40;r=1820;t=-20;b=-95;", "");
    titleGlobalObj.ElementID = titleGlobal.ElementID;
    titleGlobalObj.Update();
    styleDiagramObject(titleGlobalObj, "#F8FAFC", "#1E3A8A", 2);

    // Columna 1: Herramientas de Compilación, Empaquetado y Entorno (Build Tools)
    var boxTools = addGlobalElem(
        "Herramientas de Build, Empaquetado y Dependencias (Toolchain)",
        "Boundary", "toolchain",
        40, 430, -110, -1120,
        "#F8FAFC", "#64748B", 2
    );

    var progComposer = addGlobalElem("«program» Composer 2.7\n(Gestor de Dependencias Backend PHP)", "Component", "program", 60, 410, -135, -235, "#EEF2FF", "#4F46E5", 1);
    var progNode = addGlobalElem("«program» Node.js 22 & npm 10\n(Entorno de Ejecución Frontend & Paquetes)", "Component", "program", 60, 410, -250, -350, "#F0FDF4", "#16A34A", 1);
    var progVite = addGlobalElem("«program» Vite 6 Bundler\n(Compilador y Empaquetador de Assets Web)", "Component", "program", 60, 410, -365, -465, "#FAF5FF", "#9333EA", 1);
    var progTailwind = addGlobalElem("«program» Tailwind CSS v4 Compiler\n(Motor JIT de Estilos y Utilidades CSS)", "Component", "program", 60, 410, -480, -580, "#ECFEFF", "#0891B2", 1);
    var progGit = addGlobalElem("«program» Git & GitHub Repository\n(Control de Versiones y Despliegue)", "Component", "program", 60, 410, -595, -695, "#FFF7ED", "#EA580C", 1);
    var progPest = addGlobalElem("«program» Pest PHP & PHPUnit\n(Suite de Pruebas Automatizadas del Sistema)", "Component", "program", 60, 410, -710, -810, "#FDF2F8", "#DB2777", 1);
    var progPint = addGlobalElem("«program» Laravel Pint\n(Linter y Formateador de Código PHP)", "Component", "program", 60, 410, -825, -925, "#F1F5F9", "#475569", 1);
    var progPgAdmin = addGlobalElem("«program» pgAdmin 4 / DBeaver\n(Herramienta de Administración PostgreSQL)", "Component", "program", 60, 410, -940, -1040, "#FEF9C3", "#CA8A04", 1);

    // Columna 2: Frontend Web Client Artifacts
    var boxFrontend = addGlobalElem(
        "Capa de Presentación Web (Frontend Client Artifacts)",
        "Boundary", "frontend",
        460, 860, -110, -1120,
        "#F0F9FF", "#0284C7", 2
    );

    var artHTML = addGlobalElem("«artifact» Vistas Web HTML5 / Stitch\n(login, dashboard, usuarios, citas, agenda, reportes)", "Artifact", "artifact", 480, 840, -135, -245, "#FEF3C7", "#D97706", 1);
    var artApiJs = addGlobalElem("«artifact» api.js\n(Cliente REST HTTP Asíncrono con Fetch & Bearer Tokens)", "Artifact", "artifact", 480, 840, -260, -370, "#FEF3C7", "#D97706", 1);
    var artCSS = addGlobalElem("«artifact» app.css (Tailwind v4)\n(Diseño Responsivo, Componentes y Paleta Médica)", "Artifact", "artifact", 480, 840, -385, -495, "#FEF3C7", "#D97706", 1);
    var artPortales = addGlobalElem("«component» Módulos de Interfaz de Usuario:\n• Portal Paciente Web (Auto-registro, Reserva, Pagos)\n• Portal Recepción (Admisión, Fichas, Agenda Citas)\n• Panel Médico (Agenda Diaria, Consulta y Atención)\n• Panel Administración (RBAC, Auditoría, Reportes)", "Component", "component", 480, 840, -510, -780, "#FFFFFF", "#0284C7", 1);
    var artBlade = addGlobalElem("«artifact» Componentes Blade & Layouts\n(Plantillas reutilizables del Servidor Web)", "Artifact", "artifact", 480, 840, -795, -905, "#FEF3C7", "#D97706", 1);

    // Columna 3: Servidor Web & Backend Laravel 11/13 Framework
    var boxBackend = addGlobalElem(
        "Servidor Web & Núcleo Backend (Laravel 11/13 / PHP 8.3)",
        "Boundary", "backend",
        890, 1370, -110, -1120,
        "#F8FAFC", "#1E3A8A", 2
    );

    var srvNginx = addGlobalElem("«program» Apache / Nginx Web Server\n(Reverse Proxy, SSL TLS 1.3, VirtualHost, Compresión Gzip)", "Component", "program", 910, 1350, -135, -235, "#FEF3C7", "#D97706", 1);
    var srvPHP = addGlobalElem("«program» PHP 8.3 FPM Engine\n(OpCache, extensiones pdo_pgsql, mbstring, openssl, ctype)", "Component", "program", 910, 1350, -250, -350, "#EEF2FF", "#4F46E5", 1);
    var artLaravelCore = addGlobalElem("«artifact» Núcleo Laravel 11 / 13 (`bootstrap/app.php`)\n(Inyección de dependencias, contenedor IoC, eventos y routing)", "Artifact", "artifact", 910, 1350, -365, -465, "#DBEAFE", "#2563EB", 1);

    var compControllers = addGlobalElem(
        "«component» Controladores REST API (Paquetes P1 a P8):\n" +
        "• P1: SesionController, TokenRecuperacionController\n" +
        "• P2: UsuarioController, RolController, PermisoController\n" +
        "• P3: BitacoraController, AuditoriaService en Vivo\n" +
        "• P4: PacienteController, InformacionMedicaController\n" +
        "• P5: MedicoController, HorarioController, BloqueoAgenda\n" +
        "• P6: CitaController, NotificacionController, Concurrencia\n" +
        "• P7: ReporteController (Exportación Tabular PDF / CSV)\n" +
        "• P8: PagoController (Pasarela Stripe, QR Simple, Reembolsos)",
        "Component", "component",
        910, 1350, -480, -790,
        "#FFFFFF", "#1E40AF", 1
    );

    var compORM = addGlobalElem("«component» Eloquent ORM Data Access Layer\n(21 Modelos Activos, Conexión PDO pdo_pgsql, Transacciones ACID)", "Component", "component", 910, 1350, -805, -915, "#DBEAFE", "#2563EB", 1);
    var compMiddlewares = addGlobalElem("«component» Middlewares de Seguridad y Guardias:\n(AutenticacionMiddleware, VerificarRolMiddleware, RegistroAuditoria)", "Component", "component", 910, 1350, -930, -1040, "#FFFFFF", "#1E40AF", 1);

    // Columna 4: Persistencia & PostgreSQL 16 RDBMS
    var boxDatabase = addGlobalElem(
        "Base de Datos Relacional (PostgreSQL 16 Engine)",
        "Boundary", "database",
        1400, 1820, -110, -1120,
        "#FDF8F6", "#9A3412", 2
    );

    var progPostgres = addGlobalElem("«program» PostgreSQL 16 RDBMS Engine\n(Motor Relacional Dedicado - Puerto TCP 5432)", "Component", "program", 1420, 1800, -135, -235, "#FEF9C3", "#CA8A04", 1);
    var dbSchema = addGlobalElem("«database» Base de Datos: vida_salud\n(21 Tablas Normalizadas en 3FN)", "Artifact", "database", 1420, 1800, -250, -360, "#FFEDD5", "#EA580C", 1);

    var artTablas = addGlobalElem(
        "«artifact» Esquema de Tablas (21 Entidades):\n" +
        "• Seguridad: persona, usuario, sesion, token_recuperacion\n" +
        "• RBAC: rol, permiso, rol_permiso, personal_administrativo\n" +
        "• Auditoría: bitacora\n" +
        "• Pacientes: paciente, contacto_emergencia, info_medica\n" +
        "• Médicos: medico, especialidad, medico_especialidad, horario, bloqueo_agenda\n" +
        "• Citas: cita, historial_estado_cita, notificacion\n" +
        "• Pagos: pago",
        "Artifact", "artifact",
        1420, 1800, -375, -700,
        "#FFFFFF", "#EA580C", 1
    );

    var artTriggers = addGlobalElem("«artifact» Triggers de Auditoría Automáticos (PL/pgSQL)\n(Disparo instantáneo a tabla bitacora ante INSERT/UPDATE/DELETE)", "Artifact", "artifact", 1420, 1800, -715, -825, "#FFEDD5", "#EA580C", 1);
    var artSP = addGlobalElem("«artifact» Stored Procedures y Funciones PL/pgSQL\n(sp_registrar_cita_segura, sp_verificar_traslape, sp_cerrar_sesion)", "Artifact", "artifact", 1420, 1800, -840, -950, "#FFEDD5", "#EA580C", 1);
    var artWAL = addGlobalElem("«artifact» Almacenamiento WAL & Transacciones ACID\n(Integridad Referencial, Journaling y Backups)", "Artifact", "artifact", 1420, 1800, -965, -1075, "#FFFFFF", "#9A3412", 1);

    // Conectores entre programas y artefactos de la Arquitectura Global
    Log("-> Conectando componentes de la Arquitectura Global...");
    addDependency(progVite, artCSS, "manifest", "Compila estilos");
    addDependency(progVite, artApiJs, "manifest", "Empaqueta JS");
    addDependency(progComposer, artLaravelCore, "manifest", "Instala Vendor");
    addDependency(artApiJs, compControllers, "use", "HTTPS REST API");
    addDependency(compControllers, compMiddlewares, "use", "Verifica Acceso");
    addDependency(compControllers, compORM, "use", "Persistencia Eloquent");
    addDependency(compORM, srvPHP, "use", "Extensión pdo_pgsql");
    addDependency(srvPHP, progPostgres, "use", "Socket TCP 5432");
    addDependency(progPostgres, dbSchema, "manifest", "Aloja Esquema");
    addDependency(dbSchema, artTablas, "use", "Estructura 21 Tablas");
    addDependency(artTablas, artTriggers, "use", "Dispara Auditoría");
    addDependency(compControllers, artSP, "use", "Ejecuta Stored Procedures");

    // Nota Ficha Técnica Global
    var noteGlobalRed = rootPackage.Elements.AddNew("Ficha Técnica - Especificaciones Globales", "Note");
    noteGlobalRed.Notes = "ESPECIFICACIONES DE IMPLEMENTACIÓN ARQUITECTÓNICA (Arial 12 pt)\n" +
                         "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════\n" +
                         "• Pila Tecnológica: PHP 8.3 FPM · Laravel 11/13 Framework · PostgreSQL 16 Engine · Vite 6 Bundler · Tailwind CSS v4.\n" +
                         "• Desacoplamiento: Separación estricta entre Frontend Web (HTML5/api.js), Backend REST Controllers, Capa ORM y Base de Datos Relacional.\n" +
                         "• Transaccionalidad y Seguridad: Autenticación mediante Tokens Bearer y Bcrypt, control de concurrencia en citas, auditoría inmutable en bitacora.\n" +
                         "• Suite de Calidad: 43 Casos de Uso probados y verificados mediante Pest PHP y Laravel Pint.";
    noteGlobalRed.Update();
    var noteGlobalRedObj = globalDiagram.DiagramObjects.AddNew("l=40;r=1820;t=-1135;b=-1245;", "");
    noteGlobalRedObj.ElementID = noteGlobalRed.ElementID;
    noteGlobalRedObj.Update();
    styleDiagramObject(noteGlobalRedObj, "#F1F5F9", "#334155", 1);

    globalDiagram.Update();
    try {
        eaRepo.ReloadDiagram(globalDiagram.DiagramID);
    } catch (eRel) {}

    // =========================================================================
    // 3. GENERACIÓN DE LOS 8 DIAGRAMAS DE IMPLEMENTACIÓN DE SUBSISTEMAS (P1 A P8)
    // =========================================================================
    Log("-> Creando subpaquete contenedor para los 8 Subsistemas de Software...");
    var subsPkg = rootPackage.Packages.AddNew("Subsistemas de Software (Paquetes P1 a P8)", "");
    subsPkg.Notes = "Subpaquetes y diagramas de implementación detallados para cada uno de los 8 subsistemas del sistema de citas médicas:\n" +
                    "- P1: Seguridad, Sesiones y Autenticación\n" +
                    "- P2: Administración de Usuarios y Roles (RBAC)\n" +
                    "- P3: Auditoría, Trazabilidad y Bitácora\n" +
                    "- P4: Gestión de Pacientes y Fichas Médicas\n" +
                    "- P5: Gestión Médica, Especialidades y Horarios\n" +
                    "- P6: Gestión de Citas Médicas y Concurrencia\n" +
                    "- P7: Reportes Administrativos y Financieros\n" +
                    "- P8: Pasarela de Pagos, Comprobantes y Reembolsos";
    subsPkg.Update();
    rootPackage.Packages.Refresh();

    var totalSubsistemas = 0;

    for (var s = 0; s < SUBSYSTEMS_DATA.length; s++) {
        var subData = SUBSYSTEMS_DATA[s];
        Log("-> Procesando [" + subData.code + "] " + subData.name + "...");

        // 1. Crear subpaquete individual para este subsistema
        var subPkg = subsPkg.Packages.AddNew(subData.code + " - " + subData.name, "");
        subPkg.Notes = "Diagrama de Implementación del " + subData.name + " (" + subData.code + ").\n" +
                       "Casos de Uso cubiertos: " + subData.cus + ".\n" +
                       "Detalla artefactos de presentación, componentes controladores backend, modelos de dominio, tablas de base de datos y relaciones de dependencia.";
        subPkg.Update();
        subsPkg.Packages.Refresh();

        // 2. Crear Diagrama de Implementación (Component Diagram)
        var subDiagram = subPkg.Diagrams.AddNew(subData.code + " - Diagrama de Implementación", "Component");
        subDiagram.Notes = "Diagrama de Implementación específico para " + subData.name + ".\nTipografía estándar: Arial 12 pt.";
        try {
            subDiagram.StyleEx = "DefaultFont=Arial;DefaultFontSize=12;";
        } catch (eSt) {}
        subDiagram.Update();
        subPkg.Diagrams.Refresh();

        function addSubElem(name, type, stereotype, left, right, top, bottom, bgHex, borderHex, borderWidth) {
            var el = subPkg.Elements.AddNew(name, type);
            if (stereotype && stereotype.length > 0) {
                el.Stereotype = stereotype;
            }
            el.Update();

            var coordStr = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
            var diagObj = subDiagram.DiagramObjects.AddNew(coordStr, "");
            diagObj.ElementID = el.ElementID;
            diagObj.Update();

            if (bgHex && borderHex) {
                styleDiagramObject(diagObj, bgHex, borderHex, borderWidth || 1);
            }
            return el;
        }

        // Título del Diagrama del Subsistema
        var subTitle = subPkg.Elements.AddNew("Título - " + subData.code, "Note");
        subTitle.Notes = "CLÍNICA VIDA SALUD — DIAGRAMA DE IMPLEMENTACIÓN: [" + subData.code + "] " + subData.name.toUpperCase() + "\n" +
                         "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════\n" +
                         "Casos de Uso Implementados: " + subData.cus + "\n" +
                         "Tipografía: Arial 12 pt | Artefactos Frontend · Controladores Backend · Modelos Eloquent · Tablas PostgreSQL 16";
        subTitle.Update();
        var subTitleObj = subDiagram.DiagramObjects.AddNew("l=40;r=1640;t=-20;b=-95;", "");
        subTitleObj.ElementID = subTitle.ElementID;
        subTitleObj.Update();
        styleDiagramObject(subTitleObj, subData.colorBg, subData.colorHeader, 2);

        // Bloque 1: Artefactos Frontend del Subsistema
        var boxSubFront = addSubElem("Capa de Presentación Web (Frontend)", "Boundary", "frontend", 40, 420, -110, -820, "#F8FAFC", "#0284C7", 2);
        var createdFront = [];
        for (var f = 0; f < subData.frontArtifacts.length; f++) {
            var fTop = -140 - (f * 140);
            var fBot = fTop - 110;
            var elF = addSubElem(subData.frontArtifacts[f], "Artifact", "artifact", 60, 400, fTop, fBot, "#FEF3C7", "#D97706", 1);
            createdFront.push(elF);
        }

        // Bloque 2: Controladores y Middlewares Backend (Laravel)
        var boxSubBack = addSubElem("Capa de Aplicación & Controladores (Backend)", "Boundary", "backend", 440, 830, -110, -820, "#EFF6FF", "#2563EB", 2);
        var createdBack = [];
        for (var b = 0; b < subData.backendControllers.length; b++) {
            var bTop = -140 - (b * 135);
            var bBot = bTop - 110;
            var elB = addSubElem(subData.backendControllers[b], "Component", "component", 460, 810, bTop, bBot, "#FFFFFF", "#1E40AF", 1);
            createdBack.push(elB);
        }

        // Bloque 3: Modelos de Dominio y Eloquent ORM
        var boxSubDomain = addSubElem("Capa de Dominio & Eloquent ORM", "Boundary", "domain", 850, 1240, -110, -820, "#F0FDF4", "#16A34A", 2);
        var createdDomain = [];
        for (var d = 0; d < subData.domainModels.length; d++) {
            var dTop = -140 - (d * 135);
            var dBot = dTop - 110;
            var elD = addSubElem(subData.domainModels[d], "Component", "component", 870, 1220, dTop, dBot, "#DCFCE7", "#15803D", 1);
            createdDomain.push(elD);
        }

        // Bloque 4: Tablas y Base de Datos PostgreSQL 16
        var boxSubDB = addSubElem("Capa de Base de Datos (PostgreSQL 16)", "Boundary", "database", 1260, 1640, -110, -820, "#FDF8F6", "#9A3412", 2);
        var createdDB = [];
        for (var t = 0; t < subData.databaseTables.length; t++) {
            var tTop = -140 - (t * 135);
            var tBot = tTop - 110;
            var elT = addSubElem(subData.databaseTables[t], "Artifact", "database", 1280, 1620, tTop, tBot, "#FFEDD5", "#EA580C", 1);
            createdDB.push(elT);
        }

        // Conexiones de Dependencia Interna del Subsistema
        for (var cf = 0; cf < createdFront.length; cf++) {
            if (createdBack.length > 0) {
                addDependency(createdFront[cf], createdBack[0], "use", "HTTP/REST");
            }
        }
        for (var cb = 0; cb < createdBack.length; cb++) {
            if (createdDomain.length > 0) {
                var targetDom = createdDomain[cb % createdDomain.length];
                addDependency(createdBack[cb], targetDom, "use", "Eloquent");
            }
        }
        for (var cd = 0; cd < createdDomain.length; cd++) {
            if (createdDB.length > 0) {
                var targetDB = createdDB[cd % createdDB.length];
                addDependency(createdDomain[cd], targetDB, "use", "SQL pdo_pgsql");
            }
        }

        // Ficha Técnica y Relaciones Inter-subsistemas
        var subNote = subPkg.Elements.AddNew("Ficha Técnica y Dependencias - " + subData.code, "Note");
        var depText = "";
        for (var dp = 0; dp < subData.deps.length; dp++) {
            depText += "• " + subData.deps[dp] + "\n";
        }
        subNote.Notes = "DETALLES DE IMPLEMENTACIÓN Y RELACIONES EXTERNAS («use»)\n" +
                        "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════\n" +
                        "• Base de Datos: " + subData.dbDetails + "\n" +
                        "• Dependencias Inter-paquetes:\n" + depText +
                        "• Integración: Totalmente acoplado al estándar REST de la aplicación web y compatible con los 43 Casos de Uso.";
        subNote.Update();
        var subNoteObj = subDiagram.DiagramObjects.AddNew("l=40;r=1640;t=-835;b=-950;", "");
        subNoteObj.ElementID = subNote.ElementID;
        subNoteObj.Update();
        styleDiagramObject(subNoteObj, "#F1F5F9", "#334155", 1);

        subPkg.Elements.Refresh();
        subDiagram.Update();
        try {
            eaRepo.ReloadDiagram(subDiagram.DiagramID);
        } catch (eRelSub) {}

        totalSubsistemas++;
    }

    // Refrescar y guardar vista completa en el Project Browser
    subsPkg.Packages.Refresh();
    rootPackage.Packages.Refresh();
    targetPackage.Packages.Refresh();
    eaRepo.RefreshModelView(rootPackage.PackageID);
    try {
        eaRepo.ShowInProjectView(rootPackage);
    } catch (eShow) {}

    Log("========================================================================");
    Log(" ¡PROCESO DE GENERACIÓN COMPLETADO CON ÉXITO!");
    Log(" Total de diagramas generados: 1 Diagrama Global + " + totalSubsistemas + " Diagramas de Subsistemas (P1 a P8).");
    Log(" Paquete raíz: '" + rootPkgName + "'.");
    Log(" Formato: Arial 12 pt, colores corporativos y dependencias estructuradas.");
    Log("========================================================================");

    try {
        Session.Prompt("¡Generación completada con éxito!\n\nSe han creado en Enterprise Architect:\n• 1 Diagrama Global de Implementación (programas, build tools, servidores y base de datos).\n• 8 Diagramas de Implementación de Subsistemas (P1 a P8) con sus artefactos frontend, controladores backend, modelos Eloquent y tablas PostgreSQL.\n\nTipografía unificada en Arial 12 pt.", 0);
    } catch (ePrompt) {}
}

// Iniciar ejecución
main();
