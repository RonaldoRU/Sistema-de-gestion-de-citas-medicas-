!INC Local Scripts.EAConstants - JScript
/*
 * ==========================================================================================
 * SISTEMA CLÍNICA VIDA SALUD - DIAGRAMA DE DESPLIEGUE EN ENTERPRISE ARCHITECT
 * ==========================================================================================
 * Descripción: Script en JScript para Enterprise Architect (Sparx Systems EA v14/v15/v16/v17).
 * Genera automáticamente el Diagrama de Despliegue (Deployment Diagram) físico y lógico
 * para la infraestructura completa de la plataforma web de Clínica Vida Salud.
 * ==========================================================================================
 */

// Utilidad de registro en consola (100% compatible con EA Session y WScript)
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

// Helper para aplicar color de fondo, borde y estilo a un DiagramObject
function styleDiagramObject(diagObj, bgHex, borderHex, borderWidth) {
    var bgrBg = hexToBgr(bgHex);
    var bgrBorder = hexToBgr(borderHex);
    var bWidth = borderWidth || 1;

    try {
        diagObj.BackgroundColor = bgrBg;
        diagObj.BorderColor = bgrBorder;
        diagObj.BorderWidth = bWidth;
    } catch (e) {}

    diagObj.Style = "BCol=" + bgrBg + ";BFmt=0;LCol=" + bgrBorder + ";LWth=" + bWidth + ";";
    diagObj.Update();
}

function main() {
    Log("========================================================================");
    Log(" INICIANDO GENERACIÓN DE DIAGRAMA DE DESPLIEGUE - CLÍNICA VIDA SALUD ");
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
    rootPackage.Notes = "Diagrama de Despliegue físico y lógico que modela los dispositivos clientes (móvil, PC de pacientes, estaciones de trabajo de recepción, consultorio médico y administración), el servidor web de aplicaciones (Laravel 11, PHP 8.3, Nginx), el servidor de base de datos (PostgreSQL 16) y los servicios cloud externos (Pasarela de Pagos y SMTP).";
    rootPackage.Update();
    targetPackage.Packages.Refresh();

    var diagram = rootPackage.Diagrams.AddNew("Diagrama de Despliegue del Sistema Web", "Deployment");
    diagram.Notes = "Arquitectura de Despliegue en 4 Niveles (Clientes, Servidor de Aplicación, Servidor de Base de Datos y Servicios Cloud Externos).\n" +
                    "Protocolos de Comunicación: HTTPS TLS 1.3 (443), TCP/IP pdo_pgsql (5432), SMTP sobre TLS (587).";
    diagram.Update();
    rootPackage.Diagrams.Refresh();

    var PALETTE = {
        titleBg:        "#1E293B",
        titleBorder:    "#0F172A",
        
        clientZoneBg:   "#F8FAFC",
        clientZoneBdr:  "#94A3B8",
        deviceBg:       "#EFF6FF",
        deviceBdr:      "#3B82F6",
        clientEnvBg:    "#FEF3C7",
        clientEnvBdr:   "#D97706",
        
        appServerBg:    "#F8FAFC",
        appServerBdr:   "#1E3A8A",
        nginxBg:        "#FEF3C7",
        nginxBdr:       "#D97706",
        phpBg:          "#E0E7FF",
        phpBdr:         "#4F46E5",
        appArtifactBg:  "#DBEAFE",
        appArtifactBdr: "#2563EB",
        appCompBg:      "#FFFFFF",
        appCompBdr:     "#3B82F6",

        dbServerBg:     "#FDF8F6",
        dbServerBdr:    "#9A3412",
        dbEngineBg:     "#FEF9C3",
        dbEngineBdr:    "#CA8A04",
        dbArtifactBg:   "#FFEDD5",
        dbArtifactBdr:  "#EA580C",

        cloudNodeBg:    "#F3F4F6",
        cloudNodeBdr:   "#4B5563",
        cloudEnvBg:     "#EDE9FE",
        cloudEnvBdr:    "#7C3AED",

        noteBg:         "#F1F5F9",
        noteBdr:        "#475569"
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
    titleEl.Notes = "SISTEMA DE GESTIÓN DE CITAS MÉDICAS «CLÍNICA VIDA SALUD»\n" +
                    "DIAGRAMA DE DESPLIEGUE FÍSICO Y LÓGICO DE LA INFRAESTRUCTURA WEB\n" +
                    "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════\n" +
                    "Arquitectura en 4 Capas de Red: Clientes WAN/LAN · Servidor de Aplicación Web (Laravel/PHP 8.3) · Servidor PostgreSQL 16 · Cloud Services";
    titleEl.Update();

    var titleObj = diagram.DiagramObjects.AddNew("l=40;r=1550;t=-20;b=-85;", "");
    titleObj.ElementID = titleEl.ElementID;
    titleObj.Update();
    styleDiagramObject(titleObj, PALETTE.clientZoneBg, PALETTE.appServerBdr, 2);

    // Columna 1: Dispositivos Clientes
    var zoneClientes = addDiagElement(
        "Zona de Clientes y Estaciones de Trabajo (WAN / LAN Clínica)",
        "Boundary", "perimeter",
        40, 450, -100, -970,
        PALETTE.clientZoneBg, PALETTE.clientZoneBdr, 2
    );

    var devMovil = addDiagElement(
        "«device»\nSmartphone / Móvil Paciente\n(Android / iOS)",
        "Device", "device",
        60, 430, -125, -275,
        PALETTE.deviceBg, PALETTE.deviceBdr, 1
    );
    var envMovil = addDiagElement(
        "«execution environment» Navegador Web Móvil\n(Chrome Mobile, Safari iOS, PWA)",
        "ExecutionEnvironment", "executionEnvironment",
        75, 415, -180, -260,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );

    var devPCPaciente = addDiagElement(
        "«device»\nPC / Laptop de Paciente Web\n(Acceso Remoto por Internet)",
        "Device", "device",
        60, 430, -295, -445,
        PALETTE.deviceBg, PALETTE.deviceBdr, 1
    );
    var envPCPaciente = addDiagElement(
        "«execution environment» Navegador Web Desktop\n(Chrome, Firefox, Safari, Edge)",
        "ExecutionEnvironment", "executionEnvironment",
        75, 415, -350, -430,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );

    var devRecepcion = addDiagElement(
        "«device»\nEstación de Trabajo - Recepción\n(PC Escritorio - LAN Clínica)",
        "Device", "device",
        60, 430, -465, -615,
        PALETTE.deviceBg, PALETTE.deviceBdr, 1
    );
    var envRecepcion = addDiagElement(
        "«artifact» Portal Recepción Web\n(Gestión Pacientes CU13, Citas CU26, Agenda)",
        "Artifact", "artifact",
        75, 415, -520, -600,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );

    var devMedico = addDiagElement(
        "«device»\nEstación - Consultorio Médico\n(PC / All-in-One - LAN Médica)",
        "Device", "device",
        60, 430, -635, -785,
        PALETTE.deviceBg, PALETTE.deviceBdr, 1
    );
    var envMedico = addDiagElement(
        "«artifact» Panel Médico Web\n(Agenda Diaria CU32, Registro Atención CU33)",
        "Artifact", "artifact",
        75, 415, -690, -770,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );

    var devAdmin = addDiagElement(
        "«device»\nEstación - Administración y Finanzas\n(PC Administrador - LAN Segura)",
        "Device", "device",
        60, 430, -805, -955,
        PALETTE.deviceBg, PALETTE.deviceBdr, 1
    );
    var envAdmin = addDiagElement(
        "«artifact» Panel Administrativo Web\n(Usuarios RBAC CU06-CU10, Bitácora, Reportes)",
        "Artifact", "artifact",
        75, 415, -860, -940,
        PALETTE.clientEnvBg, PALETTE.clientEnvBdr, 1
    );

    // Columna 2: Servidor Web y de Aplicaciones
    var nodeAppServer = addDiagElement(
        "«node»\nServidor Web y de Aplicaciones (App Server Vida Salud)\n[Ubuntu Server 24.04 LTS / Cloud VM]",
        "Node", "node",
        510, 1020, -100, -970,
        PALETTE.appServerBg, PALETTE.appServerBdr, 2
    );

    var envNginx = addDiagElement(
        "«execution environment»\nServidor Web Nginx / Apache (Reverse Proxy, SSL TLS 1.3, VirtualHost, Gzip)",
        "ExecutionEnvironment", "executionEnvironment",
        535, 995, -160, -250,
        PALETTE.nginxBg, PALETTE.nginxBdr, 1
    );

    var envPHP = addDiagElement(
        "«execution environment»\nPHP 8.3 FPM Engine (OpCache, pdo_pgsql, mbstring, openssl, session_handler)",
        "ExecutionEnvironment", "executionEnvironment",
        535, 995, -265, -355,
        PALETTE.phpBg, PALETTE.phpBdr, 1
    );

    var artLaravel = addDiagElement(
        "«artifact» Backend: Sistema_Vida_Salud (Laravel 11 / 13 Framework)",
        "Artifact", "artifact",
        535, 995, -375, -945,
        PALETTE.appArtifactBg, PALETTE.appArtifactBdr, 1
    );

    var compSeguridad = addDiagElement(
        "«component» Módulo P1/P2: Seguridad, RBAC y AuthController (Bearer Tokens & Hash)",
        "Component", "component",
        555, 975, -425, -490,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compCitas = addDiagElement(
        "«component» Módulo P6: CitaController & Control Concurrencia (Bloqueo 30 min)",
        "Component", "component",
        555, 975, -505, -570,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compMedicos = addDiagElement(
        "«component» Módulo P4/P5: PacienteController, MedicoController y Horarios",
        "Component", "component",
        555, 975, -585, -650,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compAuditoria = addDiagElement(
        "«component» Módulo P3: AuditoriaService (Registro en Bitácora y Trazabilidad)",
        "Component", "component",
        555, 975, -665, -730,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compReportes = addDiagElement(
        "«component» Módulo P7: ReporteController (Exportación PDF / CSV de Atenciones)",
        "Component", "component",
        555, 975, -745, -810,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compORM = addDiagElement(
        "«component» Eloquent ORM & Data Layer (Conexión PDO PostgreSQL, 21 Modelos)",
        "Component", "component",
        555, 975, -825, -885,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    var compFrontend = addDiagElement(
        "«artifact» Assets Frontend Compilados (Vite 6, Tailwind CSS v4, Vanilla JS / Blade)",
        "Artifact", "artifact",
        555, 975, -895, -935,
        PALETTE.appCompBg, PALETTE.appCompBdr, 1
    );

    // Columna 3: Base de Datos y Servicios Cloud
    var nodeDBServer = addDiagElement(
        "«node»\nServidor de Base de Datos (Database Server)\n[PostgreSQL 16 Engine Dedicated - SSD RAID 10]",
        "Node", "node",
        1080, 1550, -100, -560,
        PALETTE.dbServerBg, PALETTE.dbServerBdr, 2
    );

    var envPostgres = addDiagElement(
        "«execution environment»\nMotor de Base de Datos: PostgreSQL 16 RDBMS (Puerto TCP 5432)",
        "ExecutionEnvironment", "executionEnvironment",
        1105, 1525, -160, -250,
        PALETTE.dbEngineBg, PALETTE.dbEngineBdr, 1
    );

    var dbVidaSalud = addDiagElement(
        "«database» Base de Datos Relacional: vida_salud",
        "Artifact", "database",
        1105, 1525, -265, -535,
        PALETTE.dbArtifactBg, PALETTE.dbArtifactBdr, 1
    );

    var dbTablas = addDiagElement(
        "«artifact» Esquema Relacional (21 Tablas Normalizadas 3FN: usuario, paciente, cita, pago)",
        "Artifact", "artifact",
        1125, 1505, -315, -375,
        PALETTE.appCompBg, PALETTE.dbEngineBdr, 1
    );

    var dbTriggers = addDiagElement(
        "«artifact» Triggers de Auditoría Automática (Disparo instantáneo a tabla bitacora)",
        "Artifact", "artifact",
        1125, 1505, -390, -450,
        PALETTE.appCompBg, PALETTE.dbEngineBdr, 1
    );

    var dbSP = addDiagElement(
        "«artifact» Stored Procedures & Funciones PL/pgSQL (Integridad transaccional ACID)",
        "Artifact", "artifact",
        1125, 1505, -465, -525,
        PALETTE.appCompBg, PALETTE.dbEngineBdr, 1
    );

    var nodePasarela = addDiagElement(
        "«node»\nPasarela de Pagos Digitales\n[Cloud Gateway - Stripe / QR Simple]",
        "Node", "node",
        1080, 1550, -585, -750,
        PALETTE.cloudNodeBg, PALETTE.cloudNodeBdr, 1
    );
    var envPasarela = addDiagElement(
        "«execution environment» API Transaccional REST / Webhooks (Puerto TCP 443)\n[Validación de Pagos CU34, Comprobante CU35]",
        "ExecutionEnvironment", "executionEnvironment",
        1105, 1525, -655, -735,
        PALETTE.cloudEnvBg, PALETTE.cloudEnvBdr, 1
    );

    var nodeSMTP = addDiagElement(
        "«node»\nServidor de Correo y Notificaciones\n[Cloud SMTP / Alert Dispatcher]",
        "Node", "node",
        1080, 1550, -775, -940,
        PALETTE.cloudNodeBg, PALETTE.cloudNodeBdr, 1
    );
    var envSMTP = addDiagElement(
        "«execution environment» Servicio SMTP / TLS (Puerto TCP 587)\n[Recordatorios CU30, Códigos de Restablecimiento CU04]",
        "ExecutionEnvironment", "executionEnvironment",
        1105, 1525, -845, -925,
        PALETTE.cloudEnvBg, PALETTE.cloudEnvBdr, 1
    );

    // Nota de Especificaciones
    var noteRed = rootPackage.Elements.AddNew("Ficha Técnica - Especificaciones de Red y Despliegue", "Note");
    noteRed.Notes = "ESPECIFICACIONES DE INFRAESTRUCTURA Y PROTOCOLOS DE COMUNICACIÓN\n" +
                    "═══════════════════════════════════════════════════════════════════════════════════════════════════════════════\n" +
                    "• Enlace WAN (Pacientes): HTTPS sobre TLS 1.3 (Puerto 443) cifrado de extremo a extremo.\n" +
                    "• Enlace LAN Interna (Clínica): Red Ethernet gigabit / Wi-Fi corporativo con direccionamiento privado (192.168.1.0/24).\n" +
                    "• Conexión de Datos (App -> DB): Socket TCP/IP mediante PDO pdo_pgsql en puerto estándar 5432 con credenciales seguras.\n" +
                    "• Integración Cloud: Webhooks HTTPS con firmas HMAC-SHA256 para pasarela de pagos y SMTP TLS en puerto 587 para alertas.\n" +
                    "• Rendimiento: PHP-FPM con OpCache optimizado, Nginx con compresión gzip/brotli y PostgreSQL con memoria compartida tuning.";
    noteRed.Update();

    var noteRedObj = diagram.DiagramObjects.AddNew("l=40;r=1550;t=-985;b=-1085;", "");
    noteRedObj.ElementID = noteRed.ElementID;
    noteRedObj.Update();
    styleDiagramObject(noteRedObj, PALETTE.noteBg, PALETTE.noteBdr, 1);

    // Rutas de Comunicación
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
    Log(" ¡DIAGRAMA DE DESPLIEGUE GENERADO CON ÉXITO EN ENTERPRISE ARCHITECT!");
    Log(" Paquete: '" + rootPkgName + "'");
    Log(" Diagrama: 'Diagrama de Despliegue del Sistema Web'");
    Log("========================================================================");

    try {
        Session.Prompt("¡Generación completada con éxito!\n\nSe ha creado el Diagrama de Despliegue con todos los dispositivos clientes, servidor de aplicación (PHP 8.3/Laravel), servidor PostgreSQL 16, servicios cloud y sus rutas de comunicación con puertos y protocolos.", 0);
    } catch (ePrompt) {}
}

// Ejecutar main
main();
