!INC Local Scripts.EAConstants - JScript
/*
 * ==========================================================================================
 * SISTEMA CLÍNICA VIDA SALUD - DIAGRAMA DE DESPLIEGUE ARQUITECTÓNICO (UML DEPLOYMENT)
 * ==========================================================================================
 * Descripción: Script en JScript para Sparx Systems Enterprise Architect (v14/v15/v16/v17).
 * Tipografía: Arial tamaño 12 pt (fontsz=120) en todos los elementos y notas.
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

function main() {
    Log("========================================================================");
    Log(" INICIANDO GENERACIÓN DE DIAGRAMA DE DESPLIEGUE ARQUITECTÓNICO ");
    Log(" TIPOGRAFÍA: ARIAL 12 PT | BACKEND LARAVEL 11 | POSTGRESQL 16 ");
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

    var rootPkgName = "Diagrama de Despliegue - Clínica Vida Salud";
    var rootPackage = targetPackage.Packages.AddNew(rootPkgName, "");
    rootPackage.Notes = "Diagrama de Despliegue arquitectónico de la plataforma web de Clínica Vida Salud en 4 niveles:\n" +
                        "- Nivel 1: Dispositivos Clientes y Estaciones de Trabajo (Pacientes, Recepción, Médicos, Administración).\n" +
                        "- Nivel 2: Servidor Web y de Aplicaciones (Nginx, PHP 8.3 FPM, Backend Laravel 11/13, Módulos P1-P8).\n" +
                        "- Nivel 3: Servidor de Base de Datos Relacional (PostgreSQL 16 Engine, 21 Tablas, Triggers y SP).\n" +
                        "- Nivel 4: Servicios Cloud Externos (Pasarela de Pagos Stripe/QR y Servidor SMTP de Notificaciones).\n" +
                        "Tipografía estándar: Arial tamaño 12.";
    rootPackage.Update();
    targetPackage.Packages.Refresh();

    var diagram = rootPackage.Diagrams.AddNew("Diagrama de Despliegue Arquitectónico", "Deployment");
    diagram.Notes = "Diagrama de Despliegue Físico y Lógico - Clínica Vida Salud.\n" +
                    "Tipografía configurada en Arial 12pt.\n" +
                    "Modelado integral de Nodos, Dispositivos, Ambientes de Ejecución, Artefactos, Componentes y Conectores de Comunicación.";
    try {
        diagram.StyleEx = "DefaultFont=Arial;DefaultFontSize=12;";
    } catch(eStyle) {}
    diagram.Update();
    rootPackage.Diagrams.Refresh();

    var PALETTE = {
        titleBg:        "#1E293B",
        titleBorder:    "#0F172A",
        
        clientZoneBg:   "#F8FAFC",
        clientZoneBdr:  "#64748B",
        deviceBg:       "#EFF6FF",
        deviceBdr:      "#2563EB",
        clientEnvBg:    "#FEF3C7",
        clientEnvBdr:   "#D97706",
        
        appServerBg:    "#F8FAFC",
        appServerBdr:   "#1E3A8A",
        nginxBg:        "#FEF3C7",
        nginxBdr:       "#D97706",
        phpBg:          "#EEF2FF",
        phpBdr:         "#4F46E5",
        appArtifactBg:  "#DBEAFE",
        appArtifactBdr: "#1D4ED8",
        appCompBg:      "#FFFFFF",
        appCompBdr:     "#3B82F6",

        dbServerBg:     "#FDF8F6",
        dbServerBdr:    "#9A3412",
        dbEngineBg:     "#FEF9C3",
        dbEngineBdr:    "#CA8A04",
        dbArtifactBg:   "#FFEDD5",
        dbArtifactBdr:  "#EA580C",

        cloudNodeBg:    "#F3F4F6",
        cloudNodeBdr:   "#374151",
        cloudEnvBg:     "#EDE9FE",
        cloudEnvBdr:    "#7C3AED",

        noteBg:         "#F1F5F9",
        noteBdr:        "#334155"
    };

    function addDiagElement(name, type, stereotype, left, right, top, bottom, bgHex, borderHex, borderWidth) {
        var el = rootPackage.Elements.AddNew(name, type);
        if (stereotype && stereotype.length > 0) {
            el.Stereotype = stereotype;
        }
        el.Update();

        var coordStr = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
        var diagObj = diagram.DiagramObjects.AddNew(coordStr, "");
        diagObj.ElementID = el.ElementID;
        diagObj.Update();

        if (bgHex && borderHex) {
            styleDiagramObject(diagObj, bgHex, borderHex, borderWidth || 1);
        }

        return el;
    }

    // Encabezado
    var titleEl = rootPackage.Elements.AddNew("Título - Diagrama de Despliegue", "Note");
    titleEl.Notes = "CLÍNICA VIDA SALUD - DIAGRAMA DE DESPLIEGUE ARQUITECTÓNICO FÍSICO Y LÓGICO\n" +
                    "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════\n" +
                    "Topología en 4 Tiers: Clientes Web/Móvil (LAN/WAN) · Servidor Web & Aplicaciones (Laravel 11 / PHP 8.3) · Servidor PostgreSQL 16 · Cloud Services\n" +
                    "Tipografía del Modelo: Arial 12 pt | Backend REST API (Módulos P1 a P8) | Base de Datos Relacional: 21 Tablas Normalizadas (3FN)";
    titleEl.Update();

    var titleObj = diagram.DiagramObjects.AddNew("l=40;r=1800;t=-20;b=-95;", "");
    titleObj.ElementID = titleEl.ElementID;
    titleObj.Update();
    styleDiagramObject(titleObj, PALETTE.clientZoneBg, PALETTE.appServerBdr, 2);

    // Columna 1: Dispositivos Clientes (Tier 1)
    var zoneClientes = addDiagElement(
        "Zona de Clientes y Estaciones de Trabajo (WAN / LAN Clínica)",
        "Boundary", "perimeter",
        40, 480, -110, -1180,
        PALETTE.clientZoneBg, PALETTE.clientZoneBdr, 2
    );

    var devMovil = addDiagElement(
        "«device»\nSmartphone / Móvil Paciente\n(Android / iOS)",
        "Device", "device",
        60, 460, -135, -315,
        PALETTE.deviceBg, PALETTE.deviceBdr, 1
    );
    var envMovil = addDiagElement(
        "«execution environment» Navegador Web Móvil\n(Chrome Mobile, Safari iOS - PWA)",
        "ExecutionEnvironment", "executionEnvironment",
        80, 440, -195, -250,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );
    var artMovil = addDiagElement(
        "«artifact» Web Paciente Responsive\n(HTML5, Tailwind CSS v4, api.js)",
        "Artifact", "artifact",
        80, 440, -255, -305,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );

    var devPCPaciente = addDiagElement(
        "«device»\nPC / Laptop de Paciente Web\n(Acceso Remoto por Internet WAN)",
        "Device", "device",
        60, 460, -335, -515,
        PALETTE.deviceBg, PALETTE.deviceBdr, 1
    );
    var envPCPaciente = addDiagElement(
        "«execution environment» Navegador Web Desktop\n(Google Chrome, Mozilla Firefox, Edge)",
        "ExecutionEnvironment", "executionEnvironment",
        80, 440, -395, -450,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );
    var artPCPaciente = addDiagElement(
        "«artifact» Portal Paciente Web\n(Auto-Registro CU37, Reserva CU25, Pagos CU34)",
        "Artifact", "artifact",
        80, 440, -455, -505,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );

    var devRecepcion = addDiagElement(
        "«device»\nEstación - Recepción y Admisión\n(PC de Escritorio - LAN Clínica)",
        "Device", "device",
        60, 460, -535, -715,
        PALETTE.deviceBg, PALETTE.deviceBdr, 1
    );
    var envRecepcion = addDiagElement(
        "«execution environment» Navegador Web Corporativo\n(Google Chrome / Edge Empresarial)",
        "ExecutionEnvironment", "executionEnvironment",
        80, 440, -595, -650,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );
    var artRecepcion = addDiagElement(
        "«artifact» Portal Recepción Web\n(Pacientes CU13, Citas CU26, Agenda Diaria)",
        "Artifact", "artifact",
        80, 440, -655, -705,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );

    var devMedico = addDiagElement(
        "«device»\nEstación - Consultorio Médico\n(PC / All-in-One - LAN Médica)",
        "Device", "device",
        60, 460, -735, -915,
        PALETTE.deviceBg, PALETTE.deviceBdr, 1
    );
    var envMedico = addDiagElement(
        "«execution environment» Navegador Web Médico\n(Interfaz de Consulta y Diagnóstico)",
        "ExecutionEnvironment", "executionEnvironment",
        80, 440, -795, -850,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );
    var artMedico = addDiagElement(
        "«artifact» Panel Médico Web\n(Agenda Diaria CU32, Registro Atención CU33)",
        "Artifact", "artifact",
        80, 440, -855, -905,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );

    var devAdmin = addDiagElement(
        "«device»\nEstación - Administración y Finanzas\n(PC Administrador - LAN Segura)",
        "Device", "device",
        60, 460, -935, -1165,
        PALETTE.deviceBg, PALETTE.deviceBdr, 1
    );
    var envAdmin = addDiagElement(
        "«execution environment» Navegador Web Seguro\n(Acceso con Token y Sesión RBAC)",
        "ExecutionEnvironment", "executionEnvironment",
        80, 440, -995, -1050,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );
    var artAdmin = addDiagElement(
        "«artifact» Panel Administrativo Web\n(Gestión RBAC CU06-CU10, Bitácora CU11, Reportes CU38-CU43)",
        "Artifact", "artifact",
        80, 440, -1055, -1155,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );

    // Columna 2: Servidor Web y de Aplicaciones (Tier 2)
    var nodeAppServer = addDiagElement(
        "«node»\nServidor Web y de Aplicaciones (App Server Vida Salud)\n[Ubuntu Server 24.04 LTS / Cloud VM]",
        "Node", "node",
        540, 1180, -110, -1180,
        PALETTE.appServerBg, PALETTE.appServerBdr, 2
    );

    var envNginx = addDiagElement(
        "«execution environment»\nServidor Web Nginx / Apache (Reverse Proxy, SSL TLS 1.3, VirtualHost, Gzip/Brotli)",
        "ExecutionEnvironment", "executionEnvironment",
        565, 1155, -170, -250,
        PALETTE.nginxBg, PALETTE.nginxBdr, 1
    );

    var envPHP = addDiagElement(
        "«execution environment»\nPHP 8.3 FPM Engine (OpCache, pdo_pgsql, mbstring, openssl, session_handler)",
        "ExecutionEnvironment", "executionEnvironment",
        565, 1155, -265, -345,
        PALETTE.phpBg, PALETTE.phpBdr, 1
    );

    var artLaravel = addDiagElement(
        "«artifact» Backend: Sistema_Vida_Salud (Laravel 11 / 13 Framework)",
        "Artifact", "artifact",
        565, 1155, -365, -1155,
        PALETTE.appArtifactBg, PALETTE.appArtifactBdr, 1
    );

    var compP1 = addDiagElement(
        "«component» P1: Seguridad, Sesiones y AuthController (Tokens Bearer, Hash Bcrypt, Logout)",
        "Component", "component",
        585, 1135, -415, -480,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compP2 = addDiagElement(
        "«component» P2: Usuarios y Roles RBAC (UsuarioController, RolController, Permisos)",
        "Component", "component",
        585, 1135, -490, -555,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compP3 = addDiagElement(
        "«component» P3: Auditoría y Bitácora (BitacoraController, AuditoriaService en Vivo)",
        "Component", "component",
        585, 1135, -565, -630,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compP4 = addDiagElement(
        "«component» P4: Pacientes y Fichas Médicas (PacienteController, Contactos, InfoMedica)",
        "Component", "component",
        585, 1135, -640, -705,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compP5 = addDiagElement(
        "«component» P5: Médicos, Horarios y Bloqueos (MedicoController, Especialidades, Agenda)",
        "Component", "component",
        585, 1135, -715, -780,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compP6 = addDiagElement(
        "«component» P6: Citas Médicas y Concurrencia (CitaController, Historial, Notificaciones)",
        "Component", "component",
        585, 1135, -790, -855,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compP7 = addDiagElement(
        "«component» P7: Reportes Administrativos (ReporteController - Exportación PDF / CSV)",
        "Component", "component",
        585, 1135, -865, -930,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compP8 = addDiagElement(
        "«component» P8: Pasarela de Pagos (PagoController - Stripe, QR Simple, Reembolsos)",
        "Component", "component",
        585, 1135, -940, -1005,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compORM = addDiagElement(
        "«component» Eloquent ORM Data Layer (21 Modelos Mapeados, PDO pdo_pgsql, Transacciones ACID)",
        "Component", "component",
        585, 1135, -1015, -1080,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compFrontend = addDiagElement(
        "«artifact» Frontend Assets Compilados (Vite 6, Tailwind CSS v4, api.js, Blade / Vanilla JS)",
        "Artifact", "artifact",
        585, 1135, -1090, -1145,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    // Columna 3: Base de Datos y Servicios Cloud (Tier 3 y Tier 4)
    var nodeDBServer = addDiagElement(
        "«node»\nServidor de Base de Datos Relacional (Database Server)\n[PostgreSQL 16 Dedicated Engine - SSD RAID 10]",
        "Node", "node",
        1250, 1800, -110, -680,
        PALETTE.dbServerBg, PALETTE.dbServerBdr, 2
    );

    var envPostgres = addDiagElement(
        "«execution environment»\nMotor de Base de Datos: PostgreSQL 16 RDBMS (Puerto TCP 5432)",
        "ExecutionEnvironment", "executionEnvironment",
        1275, 1775, -170, -250,
        PALETTE.dbEngineBg, PALETTE.dbEngineBdr, 1
    );

    var dbVidaSalud = addDiagElement(
        "«database» Base de Datos Relacional: vida_salud",
        "Artifact", "database",
        1275, 1775, -265, -660,
        PALETTE.dbArtifactBg, PALETTE.dbArtifactBdr, 1
    );

    var dbTablas = addDiagElement(
        "«artifact» Esquema Relacional (21 Tablas Normalizadas 3FN:\npersona, rol, permiso, usuario, paciente, cita, pago, bitacora...)",
        "Artifact", "artifact",
        1295, 1755, -320, -400,
        PALETTE.appCompBg, PALETTE.dbEngineBdr, 1
    );

    var dbTriggers = addDiagElement(
        "«artifact» Triggers de Auditoría Automática\n(Disparo instantáneo a tabla bitacora en INSERT/UPDATE/DELETE)",
        "Artifact", "artifact",
        1295, 1755, -410, -480,
        PALETTE.appCompBg, PALETTE.dbEngineBdr, 1
    );

    var dbSP = addDiagElement(
        "«artifact» Stored Procedures y Funciones PL/pgSQL\n(Control de Concurrencia y Verificación de Traslapes de Citas)",
        "Artifact", "artifact",
        1295, 1755, -490, -560,
        PALETTE.appCompBg, PALETTE.dbEngineBdr, 1
    );

    var dbACID = addDiagElement(
        "«artifact» Almacenamiento WAL y Transacciones ACID\n(Garantía de Integridad Referencial y Copias de Seguridad)",
        "Artifact", "artifact",
        1295, 1755, -570, -645,
        PALETTE.appCompBg, PALETTE.dbEngineBdr, 1
    );

    var nodePasarela = addDiagElement(
        "«node»\nPasarela de Pagos Digitales Cloud\n[Stripe / QR Simple Gateway - PCI-DSS]",
        "Node", "node",
        1250, 1800, -700, -915,
        PALETTE.cloudNodeBg, PALETTE.cloudNodeBdr, 1
    );
    var envPasarela = addDiagElement(
        "«execution environment» API de Pagos en Línea (HTTPS REST / Webhooks - Puerto 443)\n[Validación Transaccional CU34, Comprobante Digital CU35]",
        "ExecutionEnvironment", "executionEnvironment",
        1275, 1775, -765, -840,
        PALETTE.cloudEnvBg, PALETTE.cloudEnvBdr, 1
    );
    var artWebhooks = addDiagElement(
        "«artifact» Webhook Dispatcher & Firmas Criptográficas (HMAC-SHA256)",
        "Artifact", "artifact",
        1275, 1775, -845, -900,
        PALETTE.cloudEnvBg, PALETTE.cloudEnvBdr, 1
    );

    var nodeSMTP = addDiagElement(
        "«node»\nServidor de Correo y Notificaciones\n[Cloud SMTP / Alert Dispatcher Service]",
        "Node", "node",
        1250, 1800, -935, -1180,
        PALETTE.cloudNodeBg, PALETTE.cloudNodeBdr, 1
    );
    var envSMTP = addDiagElement(
        "«execution environment» Servicio SMTP sobre TLS (Puerto TCP 587)\n[Despacho Asíncrono de Recordatorios y Enlaces]",
        "ExecutionEnvironment", "executionEnvironment",
        1275, 1775, -1000, -1075,
        PALETTE.cloudEnvBg, PALETTE.cloudEnvBdr, 1
    );
    var artNotificaciones = addDiagElement(
        "«artifact» Plantillas HTML5 y Envíos (Recordatorios CU30, Claves CU03)",
        "Artifact", "artifact",
        1275, 1775, -1085, -1165,
        PALETTE.cloudEnvBg, PALETTE.cloudEnvBdr, 1
    );

    // Nota de Especificaciones
    var noteRed = rootPackage.Elements.AddNew("Ficha Técnica - Especificaciones de Red y Despliegue", "Note");
    noteRed.Notes = "ESPECIFICACIONES TÉCNICAS DE INFRAESTRUCTURA, RED Y PUERTOS DE COMUNICACIÓN\n" +
                    "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════\n" +
                    "• Enlace WAN (Pacientes): Conexión HTTPS sobre TLS 1.3 (Puerto 443) cifrado punto a punto para auto-registro, reservas y pagos.\n" +
                    "• Enlace LAN Interna (Clínica): Red Ethernet gigabit corporativa con direccionamiento privado (192.168.1.0/24) para recepción, médicos y admin.\n" +
                    "• Enlace de Datos (App Server -> PostgreSQL): Socket TCP/IP mediante extensión PDO pdo_pgsql en puerto estándar 5432 con credenciales seguras.\n" +
                    "• Pasarela de Pagos (App Server -> Stripe/QR): Llamadas HTTPS REST y recepción de Webhooks con firmas criptográficas HMAC-SHA256 (Puerto 443).\n" +
                    "• Despacho de Correo (App Server -> SMTP): Comunicación cifrada STARTTLS en puerto 587 para confirmaciones de citas y códigos de recuperación.\n" +
                    "• Optimización de Desempeño: Nginx con compresión gzip/brotli, PHP-FPM con OpCache optimizado y PostgreSQL con tuning de buffers compartidos.";
    noteRed.Update();

    var noteRedObj = diagram.DiagramObjects.AddNew("l=40;r=1800;t=-1205;b=-1325;", "");
    noteRedObj.ElementID = noteRed.ElementID;
    noteRedObj.Update();
    styleDiagramObject(noteRedObj, PALETTE.noteBg, PALETTE.noteBdr, 1);

    // Rutas de Comunicación Físicas
    function addCommPath(sourceEl, targetEl, name, stereotype) {
        if (sourceEl == null || targetEl == null) return;
        try {
            var con = sourceEl.Connectors.AddNew(name || "", "CommunicationPath");
            con.SupplierID = targetEl.ElementID;
            if (stereotype && stereotype.length > 0) {
                con.Stereotype = stereotype;
            }
            con.Update();
            sourceEl.Connectors.Refresh();
        } catch (e1) {
            try {
                var con2 = sourceEl.Connectors.AddNew(name || "", "Association");
                con2.SupplierID = targetEl.ElementID;
                if (stereotype && stereotype.length > 0) {
                    con2.Stereotype = stereotype;
                }
                con2.Update();
                sourceEl.Connectors.Refresh();
            } catch (e2) {}
        }
    }

    addCommPath(devMovil, nodeAppServer, "HTTPS / TLS 1.3 (TCP 443)", "Internet / WAN");
    addCommPath(devPCPaciente, nodeAppServer, "HTTPS / TLS 1.3 (TCP 443)", "Internet / WAN");
    addCommPath(devRecepcion, nodeAppServer, "HTTPS / TLS (TCP 443 / 80)", "LAN Clínica");
    addCommPath(devMedico, nodeAppServer, "HTTPS / TLS (TCP 443 / 80)", "LAN Médica");
    addCommPath(devAdmin, nodeAppServer, "HTTPS / TLS (TCP 443 / 80)", "LAN Segura");

    addCommPath(nodeAppServer, nodeDBServer, "TCP/IP pdo_pgsql (Puerto 5432)", "DB Connection");

    addCommPath(nodeAppServer, nodePasarela, "HTTPS REST Webhooks (Puerto 443)", "Cloud API");
    addCommPath(nodeAppServer, nodeSMTP, "SMTP sobre TLS (Puerto 587)", "Mail Dispatcher");

    // Relaciones Lógicas entre Paquetes
    function addDependency(sourceEl, targetEl, stereotype, noteText) {
        if (sourceEl == null || targetEl == null) return;
        try {
            var con = sourceEl.Connectors.AddNew(noteText || "", "Dependency");
            con.SupplierID = targetEl.ElementID;
            if (stereotype && stereotype.length > 0) {
                con.Stereotype = stereotype;
            }
            con.Update();
            sourceEl.Connectors.Refresh();
        } catch (e) {}
    }

    addDependency(compFrontend, compP1, "use", "REST API");
    addDependency(compFrontend, compP6, "use", "REST API");

    addDependency(compP1, compORM, "use", "Eloquent");
    addDependency(compP2, compORM, "use", "Eloquent");
    addDependency(compP4, compORM, "use", "Eloquent");
    addDependency(compP5, compORM, "use", "Eloquent");
    addDependency(compP6, compORM, "use", "Eloquent");
    addDependency(compP8, compORM, "use", "Eloquent");

    addDependency(compP3, compORM, "use", "Bitácora Log");

    addDependency(compORM, dbTablas, "use", "SQL pdo_pgsql");

    addDependency(compP8, envPasarela, "use", "Stripe API");
    addDependency(compP6, envSMTP, "use", "Mail Alert");

    rootPackage.Elements.Refresh();
    diagram.Update();

    try {
        eaRepo.ReloadDiagram(diagram.DiagramID);
        rootPackage.Packages.Refresh();
        targetPackage.Packages.Refresh();
        eaRepo.RefreshModelView(rootPackage.PackageID);
        eaRepo.ShowInProjectView(rootPackage);
    } catch (eRefresh) {}

    Log("========================================================================");
    Log(" ¡DIAGRAMA DE DESPLIEGUE ARQUITECTÓNICO GENERADO CON ÉXITO!");
    Log(" Formato de texto: Arial 12 pt");
    Log(" Paquete: '" + rootPkgName + "'");
    Log(" Diagrama: 'Diagrama de Despliegue Arquitectónico'");
    Log("========================================================================");

    try {
        Session.Prompt("¡Generación completada con éxito!\n\nSe ha creado el Diagrama de Despliegue con tipografía Arial tamaño 12, alineación ordenada de servidores y relaciones completas entre paquetes frontend, controladores backend (P1 a P8), ORM y base de datos PostgreSQL 16.", 0);
    } catch (ePrompt) {}
}

// Iniciar ejecución
main();
