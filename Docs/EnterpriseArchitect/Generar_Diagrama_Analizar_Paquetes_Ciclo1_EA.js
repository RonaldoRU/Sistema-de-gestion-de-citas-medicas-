!INC Local Scripts.EAConstants - JScript
/*
 * ==========================================================================================
 * SISTEMA CLÍNICA VIDA SALUD - SECCIÓN 5.4 ANALIZAR DE PAQUETE (CICLO 1: CU01 - CU23)
 * ==========================================================================================
 * Archivo: Generar_Diagrama_Analizar_Paquetes_Ciclo1_EA.js
 * Descripción: Script JScript para Sparx Systems Enterprise Architect (v12/v14/v15/v16/v17).
 * Genera el diagrama de análisis de paquetes con diseño gráfico idéntico al modelo RUP oficial:
 * 
 * 1. DISEÑO Y PALETA DE COLORES (BGR HEX):
 *    - Marco exterior (Boundary): Lavanda suave (#ECEEF8) con borde azul pizarra (#A5B4FC).
 *    - Paquetes UML: Menta / Aqua pastel (#D5F6F2) con borde teal corporativo (#0D9488).
 *    - Tipografía: Arial 12 pt (fontsz=120) para títulos y 11 pt para casos de uso.
 * 
 * 2. DISPOSICIÓN GEOMÉTRICA EN 3 NIVELES:
 *    - Nivel 1 (Superior): P1 (Seguridad), P2 (Usuarios RBAC), P5 (Médicos y Horarios).
 *    - Nivel 2 (Intermedio): P4 (Pacientes), P6 (Citas Médicas).
 *    - Nivel 3 (Inferior Transversal): P3 (Bitácora y Auditoría) en barra ancha horizontal.
 * 
 * 3. TRAZABILIDAD Y RELACIONES «use»:
 *    - P2 -> P1 («use» horizontal a la izquierda)
 *    - P4 -> P6 («use» horizontal a la derecha)
 *    - P6 -> P5 («use» diagonal superior derecha)
 *    - 5 dependencias verticales directas hacia P3 (P1->P3, P4->P3, P2->P3, P6->P3, P5->P3)
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

// Helper para aplicar color, bordes y tipografía Arial a un DiagramObject
function styleDiagramObject(diagObj, bgHex, borderHex, borderWidth, fontSizeDeciPoints) {
    var bgrBg = hexToBgr(bgHex);
    var bgrBorder = hexToBgr(borderHex);
    var bWidth = borderWidth || 1;
    var fSize = fontSizeDeciPoints || 120; // 120 decipuntos = 12 pt

    try {
        diagObj.BackgroundColor = bgrBg;
        diagObj.BorderColor = bgrBorder;
        diagObj.BorderWidth = bWidth;
    } catch (e) {}

    // Configuración explícita de fuente Arial y tamaño
    diagObj.Style = "BCol=" + bgrBg + ";BFmt=0;LCol=" + bgrBorder + ";LWth=" + bWidth + ";font=Arial;fontsz=" + fSize + ";pitch=34;";
    diagObj.Update();
}

function main() {
    Log("========================================================================");
    Log(" INICIANDO GENERACIÓN: 5.4 ANALIZAR DE PAQUETE (CICLO 1: CU01 - CU23) ");
    Log(" DISEÑO CORPORATIVO: MENTA PASTEL | MARCO LAVANDA | ARIAL 12 PT ");
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

    // 1. Crear Paquete contenedor para la sección 5.4
    var rootPkg = targetPackage.Packages.AddNew("5.4 Analizar de Paquete - Clínica Vida Salud", "");
    rootPkg.Notes = "Sección 5.4: Análisis de Paquetes Arquitectónicos para el Ciclo 1 (CU01 a CU23).\n" +
                    "Representa las dependencias lógicas «use» entre los paquetes operativos, de gestión y la bitácora transversal.";
    rootPkg.Update();
    targetPackage.Packages.Refresh();

    // 2. Crear el Diagrama UML de Paquetes
    var pkgDiagram = rootPkg.Diagrams.AddNew("5.4 Analizar de paquete (Ciclo 1)", "Package");
    pkgDiagram.Notes = "Análisis de Paquetes - Ciclo 1 (CU01 - CU23). Trazabilidad completa RUP con paleta de colores corporativa y tipografía Arial 12pt.";
    pkgDiagram.Update();
    rootPkg.Diagrams.Refresh();

    // =========================================================================
    // PALETA DE COLORES DEL DISEÑO (BGR)
    // =========================================================================
    var COLORS = {
        frameBg:        "#ECEEF8", // Fondo del marco (Lavanda muy suave)
        frameBorder:    "#9CA3AF", // Borde del marco (Pizarra suave)
        packageBg:      "#D5F6F2", // Fondo del paquete (Aqua / Menta pastel idéntico a la imagen)
        packageBorder:  "#0D9488", // Borde del paquete (Teal oscuro corporativo)
        noteBg:         "#FFFFFF",
        noteBorder:     "#64748B"
    };

    var elementsMap = {};

    function addElementToDiagram(name, type, stereotype, left, right, top, bottom, bgHex, borderHex, borderWidth, fontSize) {
        var el = rootPkg.Elements.AddNew(name, type);
        if (stereotype && stereotype.length > 0) {
            el.Stereotype = stereotype;
        }
        el.Update();

        var coordStr = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
        var diagObj = pkgDiagram.DiagramObjects.AddNew(coordStr, "");
        diagObj.ElementID = el.ElementID;
        diagObj.Update();

        if (bgHex && borderHex) {
            styleDiagramObject(diagObj, bgHex, borderHex, borderWidth, fontSize);
        }

        elementsMap[name] = el;
        return el;
    }

    // =========================================================================
    // 3. CREAR EL MARCO CONTENEDOR (BOUNDARY)
    //    Se crea primero para que quede en el Z-Order inferior (fondo visual)
    // =========================================================================
    Log("-> Creando Marco Contenedor: 'Análisis de Paquetes - Ciclo 1 (CU01 - CU23)'...");

    var frameBoundary = addElementToDiagram(
        "Análisis de Paquetes - Ciclo 1 (CU01 - CU23)",
        "Boundary", "",
        50, 1150, -40, -660,
        COLORS.frameBg, COLORS.frameBorder, 1, 120
    );

    // =========================================================================
    // 4. CREAR LOS PAQUETES CON DISPOSICIÓN MATEMÁTICAMENTE ALINEADA
    //    Ancho de paquetes estándar = 250 px, Alto = 95 px
    // =========================================================================
    Log("-> Creando paquetes de análisis del Ciclo 1...");

    // FILA 1 (Superior): Y = -110 a -205 (Alto: 95 px)
    // P1: x = 90 a 340 (Centro: 215)
    var p1 = addElementToDiagram(
        "P1 - Seguridad y Autenticación\n(CU01 - CU04)",
        "Package", "",
        90, 340, -110, -205,
        COLORS.packageBg, COLORS.packageBorder, 1, 120
    );

    // P2: x = 450 a 700 (Centro: 575)
    var p2 = addElementToDiagram(
        "P2 - Gestión de Usuarios y RBAC\n(CU05 - CU09)",
        "Package", "",
        450, 700, -110, -205,
        COLORS.packageBg, COLORS.packageBorder, 1, 120
    );

    // P5: x = 810 a 1060 (Centro: 935)
    var p5 = addElementToDiagram(
        "P5 - Gestión Médica y Horarios\n(CU18 - CU21)",
        "Package", "",
        810, 1060, -110, -205,
        COLORS.packageBg, COLORS.packageBorder, 1, 120
    );

    // FILA 2 (Intermedia): Y = -290 a -385 (Alto: 95 px)
    // P4: x = 270 a 520 (Centro: 395)
    var p4 = addElementToDiagram(
        "P4 - Gestión de Pacientes\n(CU12 - CU17)",
        "Package", "",
        270, 520, -290, -385,
        COLORS.packageBg, COLORS.packageBorder, 1, 120
    );

    // P6: x = 630 a 880 (Centro: 755)
    var p6 = addElementToDiagram(
        "P6 - Gestión de Citas Médicas\n(CU22, CU23)",
        "Package", "",
        630, 880, -290, -385,
        COLORS.packageBg, COLORS.packageBorder, 1, 120
    );

    // FILA 3 (Inferior Transversal): Y = -510 a -590 (Alto: 80 px)
    // P3: x = 90 a 1060 (Barra horizontal ancha que abarca toda la base)
    var p3 = addElementToDiagram(
        "P3 - Bitácora y Auditoría\n(CU10, CU11)",
        "Package", "",
        90, 1060, -510, -590,
        COLORS.packageBg, COLORS.packageBorder, 1, 120
    );

    // =========================================================================
    // 5. CONECTORES DE DEPENDENCIA UML («use»)
    // =========================================================================
    Log("-> Creando dependencias UML («use»)...");

    function addUseDependency(sourceEl, targetEl, name) {
        if (!sourceEl || !targetEl) return null;
        try {
            var con = sourceEl.Connectors.AddNew(name || "", "Dependency");
            con.SupplierID = targetEl.ElementID;
            con.Stereotype = "use";
            con.Direction = "Source -> Destination";
            con.Update();
            sourceEl.Connectors.Refresh();
            return con;
        } catch (e) {
            Log("[WARN] No se pudo crear conector: " + e.message);
            return null;
        }
    }

    // A) Dependencias operativas entre paquetes
    addUseDependency(p2, p1, ""); // P2 Gestión de Usuarios -> P1 Seguridad (Horizontal izquierda)
    addUseDependency(p4, p6, ""); // P4 Pacientes -> P6 Citas Médicas (Horizontal derecha)
    addUseDependency(p6, p5, ""); // P6 Citas Médicas -> P5 Médicos y Horarios (Diagonal superior derecha)

    // B) Dependencias verticales transversales hacia P3 (Bitácora y Auditoría)
    addUseDependency(p1, p3, ""); // P1 Seguridad -> P3 Bitácora (Vertical recta hacia abajo)
    addUseDependency(p4, p3, ""); // P4 Pacientes -> P3 Bitácora (Vertical recta hacia abajo)
    addUseDependency(p2, p3, ""); // P2 Usuarios -> P3 Bitácora (Vertical central entre P4 y P6)
    addUseDependency(p6, p3, ""); // P6 Citas Médicas -> P3 Bitácora (Vertical recta hacia abajo)
    addUseDependency(p5, p3, ""); // P5 Médicos y Horarios -> P3 Bitácora (Vertical recta hacia abajo)

    // Refrescar y guardar el modelo
    rootPkg.Elements.Refresh();
    rootPkg.Packages.Refresh();
    pkgDiagram.Update();

    try {
        eaRepo.ReloadDiagram(pkgDiagram.DiagramID);
        eaRepo.RefreshModelView(rootPkg.PackageID);
        eaRepo.ShowInProjectView(rootPkg);
    } catch (e) {}

    Log("========================================================================");
    Log(" ¡DIAGRAMA 5.4 ANALIZAR DE PAQUETE GENERADO CON ÉXITO! ");
    Log(" Paquete: '5.4 Analizar de Paquete - Clínica Vida Salud'");
    Log(" Diagrama: '5.4 Analizar de paquete (Ciclo 1)'");
    Log("========================================================================");

    try {
        if (typeof Session !== "undefined") {
            Session.Prompt("¡Generación completada con éxito!\n\nSe ha generado el Diagrama de Análisis de Paquetes (Ciclo 1: CU01 a CU23) con el diseño oficial:\n- Marco exterior con pestaña en tono lavanda suave (#ECEEF8).\n- Paquetes en verde aqua/menta (#D5F6F2) con bordes teal (#0D9488).\n- Tipografía Arial 12 pt.\n- Dependencias «use» perfectamente alineadas hacia la bitácora transversal.", 0);
        }
    } catch (e) {}
}

// Ejecutar función principal
main();

