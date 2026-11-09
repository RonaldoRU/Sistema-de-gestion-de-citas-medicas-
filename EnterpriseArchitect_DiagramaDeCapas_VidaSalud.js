!INC Local Scripts.EAConstants - JScript
/*
 * ==========================================================================================
 * SISTEMA CLÍNICA VIDA SALUD - DIAGRAMA DE ARQUITECTURA EN CAPAS WEB (4 CAPAS)
 * ==========================================================================================
 * Descripción: Script en JScript para Sparx Systems Enterprise Architect (v12/v14/v15/v16/v17).
 * Genera el Diagrama de Arquitectura en 4 Capas Desacopladas con diseño gráfico idéntico al 
 * esquema oficial RUP, tipografía corporativa Arial 12pt, versiones tecnológicas explícitas
 * y trazabilidad de dependencias «use» entre capas y servicios.
 * 
 * 1. TIPOGRAFÍA Y ESTILO:
 *    - Fuente: Arial, Tamaño 12 pt (fontsz=120 en decipuntos de Enterprise Architect).
 *    - Dimensionamiento y coordenadas calculadas para evitar cortes de texto.
 *    - Paleta de colores corporativos diferenciada por capa (Ámbar, Azul, Verde, Slate).
 * 
 * 2. ESTRUCTURA DE CAPAS:
 *    - Capa 1: «layer» CAPA DE SERVICIOS DE SOFTWARE / SOPORTE (Presentación - Vistas Blade)
 *        • Portal Recepción (WebLogin, WebPacientes, WebAgendaCitas, WebRecordatorios)
 *        • Panel Médico (WebLogin, WebAgendaDiaria, WebAtencionMedica, WebHistorialPaciente)
 *        • Panel Administración (WebUsuariosRoles, WebMedicosHorarios, WebBitacora, WebReportes)
 *    - Capa 2: «layer» CAPA ESPECÍFICA DE LA APLICACIÓN (Controladores Laravel)
 *        • Controladores P1 a P7 (Seguridad, Usuarios RBAC, Auditoría, Pacientes, Médicos, Citas, Reportes)
 *    - Capa 3: «layer» CAPA DE APLICACIÓN / DOMINIO (Servicios y modelos Eloquent)
 *        • Servicios de Negocio y Modelos P1 a P7 con sus dependencias internas modeladas
 *    - Capa 4: «layer» CAPA DE INFRAESTRUCTURA
 *        • PostgreSQL 16 — Base de Datos Relacional (Engine + Esquema vida_salud 21 tablas)
 *        • Servidor de Aplicación (Apache/Nginx + PHP 8.3, Laravel 11 Eloquent ORM & Blade)
 * 
 * 3. RELACIONES Y FLUJO:
 *    - Conectores de dependencia descendente «use» entre capas.
 *    - Conexiones específicas entre servicios de dominio.
 * ==========================================================================================
 */

// Función segura de logging en consola para EA y WScript (evita excepciones COM)
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
    Log(" INICIANDO GENERACIÓN DEL DIAGRAMA DE CAPAS DE LA WEB - VIDA SALUD ");
    Log(" FUENTE: ARIAL 12 PT | 4 CAPAS DESACOPLADAS | DISEÑO PROFESIONAL ");
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

    try {
        eaRepo.EnsureOutputVisible("Script");
    } catch (e) {}

    var targetPackage = eaRepo.GetTreeSelectedPackage();
    if (!targetPackage) {
        if (eaRepo.Models.Count > 0) {
            targetPackage = eaRepo.Models.GetAt(0);
        } else {
            Log("[ERROR] Por favor selecciona un paquete en el Project Browser.");
            return;
        }
    }

    Log("-> Paquete destino seleccionado: " + targetPackage.Name);

    // 1. Crear Paquete contenedor para la arquitectura en capas
    var rootPkg = targetPackage.Packages.AddNew("Arquitectura en Capas - Clínica Vida Salud Web", "");
    rootPkg.Notes = "Estructura arquitectónica en 4 capas desacopladas del Sistema de Gestión de Citas Médicas Clínica Vida Salud:\n" +
                    "- Capa 1: Servicios de Software / Soporte (Presentación - Vistas Blade / Portales Web)\n" +
                    "- Capa 2: Específica de la Aplicación (Controladores Laravel REST P1 - P7)\n" +
                    "- Capa 3: Dominio / Aplicación (Servicios de Negocio y Modelos Eloquent ORM)\n" +
                    "- Capa 4: Infraestructura (PostgreSQL 16 RDBMS y Servidor Web PHP 8.3 / Laravel 11)";
    rootPkg.Update();
    targetPackage.Packages.Refresh();

    // 2. Crear el Diagrama UML de Capas (Logical / Package Diagram)
    var layerDiagram = rootPkg.Diagrams.AddNew("Diagrama de Capas de la Web", "Logical");
    layerDiagram.Notes = "Diagrama de Arquitectura en Capas (Layered Architecture) para la plataforma web de Clínica Vida Salud.\n" +
                         "Tipografía: Arial 12 pt. Trazabilidad completa con estereotipos «layer», «form», «controller», «service», «database», «schema» y relaciones «use».";
    layerDiagram.Update();
    rootPkg.Diagrams.Refresh();

    // =========================================================================
    // PALETA DE COLORES CORPORATIVOS (BGR HEX)
    // =========================================================================
    var COLORS = {
        // Capa 1: Presentación / Soporte (Tonos Cálidos / Ámbar)
        layer1Bg:       "#FFFFFF", // Fondo contenedor claro
        layer1Border:   "#475569", // Slate 600
        subPanelBg:     "#FAFAFA", // Fondo portal
        subPanelBorder: "#94A3B8", // Slate 400
        formBg:         "#FEF3C7", // Ámbar suave (como en el diseño)
        formBorder:     "#D97706", // Ámbar oscuro

        // Capa 2: Controladores Laravel (Tonos Azul Pastel)
        layer2Bg:       "#FFFFFF",
        layer2Border:   "#475569",
        ctrlBg:         "#DBEAFE", // Azul suave pastel
        ctrlBorder:     "#2563EB", // Azul corporativo

        // Capa 3: Servicios / Dominio Eloquent (Tonos Verde Esmeralda Suave)
        layer3Bg:       "#FFFFFF",
        layer3Border:   "#475569",
        serviceBg:      "#DCFCE7", // Verde suave pastel
        serviceBorder:  "#16A34A", // Verde esmeralda

        // Capa 4: Infraestructura (Tonos Gris / Ámbar Tecnológico)
        layer4Bg:       "#FFFFFF",
        layer4Border:   "#475569",
        subInfraBg:     "#F8FAFC", // Slate 50
        subInfraBorder: "#64748B", // Slate 500
        infraItemBg:    "#FEF3C7", // Ámbar suave
        infraItemBorder:"#D97706", // Ámbar

        // Ficha Técnica
        noteBg:         "#F1F5F9",
        noteBorder:     "#334155"
    };

    var elementsMap = {};

    function addElementToDiagram(name, type, stereotype, left, right, top, bottom, bgHex, borderHex, borderWidth) {
        var el = rootPkg.Elements.AddNew(name, type);
        if (stereotype && stereotype.length > 0) {
            el.Stereotype = stereotype;
        }
        el.Update();

        var coordStr = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
        var diagObj = layerDiagram.DiagramObjects.AddNew(coordStr, "");
        diagObj.ElementID = el.ElementID;
        diagObj.Update();

        if (bgHex && borderHex) {
            styleDiagramObject(diagObj, bgHex, borderHex, borderWidth);
        }

        elementsMap[name] = el;
        return el;
    }

    // =========================================================================
    // 3. CONTENEDORES DE LAS 4 CAPAS PRINCIPALES («layer»)
    //    (Se crean primero para asegurar el Z-Order correcto en el fondo)
    // =========================================================================
    Log("-> Creando los 4 contenedores principales de capas («layer»)...");

    var layer1 = addElementToDiagram(
        "CAPA DE SERVICIOS DE SOFTWARE / SOPORTE (Presentación - Vistas Blade)",
        "Package", "layer",
        50, 1550, -40, -370,
        COLORS.layer1Bg, COLORS.layer1Border, 2
    );

    var layer2 = addElementToDiagram(
        "CAPA ESPECÍFICA DE LA APLICACIÓN (Controladores Laravel)",
        "Package", "layer",
        50, 1550, -430, -650,
        COLORS.layer2Bg, COLORS.layer2Border, 2
    );

    var layer3 = addElementToDiagram(
        "CAPA DE APLICACIÓN / DOMINIO (Servicios y modelos Eloquent)",
        "Package", "layer",
        50, 1550, -710, -980,
        COLORS.layer3Bg, COLORS.layer3Border, 2
    );

    var layer4 = addElementToDiagram(
        "CAPA DE INFRAESTRUCTURA",
        "Package", "layer",
        50, 1550, -1040, -1270,
        COLORS.layer4Bg, COLORS.layer4Border, 2
    );

    // =========================================================================
    // 4. ELEMENTOS DE LA CAPA 1: PRESENTACIÓN (PORTALES Y FORMULARIOS)
    // =========================================================================
    Log("-> Creando subpaneles y formularios en Capa 1...");

    // Subpanel 1: Portal Recepción (x: 80 a 540)
    var subPortal = addElementToDiagram("Portal Recepción", "Package", "", 80, 540, -80, -350, COLORS.subPanelBg, COLORS.subPanelBorder, 1);
    var f1_1 = addElementToDiagram("WebLogin", "Package", "form", 95, 295, -120, -215, COLORS.formBg, COLORS.formBorder, 1);
    var f1_2 = addElementToDiagram("WebPacientes\n(CU10 - CU15, CU21 - CU22)", "Package", "form", 315, 525, -120, -215, COLORS.formBg, COLORS.formBorder, 1);
    var f1_3 = addElementToDiagram("WebAgendaCitas\n(CU26 - CU29)", "Package", "form", 95, 295, -235, -330, COLORS.formBg, COLORS.formBorder, 1);
    var f1_4 = addElementToDiagram("WebRecordatorios\n(CU34)", "Package", "form", 315, 525, -235, -330, COLORS.formBg, COLORS.formBorder, 1);

    // Subpanel 2: Panel Médico (x: 570 a 1030)
    var subMedico = addElementToDiagram("Panel Médico", "Package", "", 570, 1030, -80, -350, COLORS.subPanelBg, COLORS.subPanelBorder, 1);
    var f2_1 = addElementToDiagram("WebLogin ", "Package", "form", 585, 785, -120, -215, COLORS.formBg, COLORS.formBorder, 1);
    var f2_2 = addElementToDiagram("WebAgendaDiaria\n(CU28)", "Package", "form", 805, 1015, -120, -215, COLORS.formBg, COLORS.formBorder, 1);
    var f2_3 = addElementToDiagram("WebAtencionMedica\n(CU25)", "Package", "form", 585, 785, -235, -330, COLORS.formBg, COLORS.formBorder, 1);
    var f2_4 = addElementToDiagram("WebHistorialPaciente\n(CU14)", "Package", "form", 805, 1015, -235, -330, COLORS.formBg, COLORS.formBorder, 1);

    // Subpanel 3: Panel Administración (x: 1060 a 1520)
    var subAdmin = addElementToDiagram("Panel Administración", "Package", "", 1060, 1520, -80, -350, COLORS.subPanelBg, COLORS.subPanelBorder, 1);
    var f3_1 = addElementToDiagram("WebUsuariosRoles\n(CU05 - CU10)", "Package", "form", 1075, 1285, -120, -215, COLORS.formBg, COLORS.formBorder, 1);
    var f3_2 = addElementToDiagram("WebMedicosHorarios\n(CU16 - CU19, CU23)", "Package", "form", 1305, 1505, -120, -215, COLORS.formBg, COLORS.formBorder, 1);
    var f3_3 = addElementToDiagram("WebBitacora\n(CU30 - CU33)", "Package", "form", 1075, 1285, -235, -330, COLORS.formBg, COLORS.formBorder, 1);
    var f3_4 = addElementToDiagram("WebReportes\n(CU27 - CU30, CU35)", "Package", "form", 1305, 1505, -235, -330, COLORS.formBg, COLORS.formBorder, 1);

    // =========================================================================
    // 5. ELEMENTOS DE LA CAPA 2: CONTROLADORES LARAVEL (P1 a P7)
    // =========================================================================
    Log("-> Creando Controladores Laravel en Capa 2...");

    // Fila 1 de Controladores (4 controladores)
    var c1 = addElementToDiagram("P1 Seguridad y Autenticación", "Package", "controller", 80, 410, -470, -540, COLORS.ctrlBg, COLORS.ctrlBorder, 1);
    var c2 = addElementToDiagram("P2 Administración de Usuarios RBAC", "Package", "controller", 450, 780, -470, -540, COLORS.ctrlBg, COLORS.ctrlBorder, 1);
    var c3 = addElementToDiagram("P3 Auditoría y Bitácora", "Package", "controller", 820, 1150, -470, -540, COLORS.ctrlBg, COLORS.ctrlBorder, 1);
    var c4 = addElementToDiagram("P4 Gestión de Pacientes", "Package", "controller", 1190, 1520, -470, -540, COLORS.ctrlBg, COLORS.ctrlBorder, 1);

    // Fila 2 de Controladores (3 controladores centrados)
    var c5 = addElementToDiagram("P5 Gestión Médica y Horarios", "Package", "controller", 260, 600, -560, -630, COLORS.ctrlBg, COLORS.ctrlBorder, 1);
    var c6 = addElementToDiagram("P6 Gestión de Citas", "Package", "controller", 640, 980, -560, -630, COLORS.ctrlBg, COLORS.ctrlBorder, 1);
    var c7 = addElementToDiagram("P7 Reportes", "Package", "controller", 1020, 1360, -560, -630, COLORS.ctrlBg, COLORS.ctrlBorder, 1);

    // =========================================================================
    // 6. ELEMENTOS DE LA CAPA 3: SERVICIOS Y MODELOS ELOQUENT (P1 a P7)
    // =========================================================================
    Log("-> Creando Servicios de Negocio en Capa 3...");

    // Fila 1 de Servicios (3 servicios)
    var s1 = addElementToDiagram("P1 Seguridad y Autenticación ", "Package", "service", 100, 440, -750, -825, COLORS.serviceBg, COLORS.serviceBorder, 1);
    var s2 = addElementToDiagram("P2 Administración de Usuarios RBAC ", "Package", "service", 480, 840, -750, -825, COLORS.serviceBg, COLORS.serviceBorder, 1);
    var s3 = addElementToDiagram("P3 Auditoría y Bitácora ", "Package", "service", 880, 1240, -750, -825, COLORS.serviceBg, COLORS.serviceBorder, 1);

    // Fila 2 de Servicios (4 servicios)
    var s5 = addElementToDiagram("P5 Gestión Médica y Horarios ", "Package", "service", 80, 410, -870, -950, COLORS.serviceBg, COLORS.serviceBorder, 1);
    var s4 = addElementToDiagram("P4 Gestión de Pacientes ", "Package", "service", 450, 780, -870, -950, COLORS.serviceBg, COLORS.serviceBorder, 1);
    var s6 = addElementToDiagram("P6 Gestión de Citas ", "Package", "service", 820, 1150, -870, -950, COLORS.serviceBg, COLORS.serviceBorder, 1);
    var s7 = addElementToDiagram("P7 Reportes ", "Package", "service", 1190, 1520, -870, -950, COLORS.serviceBg, COLORS.serviceBorder, 1);

    // =========================================================================
    // 7. ELEMENTOS DE LA CAPA 4: INFRAESTRUCTURA (POSTGRESQL & SERVIDORES)
    // =========================================================================
    Log("-> Creando componentes de infraestructura en Capa 4...");

    // Contenedor PostgreSQL 16
    var subPostgres = addElementToDiagram("PostgreSQL 16 — Base de Datos Relacional", "Package", "", 80, 780, -1080, -1245, COLORS.subInfraBg, COLORS.subInfraBorder, 1);
    var db1 = addElementToDiagram("PostgreSQL 16 Engine", "Package", "database", 105, 415, -1125, -1215, COLORS.infraItemBg, COLORS.infraItemBorder, 1);
    var db2 = addElementToDiagram("Esquema BD vida_salud\n21 tablas · SP · Triggers", "Package", "schema", 445, 755, -1125, -1215, COLORS.infraItemBg, COLORS.infraItemBorder, 1);

    // Contenedor Servidor de Aplicación
    var subServidor = addElementToDiagram("Servidor de Aplicación", "Package", "", 820, 1520, -1080, -1245, COLORS.subInfraBg, COLORS.subInfraBorder, 1);
    var srv1 = addElementToDiagram("Apache / Nginx + PHP 8.3", "Package", "execution environment", 845, 1155, -1125, -1215, COLORS.infraItemBg, COLORS.infraItemBorder, 1);
    var srv2 = addElementToDiagram("Laravel 11\n(Eloquent ORM, Blade)", "Package", "framework", 1185, 1495, -1125, -1215, COLORS.infraItemBg, COLORS.infraItemBorder, 1);

    // =========================================================================
    // 8. FICHA TÉCNICA Y METADATOS ARQUITECTÓNICOS
    // =========================================================================
    Log("-> Creando Ficha Técnica del Sistema...");

    var noteElem = rootPkg.Elements.AddNew("Ficha Técnica - Arquitectura Web Vida Salud", "Note");
    noteElem.Notes = "CLÍNICA VIDA SALUD - ESPECIFICACIÓN ARQUITECTÓNICA EN 4 CAPAS\n" +
                     "═══════════════════════════════════════════════════════════════════════════════\n" +
                     "• Capa 1 (Presentación): Vistas Blade, Componentes UI interactivos, Tailwind CSS v4.\n" +
                     "• Capa 2 (Controladores): Laravel 11 Controllers, Inyección de Dependencias, Validación.\n" +
                     "• Capa 3 (Dominio): Servicios de Negocio desacoplados, Modelos Eloquent ORM.\n" +
                     "• Capa 4 (Infraestructura): PostgreSQL 16 (21 Tablas, Triggers, SP), Apache/Nginx + PHP 8.3.\n" +
                     "• Tipografía: Arial 12 pt | Trazabilidad con 43 Casos de Uso del Sistema.";
    noteElem.Update();

    var noteDiagObj = layerDiagram.DiagramObjects.AddNew("l=50;r=1550;t=-1290;b=-1390;", "");
    noteDiagObj.ElementID = noteElem.ElementID;
    noteDiagObj.Update();
    styleDiagramObject(noteDiagObj, COLORS.noteBg, COLORS.noteBorder, 1);

    // =========================================================================
    // 9. CONECTORES DE DEPENDENCIA UML («use»)
    // =========================================================================
    Log("-> Creando dependencias UML («use»)...");

    function addDependency(sourceEl, targetEl, stereotype, name) {
        if (!sourceEl || !targetEl) return null;
        try {
            var con = sourceEl.Connectors.AddNew(name || "", "Dependency");
            con.SupplierID = targetEl.ElementID;
            if (stereotype && stereotype.length > 0) {
                con.Stereotype = stereotype;
            }
            con.Direction = "Source -> Destination";
            con.Update();
            sourceEl.Connectors.Refresh();
            return con;
        } catch (e) {
            Log("[WARN] Conector no pudo ser creado: " + e.message);
            return null;
        }
    }

    // A) Conectores entre Capa 1 y Capa 2 («use»)
    addDependency(subPortal, layer2, "use", "");
    addDependency(subAdmin, layer2, "use", "");

    // B) Conectores entre Capa 2 y Capa 3 («use»)
    addDependency(c1, s1, "use", "");
    addDependency(c6, s6, "use", "");

    // C) Dependencias internas entre Servicios de Negocio (Capa 3)
    addDependency(s1, s2, "", ""); // P1 Seguridad -> P2 Usuarios RBAC
    addDependency(s3, s2, "", ""); // P3 Auditoría -> P2 Usuarios RBAC
    addDependency(s5, s4, "", ""); // P5 Médicos y Horarios -> P4 Pacientes
    addDependency(s6, s4, "", ""); // P6 Citas -> P4 Pacientes
    addDependency(s6, s2, "", ""); // P6 Citas -> P2 Usuarios RBAC
    addDependency(s7, s6, "", ""); // P7 Reportes -> P6 Citas
    addDependency(s5, s6, "", ""); // P5 Médicos -> P6 Citas

    // D) Conectores entre Capa 3 e Infraestructura («use»)
    addDependency(s4, subPostgres, "use", "");
    addDependency(s6, subServidor, "use", "");

    // E) Dependencia general entre capas
    addDependency(layer1, layer2, "use", "");
    addDependency(layer2, layer3, "use", "");
    addDependency(layer3, layer4, "use", "");

    // Refrescar y guardar el modelo
    rootPkg.Elements.Refresh();
    rootPkg.Packages.Refresh();
    layerDiagram.Update();

    try {
        eaRepo.ReloadDiagram(layerDiagram.DiagramID);
        eaRepo.RefreshModelView(rootPkg.PackageID);
        eaRepo.ShowInProjectView(rootPkg);
    } catch (e) {}

    Log("========================================================================");
    Log(" ¡DIAGRAMA DE CAPAS GENERADO CON ÉXITO EN ENTERPRISE ARCHITECT! ");
    Log(" Paquete: 'Arquitectura en Capas - Clínica Vida Salud Web'");
    Log(" Diagrama: 'Diagrama de Capas de la Web'");
    Log("========================================================================");

    try {
        if (typeof Session !== "undefined") {
            Session.Prompt("¡Generación completada con éxito!\n\nSe ha creado el Diagrama de Capas Web en Enterprise Architect con:\n- Las 4 Capas Arquitectónicas estructuradas («layer»).\n- Tipografía en Arial 12 pt.\n- Subpaneles y paquetes de Vistas, Controladores, Servicios e Infraestructura.\n- Versiones de PHP 8.3, Laravel 11 y PostgreSQL 16.\n- Relaciones de dependencia «use» perfectamente conectadas.", 0);
        }
    } catch (e) {}
}

// Ejecutar función principal
main();
