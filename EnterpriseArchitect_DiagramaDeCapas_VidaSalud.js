!INC Local Scripts.EAConstants - JScript

/* =========================================================================================
 * Script Name: EnterpriseArchitect_DiagramaDeCapas_VidaSalud.js
 * Author:      Clínica Vida Salud - Sistema Web de Gestión de Citas Médicas
 * Purpose:     Genera automáticamente en Sparx Systems Enterprise Architect:
 *              - Paquete contenedor "Arquitectura en Capas - Clínica Vida Salud"
 *              - Diagrama de Capas Web UML (Logical / Layered Architecture)
 *              - 4 Capas Arquitectónicas estructuradas con estereotipo «layer»:
 *                  1. Capa de Servicios de Software / Soporte (Presentación - Vistas Blade/Web)
 *                  2. Capa Específica de la Aplicación (Controladores Laravel REST)
 *                  3. Capa de Aplicación / Dominio (Servicios y Modelos Eloquent ORM)
 *                  4. Capa de Infraestructura (PostgreSQL 16 Engine/Schema & Servidores)
 *              - Subpaquetes y componentes con estereotipos («form», «controller», «service»,
 *                «database», «schema», «execution environment», «framework»)
 *              - Versiones tecnológicas explícitas (PHP 8.3, Laravel 11/13, PostgreSQL 16, Vite 6, Tailwind v4)
 *              - Relaciones de dependencia «use» entre capas y dependencias entre servicios del dominio
 *              - Paleta de colores armónica, corporativa y diferenciada por capa con soporte multi-versión EA
 *              - Nota técnica y encabezado arquitectónico con metadatos del sistema
 * Language:    JScript (Compatible con Enterprise Architect 12, 13, 14, 15, 16)
 * ========================================================================================= */

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

    // Formato de compatibilidad en Style string para todas las versiones de EA
    diagObj.Style = "BCol=" + bgrBg + ";BFmt=0;LCol=" + bgrBorder + ";LWth=" + bWidth + ";";
    diagObj.Update();
}

function main() {
    Repository.EnsureOutputVisible("Script");
    Session.Output("========================================================================");
    Session.Output(" Iniciando creación del Diagrama de Capas Web - Clínica Vida Salud ");
    Session.Output("========================================================================");

    var targetPackage = Repository.GetTreeSelectedPackage();
    if (targetPackage == null) {
        Session.Prompt("Por favor, selecciona un Paquete o Vista en el Project Browser antes de ejecutar este script.", 0);
        return;
    }

    Session.Output("Paquete destino seleccionado: " + targetPackage.Name);

    // 1. Crear Paquete raíz contenedor en el Project Browser
    var rootPkg = targetPackage.Packages.AddNew("Arquitectura en Capas - Clínica Vida Salud Web", "");
    rootPkg.Notes = "Estructura arquitectónica en 4 capas desacopladas del Sistema de Gestión de Citas Médicas Clínica Vida Salud:\n" +
                    "- Capa 1: Servicios de Software / Soporte (Presentación y Vistas)\n" +
                    "- Capa 2: Específica de la Aplicación (Controladores Laravel REST)\n" +
                    "- Capa 3: Dominio / Aplicación (Servicios de Negocio y Modelos Eloquent)\n" +
                    "- Capa 4: Infraestructura (PostgreSQL 16, Servidor Web Nginx/Apache y PHP 8.3)";
    rootPkg.Update();
    targetPackage.Packages.Refresh();

    // 2. Crear el Diagrama UML de Capas (Logical / Package Diagram)
    var layerDiagram = rootPkg.Diagrams.AddNew("Diagrama de Capas de la Web (4 Capas)", "Logical");
    layerDiagram.Notes = "Diagrama de Arquitectura en Capas (Layered Architecture) para la plataforma web de Clínica Vida Salud.\n" +
                         "Representa el desacoplamiento entre Vistas de Usuario, Controladores de Orquestación, Lógica de Negocio/Dominio e Infraestructura de Almacenamiento y Ejecución.";
    layerDiagram.Update();
    rootPkg.Diagrams.Refresh();

    // =========================================================================
    // DEFINICIÓN DE PALETA DE COLORES CORPORATIVOS (BGR HEX)
    // =========================================================================
    var COLORS = {
        // Encabezado / Banner principal
        headerBg:       "#1E293B", // Slate 800
        headerBorder:   "#0F172A", // Slate 900
        headerText:     "#FFFFFF",

        // Capa 1: Presentación / Soporte (Tonos Cálidos / Ámbar / Crema)
        layer1Bg:       "#FFFBEB", // Amber 50
        layer1Border:   "#D97706", // Amber 600
        col1Bg:         "#FEF3C7", // Amber 100
        col1Border:     "#F59E0B", // Amber 500
        formBg:         "#FFF0B3", // Dorado pastel cálido
        formBorder:     "#B45309", // Amber 700

        // Capa 2: Controladores Laravel (Tonos Azul Pastel / Corporativo)
        layer2Bg:       "#EFF6FF", // Blue 50
        layer2Border:   "#2563EB", // Blue 600
        ctrlBg:         "#DBEAFE", // Blue 100
        ctrlBorder:     "#1D4ED8", // Blue 700

        // Capa 3: Servicios / Dominio Eloquent (Tonos Verde Esmeralda / Menta)
        layer3Bg:       "#F0FDF4", // Green 50
        layer3Border:   "#16A34A", // Green 600
        serviceBg:      "#DCFCE7", // Green 100
        serviceBorder:  "#15803D", // Green 700

        // Capa 4: Infraestructura (Tonos Slate / Gris Tecnológico & Bases de Datos)
        layer4Bg:       "#F8FAFC", // Slate 50
        layer4Border:   "#475569", // Slate 600
        subInfraBg:     "#F1F5F9", // Slate 100
        subInfraBorder: "#64748B", // Slate 500
        dbBg:           "#FEF9C3", // Yellow 100
        dbBorder:       "#A16207", // Yellow 700
        serverBg:       "#FEF08A", // Yellow 200
        serverBorder:   "#CA8A04", // Yellow 600

        // Nota Técnica
        noteBg:         "#F3F4F6", // Gray 100
        noteBorder:     "#4B5563"  // Gray 600
    };

    // Colección para almacenar referencias a los elementos creados y sus diagram objects
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
    // 3. CREAR CONTENEDORES DE LAS 4 CAPAS («layer»)
    //    Se agregan primero para que queden en el fondo visual (z-order inferior)
    // =========================================================================
    Session.Output("-> Creando los 4 contenedores principales de capas...");

    var layer1 = addElementToDiagram(
        "CAPA DE SERVICIOS DE SOFTWARE / SOPORTE (Presentación - Vistas Blade)",
        "Package", "layer",
        50, 1280, -40, -290,
        COLORS.layer1Bg, COLORS.layer1Border, 2
    );

    var layer2 = addElementToDiagram(
        "CAPA ESPECÍFICA DE LA APLICACIÓN (Controladores Laravel)",
        "Package", "layer",
        50, 1280, -350, -520,
        COLORS.layer2Bg, COLORS.layer2Border, 2
    );

    var layer3 = addElementToDiagram(
        "CAPA DE APLICACIÓN / DOMINIO (Servicios y modelos Eloquent)",
        "Package", "layer",
        50, 1280, -580, -800,
        COLORS.layer3Bg, COLORS.layer3Border, 2
    );

    var layer4 = addElementToDiagram(
        "CAPA DE INFRAESTRUCTURA",
        "Package", "layer",
        50, 1280, -860, -1030,
        COLORS.layer4Bg, COLORS.layer4Border, 2
    );

    // =========================================================================
    // 4. ELEMENTOS DE LA CAPA 1: PRESENTACIÓN (PORTALES Y FORMULARIOS)
    // =========================================================================
    Session.Output("-> Agregando subpaneles y formularios de la Capa 1...");

    // Subpanel 1: Portal Recepción
    var subPortal = addElementToDiagram("Portal Recepción", "Package", "", 70, 450, -75, -275, COLORS.col1Bg, COLORS.col1Border, 1);
    var f1_1 = addElementToDiagram("WebLogin", "Package", "form", 85, 250, -105, -180, COLORS.formBg, COLORS.formBorder, 1);
    var f1_2 = addElementToDiagram("WebPacientes\n(CU10 - CU15, CU21 - CU22)", "Package", "form", 265, 435, -105, -180, COLORS.formBg, COLORS.formBorder, 1);
    var f1_3 = addElementToDiagram("WebAgendaCitas\n(CU26 - CU29)", "Package", "form", 85, 250, -195, -265, COLORS.formBg, COLORS.formBorder, 1);
    var f1_4 = addElementToDiagram("WebRecordatorios\n(CU34)", "Package", "form", 265, 435, -195, -265, COLORS.formBg, COLORS.formBorder, 1);

    // Subpanel 2: Panel Médico
    var subMedico = addElementToDiagram("Panel Médico", "Package", "", 475, 855, -75, -275, COLORS.col1Bg, COLORS.col1Border, 1);
    var f2_1 = addElementToDiagram("WebLogin ", "Package", "form", 490, 655, -105, -180, COLORS.formBg, COLORS.formBorder, 1);
    var f2_2 = addElementToDiagram("WebAgendaDiaria\n(CU28)", "Package", "form", 670, 840, -105, -180, COLORS.formBg, COLORS.formBorder, 1);
    var f2_3 = addElementToDiagram("WebAtencionMedica\n(CU29)", "Package", "form", 490, 655, -195, -265, COLORS.formBg, COLORS.formBorder, 1);
    var f2_4 = addElementToDiagram("WebHistorialPaciente\n(CU14)", "Package", "form", 670, 840, -195, -265, COLORS.formBg, COLORS.formBorder, 1);

    // Subpanel 3: Panel Administración
    var subAdmin = addElementToDiagram("Panel Administración", "Package", "", 880, 1260, -75, -275, COLORS.col1Bg, COLORS.col1Border, 1);
    var f3_1 = addElementToDiagram("WebUsuariosRoles\n(CU01 - CU05)", "Package", "form", 895, 1060, -105, -180, COLORS.formBg, COLORS.formBorder, 1);
    var f3_2 = addElementToDiagram("WebMedicosHorarios\n(CU16 - CU19, CU23)", "Package", "form", 1075, 1245, -105, -180, COLORS.formBg, COLORS.formBorder, 1);
    var f3_3 = addElementToDiagram("WebBitacora\n(CU30 - CU31)", "Package", "form", 895, 1060, -195, -265, COLORS.formBg, COLORS.formBorder, 1);
    var f3_4 = addElementToDiagram("WebReportes\n(CU27 - CU32, CU33)", "Package", "form", 1075, 1245, -195, -265, COLORS.formBg, COLORS.formBorder, 1);

    // =========================================================================
    // 5. ELEMENTOS DE LA CAPA 2: CONTROLADORES LARAVEL (7 CONTROLADORES P1-P7)
    // =========================================================================
    Session.Output("-> Agregando Controladores Laravel de la Capa 2...");

    // Fila 1 de Controladores
    var c1 = addElementToDiagram("P1 Seguridad y Autenticación", "Package", "controller", 75, 355, -385, -440, COLORS.ctrlBg, COLORS.ctrlBorder, 1);
    var c2 = addElementToDiagram("P2 Administración de Usuarios RBAC", "Package", "controller", 375, 655, -385, -440, COLORS.ctrlBg, COLORS.ctrlBorder, 1);
    var c3 = addElementToDiagram("P3 Auditoría y Bitácora", "Package", "controller", 675, 955, -385, -440, COLORS.ctrlBg, COLORS.ctrlBorder, 1);
    var c4 = addElementToDiagram("P4 Gestión de Pacientes", "Package", "controller", 975, 1255, -385, -440, COLORS.ctrlBg, COLORS.ctrlBorder, 1);

    // Fila 2 de Controladores (Centrados)
    var c5 = addElementToDiagram("P5 Gestión Médica y Horarios", "Package", "controller", 215, 495, -455, -505, COLORS.ctrlBg, COLORS.ctrlBorder, 1);
    var c6 = addElementToDiagram("P6 Gestión de Citas", "Package", "controller", 525, 805, -455, -505, COLORS.ctrlBg, COLORS.ctrlBorder, 1);
    var c7 = addElementToDiagram("P7 Reportes", "Package", "controller", 835, 1115, -455, -505, COLORS.ctrlBg, COLORS.ctrlBorder, 1);

    // =========================================================================
    // 6. ELEMENTOS DE LA CAPA 3: SERVICIOS Y MODELOS DE DOMINIO (7 SERVICIOS)
    // =========================================================================
    Session.Output("-> Agregando Servicios y Modelos de Dominio de la Capa 3...");

    // Fila 1 de Servicios
    var s1 = addElementToDiagram("P1 Seguridad y Autenticación ", "Package", "service", 75, 335, -615, -675, COLORS.serviceBg, COLORS.serviceBorder, 1);
    var s2 = addElementToDiagram("P2 Administración de Usuarios RBAC ", "Package", "service", 395, 655, -615, -675, COLORS.serviceBg, COLORS.serviceBorder, 1);
    var s3 = addElementToDiagram("P3 Auditoría y Bitácora ", "Package", "service", 715, 975, -615, -675, COLORS.serviceBg, COLORS.serviceBorder, 1);

    // Fila 2 de Servicios
    var s5 = addElementToDiagram("P5 Gestión Médica y Horarios ", "Package", "service", 75, 335, -715, -775, COLORS.serviceBg, COLORS.serviceBorder, 1);
    var s4 = addElementToDiagram("P4 Gestión de Pacientes ", "Package", "service", 395, 655, -715, -775, COLORS.serviceBg, COLORS.serviceBorder, 1);
    var s6 = addElementToDiagram("P6 Gestión de Citas ", "Package", "service", 715, 975, -715, -775, COLORS.serviceBg, COLORS.serviceBorder, 1);
    var s7 = addElementToDiagram("P7 Reportes ", "Package", "service", 1015, 1255, -715, -775, COLORS.serviceBg, COLORS.serviceBorder, 1);

    // =========================================================================
    // 7. ELEMENTOS DE LA CAPA 4: INFRAESTRUCTURA (POSTGRESQL & SERVIDORES)
    // =========================================================================
    Session.Output("-> Agregando infraestructura (PostgreSQL 16 y Servidores)...");

    // Contenedor PostgreSQL
    var subPostgres = addElementToDiagram("PostgreSQL 16 — Base de Datos Relacional", "Package", "", 70, 645, -890, -1015, COLORS.subInfraBg, COLORS.subInfraBorder, 1);
    var db1 = addElementToDiagram("PostgreSQL 16 Engine", "Package", "database", 95, 345, -925, -995, COLORS.dbBg, COLORS.dbBorder, 1);
    var db2 = addElementToDiagram("Esquema BD vida_salud\n21 tablas · SP · Triggers", "Package", "schema", 365, 625, -925, -995, COLORS.dbBg, COLORS.dbBorder, 1);

    // Contenedor Servidor de Aplicación
    var subServidor = addElementToDiagram("Servidor de Aplicación", "Package", "", 685, 1260, -890, -1015, COLORS.subInfraBg, COLORS.subInfraBorder, 1);
    var srv1 = addElementToDiagram("Apache / Nginx + PHP 8.3", "Package", "execution environment", 710, 960, -925, -995, COLORS.serverBg, COLORS.serverBorder, 1);
    var srv2 = addElementToDiagram("Laravel 11 / 13\n(Eloquent ORM, Blade / REST)", "Package", "framework", 980, 1235, -925, -995, COLORS.serverBg, COLORS.serverBorder, 1);

    // =========================================================================
    // 8. NOTA TÉCNICA / FICHA DE VERSIONES Y METADATOS ARQUITECTÓNICOS
    // =========================================================================
    Session.Output("-> Agregando Ficha Técnica y Leyenda del Sistema...");

    var noteElem = rootPkg.Elements.AddNew("Ficha Técnica - Arquitectura Web Vida Salud", "Note");
    noteElem.Notes = "CLÍNICA VIDA SALUD - ESPECIFICACIÓN ARQUITECTÓNICA\n" +
                     "═════════════════════════════════════════════════════════════════\n" +
                     "• Patrón: Arquitectura en 4 Capas Desacopladas (Layered Pattern)\n" +
                     "• Backend Framework: Laravel 11 / 13 (PHP 8.3 Enterprise)\n" +
                     "• Base de Datos: PostgreSQL 16 (21 Tablas, Triggers de Auditoría, SP)\n" +
                     "• Frontend: Blade Components + Stitch UI (HTML5, ES6+, Tailwind CSS v4)\n" +
                     "• Bundler: Vite 6 con soporte de hot reloading y compilación optimizada\n" +
                     "• Alcance: 43 Casos de Uso (P1 Seguridad a P7 Reportes)\n" +
                     "• Seguridad: Autenticación por Tokens Bearer, RBAC estricto y SHA-256";
    noteElem.Update();

    var noteDiagObj = layerDiagram.DiagramObjects.AddNew("l=50;r=1280;t=-1045;b=-1140;", "");
    noteDiagObj.ElementID = noteElem.ElementID;
    noteDiagObj.Update();
    styleDiagramObject(noteDiagObj, COLORS.noteBg, COLORS.noteBorder, 1);

    // =========================================================================
    // 9. CREACIÓN DE CONECTORES DE DEPENDENCIA UML («use»)
    // =========================================================================
    Session.Output("-> Creando relaciones de dependencia entre capas y servicios...");

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
        } catch (err) {
            Session.Output("Aviso: Conector no pudo ser creado: " + err.message);
        }
    }

    // A) Relaciones «use» entre Capas Principales (Flujo de Dependencia Descendente)
    addDependency(layer1, layer2, "use", "");
    addDependency(layer2, layer3, "use", "");
    addDependency(layer3, layer4, "use", "");

    // B) Conexiones adicionales verticales específicas mostradas en el diseño (Presentación -> Controladores)
    addDependency(subPortal, layer2, "use", "");
    addDependency(subAdmin, layer2, "use", "");

    // C) Conexiones desde Servicios a Infraestructura
    addDependency(layer3, subPostgres, "use", "");
    addDependency(layer3, subServidor, "use", "");

    // D) Dependencias internas entre Servicios de la Capa de Dominio (Capa 3)
    addDependency(s1, s2, "", ""); // P1 Seguridad -> P2 Usuarios RBAC
    addDependency(s3, s2, "", ""); // P3 Auditoría -> P2 Usuarios RBAC
    addDependency(s5, s4, "", ""); // P5 Gestión Médica -> P4 Pacientes
    addDependency(s6, s4, "", ""); // P6 Citas -> P4 Pacientes
    addDependency(s6, s2, "", ""); // P6 Citas -> P2 Usuarios RBAC
    addDependency(s5, s6, "", ""); // P5 Médicos -> P6 Citas
    addDependency(s7, s6, "", ""); // P7 Reportes -> P6 Citas

    // Refrescar y guardar el diagrama
    rootPkg.Elements.Refresh();
    layerDiagram.Update();
    Repository.ReloadDiagram(layerDiagram.DiagramID);
    Repository.RefreshModelView(rootPkg.PackageID);
    Repository.ShowInProjectView(rootPkg);

    Session.Output("========================================================================");
    Session.Output(" ¡Diagrama de Capas Web generado con éxito en Enterprise Architect!");
    Session.Output(" Paquete: 'Arquitectura en Capas - Clínica Vida Salud Web'");
    Session.Output(" Diagrama: 'Diagrama de Capas de la Web (4 Capas)'");
    Session.Output("========================================================================");
    Session.Prompt("¡Generación completada con éxito!\n\nSe ha creado el Diagrama de Capas Web con los paquetes de cada nivel, sus versiones tecnológicas (PHP 8.3, Laravel 11/13, PostgreSQL 16), paleta de colores corporativa y relaciones de dependencia «use».", 0);
}

// Iniciar ejecución
main();

