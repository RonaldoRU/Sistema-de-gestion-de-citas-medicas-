!INC Local Scripts.EAConstants-JScript

/* =========================================================================================
 * Script Name: GenerarCasosDeUso_VidaSalud_CU01_CU43.js
 * Author:      Clínica Vida Salud - Sistema de Gestión de Citas Médicas
 * Purpose:     Crea automáticamente en Sparx Systems Enterprise Architect:
 *              - 5 Actores principales (Administrador, Recepcionista, Médico, Paciente, Sistema)
 *              - 7 Paquetes estructurados (P1 a P7)
 *              - Los 43 Casos de Uso (CU01 al CU43) con sus descripciones y alias
 *              - Diagramas UML de Casos de Uso por cada paquete con layout automático
 *              - Conectores de Asociación UML entre los Actores y cada Caso de Uso
 * Language:    JScript (Compatible con Enterprise Architect 12, 13, 14, 15, 16)
 * ========================================================================================= */

function main()
{
    // Asegurar visibilidad de la ventana de salida
    Repository.EnsureOutputVisible("Script");
    Session.Output("=================================================================");
    Session.Output(" Iniciando creación de los 43 Casos de Uso - Clínica Vida Salud ");
    Session.Output("=================================================================");

    // Obtener el paquete seleccionado actualmente en el Project Browser
    var targetPackage = Repository.GetTreeSelectedPackage();
    if (targetPackage == null)
    {
        Session.Prompt("Por favor, selecciona un Paquete o Vista en el Project Browser antes de ejecutar este script.", 0);
        return;
    }

    Session.Output("Paquete destino: " + targetPackage.Name + " (ID: " + targetPackage.PackageID + ")");

    // 1. Paquete raíz del sistema
    var rootPkg = targetPackage.Packages.AddNew("Sistema Clínica Vida Salud - Casos de Uso (CU01-CU43)", "");
    rootPkg.Notes = "Estructura completa de Casos de Uso del Sistema Web de Gestión de Citas Médicas Clínica Vida Salud.";
    rootPkg.Update();
    targetPackage.Packages.Refresh();

    // 2. Crear Paquete de Actores
    var actorsPkg = rootPkg.Packages.AddNew("Actores del Sistema", "");
    actorsPkg.Notes = "Actores humanos y de sistema que interactúan con la plataforma.";
    actorsPkg.Update();
    rootPkg.Packages.Refresh();

    // Crear Actores en EA
    var actorsMap = {};
    var actorsDef = [
        { key: "ADMIN", name: "Administrador", notes: "Control total de usuarios, roles, permisos, catálogos, auditoría, bitácora y reportes gerenciales." },
        { key: "RECEP", name: "Recepcionista", notes: "Inscripción de pacientes, programación de citas, control de asistencia y verificación de pagos." },
        { key: "MEDIC", name: "Médico", notes: "Gestión de agenda diaria, consulta de historial clínico de pacientes y registro de atención realizada." },
        { key: "PACIE", name: "Paciente", notes: "Portal web para auto-registro, consulta de ficha médica, contactos, citas, reprogramación, cancelación, recordatorios y pagos." },
        { key: "SISTE", name: "Sistema", notes: "Procesos automáticos: auditoría inmutable, control de concurrencia, recordatorios y bloqueo por intentos fallidos." }
    ];

    for (var a = 0; a < actorsDef.length; a++)
    {
        var actData = actorsDef[a];
        var actorEl = actorsPkg.Elements.AddNew(actData.name, "Actor");
        actorEl.Notes = actData.notes;
        actorEl.Update();
        actorsMap[actData.key] = actorEl;
        Session.Output("  [Actor] Creado: " + actData.name);
    }
    actorsPkg.Elements.Refresh();

    // 3. Definición completa de los 7 Paquetes y 43 Casos de Uso
    var packagesData = [
        {
            id: "P1",
            name: "P1 - Seguridad y Autenticación",
            notes: "Gestión de sesiones, credenciales con hash, recuperación y auto-registro web.",
            cases: [
                { id: "CU01", name: "Iniciar Sesión", actors: ["ADMIN", "RECEP", "MEDIC", "PACIE"], desc: "Permite a los usuarios autenticarse mediante usuario/correo y contraseña verificada contra hash." },
                { id: "CU02", name: "Cerrar Sesión", actors: ["ADMIN", "RECEP", "MEDIC", "PACIE"], desc: "Revoca la sesión activa del usuario y registra la fecha/hora de salida en el sistema." },
                { id: "CU03", name: "Recuperar Contraseña", actors: ["ADMIN", "RECEP", "MEDIC", "PACIE"], desc: "Genera y valida tokens seguros con expiración para el restablecimiento de contraseñas olvidadas." },
                { id: "CU04", name: "Bloqueo por Intentos Fallidos", actors: ["SISTE"], desc: "Bloquea automáticamente la cuenta durante 1 minuto al acumular 3 intentos fallidos consecutivos." },
                { id: "CU37", name: "Auto-Registro de Paciente Web y Sesiones", actors: ["PACIE", "ADMIN"], desc: "Permite el alta directa de pacientes con rol Paciente y supervisa sesiones y tokens de recuperación." }
            ]
        },
        {
            id: "P2",
            name: "P2 - Administración de Usuarios y Permisos",
            notes: "Control de cuentas institucionales, personal administrativo y matriz de roles RBAC.",
            cases: [
                { id: "CU05", name: "Registrar Usuario", actors: ["ADMIN"], desc: "Crea cuentas de usuario institucionales vinculadas a personas con asignación de roles." },
                { id: "CU06", name: "Consultar Catálogo de Usuarios", actors: ["ADMIN"], desc: "Permite listar, filtrar y visualizar perfiles detallados de los usuarios del sistema." },
                { id: "CU07", name: "Modificar Cuenta de Usuario", actors: ["ADMIN"], desc: "Actualiza datos personales, credenciales y estado operativo de cuentas existentes." },
                { id: "CU08", name: "Gestionar Roles y Permisos", actors: ["ADMIN"], desc: "Asigna y modifica roles y permisos específicos para el control de acceso en la plataforma." },
                { id: "CU09", name: "Suspender Cuenta de Usuario", actors: ["ADMIN"], desc: "Inactiva temporal o definitivamente cuentas de usuario impidiendo el inicio de sesión." },
                { id: "CU38", name: "Personal Administrativo y Permisos RBAC", actors: ["ADMIN"], desc: "Gestión integral de personal administrativo, asignación de personas y matriz rol-permiso." }
            ]
        },
        {
            id: "P3",
            name: "P3 - Auditoría, Trazabilidad y Bitácora",
            notes: "Registro inmutable de acciones en tiempo real exclusivo para Administradores.",
            cases: [
                { id: "CU10", name: "Registrar Acción Automática en Bitácora", actors: ["SISTE"], desc: "Registra en PostgreSQL cada acción de alta, modificación, inactivación o acceso de forma inmutable." },
                { id: "CU11", name: "Consultar y Filtrar Bitácora de Auditoría", actors: ["ADMIN"], desc: "Permite al administrador consultar, buscar y filtrar eventos registrados con exportación." }
            ]
        },
        {
            id: "P4",
            name: "P4 - Gestión de Pacientes",
            notes: "Padrón general de pacientes, antecedentes médicos básicos y contactos de urgencia.",
            cases: [
                { id: "CU12", name: "Registrar Paciente", actors: ["RECEP", "ADMIN"], desc: "Inscribe nuevos pacientes con validación de CI único y asignación de código correlativo." },
                { id: "CU13", name: "Gestionar Información Médica Básica", actors: ["PACIE", "MEDIC", "RECEP"], desc: "Registra tipo de sangre, alergias y antecedentes patológicos relevantes del paciente." },
                { id: "CU14", name: "Gestionar Contacto de Emergencia", actors: ["PACIE", "RECEP"], desc: "Registra y actualiza el familiar o responsable a contactar en caso de emergencia médica." },
                { id: "CU15", name: "Buscar y Modificar Datos de Paciente", actors: ["RECEP", "ADMIN"], desc: "Permite buscar pacientes por CI o nombre y actualizar datos demográficos y de contacto." },
                { id: "CU16", name: "Consultar Historial de Citas", actors: ["PACIE", "MEDIC", "RECEP"], desc: "Muestra la cronología de citas agendadas, atendidas, canceladas y reprogramadas." },
                { id: "CU17", name: "Desactivar Registro de Paciente", actors: ["ADMIN", "RECEP"], desc: "Inactiva pacientes en el sistema preservando la trazabilidad de su historial clínico." }
            ]
        },
        {
            id: "P5",
            name: "P5 - Gestión Médica y Horarios",
            notes: "Catálogo de especialidades, plantilla de médicos y configuración de agendas.",
            cases: [
                { id: "CU18", name: "Gestionar Especialidades Médicas", actors: ["ADMIN"], desc: "Administra el catálogo de especialidades con código, nombre y tiempo estimado de consulta." },
                { id: "CU19", name: "Registrar y Administrar Personal Médico", actors: ["ADMIN"], desc: "Registra médicos con número de colegiatura profesional y datos contractuales." },
                { id: "CU20", name: "Configurar Horarios y Bloques de Disponibilidad", actors: ["ADMIN", "RECEP"], desc: "Define los días, turnos y duración de bloques de atención para cada médico." },
                { id: "CU21", name: "Desactivar Registro de Médico", actors: ["ADMIN"], desc: "Suspende a un médico del rol activo evitando nuevas citas en su agenda." },
                { id: "CU39", name: "Asignación de Especialidades por Médico", actors: ["ADMIN"], desc: "Permite asociar múltiples especialidades a un profesional médico con fecha de alta." }
            ]
        },
        {
            id: "P6",
            name: "P6 - Gestión de Citas Médicas",
            notes: "Ciclo integral de citas: agendamiento, control de concurrencia, pagos y asistencia.",
            cases: [
                { id: "CU22", name: "Consultar Disponibilidad Horaria", actors: ["RECEP", "PACIE", "MEDIC"], desc: "Muestra los turnos y horarios libres por fecha, especialidad y profesional médico." },
                { id: "CU23", name: "Bloquear Agenda Médica", actors: ["ADMIN", "MEDIC"], desc: "Bloquea intervalos horarios por feriados, vacaciones, congresos o licencias médicas." },
                { id: "CU24", name: "Programar y Registrar Cita Médica", actors: ["PACIE", "RECEP"], desc: "Reserva un turno disponible asignando paciente, médico, especialidad y motivo de consulta." },
                { id: "CU25", name: "Prevenir Citas Duplicadas (Concurrencia)", actors: ["SISTE"], desc: "Mecanismo de concurrencia a nivel de base de datos para evitar doble reserva simultánea." },
                { id: "CU26", name: "Reprogramar Cita Médica", actors: ["PACIE", "RECEP"], desc: "Modifica la fecha y hora de una cita pendiente respetando la disponibilidad del médico." },
                { id: "CU27", name: "Cancelar Cita Médica", actors: ["PACIE", "RECEP"], desc: "Cancela una cita agendada registrando el motivo justificado y liberando el bloque." },
                { id: "CU28", name: "Emitir Recordatorio de Cita Programada", actors: ["SISTE", "PACIE"], desc: "Emite recordatorios y notificaciones automáticas previas a la fecha de la cita." },
                { id: "CU29", name: "Controlar Asistencia y Estados de Cita", actors: ["RECEP", "MEDIC"], desc: "Registra la llegada del paciente a la sala de espera (CONFIRMADA / EN ESPERA)." },
                { id: "CU30", name: "Consultar Agenda Médica Diaria", actors: ["MEDIC", "RECEP"], desc: "Visualización cronológica de pacientes agendados para la jornada médica actual." },
                { id: "CU31", name: "Registrar Atención Médica Concluida", actors: ["MEDIC"], desc: "Marca la cita como ATENDIDA y registra diagnóstico, receta y observaciones clínicas." },
                { id: "CU40", name: "Reserva de Ficha Web e Historial de Estados", actors: ["PACIE", "RECEP"], desc: "Permite la reserva web y auditoría completa de las transiciones de estado de la cita." },
                { id: "CU41", name: "Pasarela de Pago en Línea y Comprobante", actors: ["PACIE", "RECEP"], desc: "Procesa el pago de la ficha médica (QR / Tarjeta) y genera el comprobante digital." },
                { id: "CU42", name: "Historial de Pagos y Gestión de Reembolsos", actors: ["RECEP", "ADMIN"], desc: "Muestra los pagos registrados por paciente y gestiona devoluciones por citas canceladas." }
            ]
        },
        {
            id: "P7",
            name: "P7 - Reportes Administrativos",
            notes: "Métricas gerenciales de atenciones, citas, asistencia, padrón e ingresos.",
            cases: [
                { id: "CU32", name: "Reporte de Citas por Período", actors: ["ADMIN"], desc: "Genera métricas consolidadas de citas por rangos de fecha y estados de atención." },
                { id: "CU33", name: "Reporte de Atenciones por Médico y Especialidad", actors: ["ADMIN"], desc: "Muestra el volumen de pacientes atendidos discriminado por profesional y especialidad." },
                { id: "CU34", name: "Reporte de Control de Asistencia", actors: ["ADMIN"], desc: "Evalúa los porcentajes de asistencia efectiva versus ausentismos de pacientes." },
                { id: "CU35", name: "Exportar Reportes Administrativos (PDF / CSV)", actors: ["ADMIN"], desc: "Exporta la información generada a formatos abiertos CSV y documentos PDF imprimibles." },
                { id: "CU36", name: "Reporte de Padrón General de Pacientes", actors: ["ADMIN"], desc: "Consolida el listado total de pacientes registrados con datos de contacto y estado." },
                { id: "CU43", name: "Reporte de Ingresos Financieros y Auditoría", actors: ["ADMIN"], desc: "Genera el reporte financiero de recaudaciones por consultas y registra en bitácora." }
            ]
        }
    ];

    var totalCasos = 0;

    // 4. Procesar cada Paquete
    for (var p = 0; p < packagesData.length; p++)
    {
        var pkgData = packagesData[p];
        Session.Output("\nCreando Paquete: " + pkgData.name + "...");

        var pkg = rootPkg.Packages.AddNew(pkgData.name, "");
        pkg.Notes = pkgData.notes;
        pkg.Update();
        rootPkg.Packages.Refresh();

        // Crear Diagrama de Casos de Uso para el Paquete
        var diagram = pkg.Diagrams.AddNew("Diagrama de Casos de Uso - " + pkgData.id, "Use Case");
        diagram.Notes = "Diagrama UML de Casos de Uso para el módulo " + pkgData.name;
        diagram.Update();
        pkg.Diagrams.Refresh();

        // Conjunto de actores que intervienen en este paquete (para agregarlos al diagrama)
        var pkgActorsInvolved = {};

        // Variables de posicionamiento visual en el diagrama
        var ucStartX = 340;
        var ucStartY = 60;
        var ucWidth = 240;
        var ucHeight = 65;
        var ucGapY = 30;

        for (var c = 0; c < pkgData.cases.length; c++)
        {
            var cData = pkgData.cases[c];
            totalCasos++;

            // Crear el Elemento UseCase
            var ucElement = pkg.Elements.AddNew(cData.id + " - " + cData.name, "UseCase");
            ucElement.Alias = cData.id;
            ucElement.Notes = cData.desc;
            ucElement.Update();

            Session.Output("  -> [" + cData.id + "] " + cData.name);

            // Posicionar el Caso de Uso en el Diagrama
            var ucTop = -(ucStartY + (c * (ucHeight + ucGapY)));
            var ucBottom = ucTop - ucHeight;
            var ucLeft = ucStartX;
            var ucRight = ucLeft + ucWidth;

            var diagObjUC = diagram.DiagramObjects.AddNew("l=" + ucLeft + ";r=" + ucRight + ";t=" + ucTop + ";b=" + ucBottom + ";", "");
            diagObjUC.ElementID = ucElement.ElementID;
            diagObjUC.Update();

            // Asociar los Actores con este Caso de Uso
            for (var aKeyIdx = 0; aKeyIdx < cData.actors.length; aKeyIdx++)
            {
                var actorKey = cData.actors[aKeyIdx];
                var actorObj = actorsMap[actorKey];
                if (actorObj != null)
                {
                    pkgActorsInvolved[actorKey] = actorObj;

                    // Crear conector de Asociación entre Actor y Caso de Uso
                    var connector = actorObj.Connectors.AddNew("", "Association");
                    connector.SupplierID = ucElement.ElementID;
                    connector.Direction = "Unspecified";
                    connector.Update();
                    actorObj.Connectors.Refresh();
                }
            }
        }
        pkg.Elements.Refresh();

        // Agregar los Actores involucrados al lado izquierdo del Diagrama
        var actorStartX = 60;
        var actorStartY = 80;
        var actorWidth = 90;
        var actorHeight = 110;
        var actorGapY = 40;
        var actorIdx = 0;

        for (var actKey in pkgActorsInvolved)
        {
            var actorToDraw = pkgActorsInvolved[actKey];
            var aTop = -(actorStartY + (actorIdx * (actorHeight + actorGapY)));
            var aBottom = aTop - actorHeight;
            var aLeft = actorStartX;
            var aRight = aLeft + actorWidth;

            var diagObjActor = diagram.DiagramObjects.AddNew("l=" + aLeft + ";r=" + aRight + ";t=" + aTop + ";b=" + aBottom + ";", "");
            diagObjActor.ElementID = actorToDraw.ElementID;
            diagObjActor.Update();

            actorIdx++;
        }

        // Guardar y refrescar diagrama
        diagram.Update();
        Repository.ReloadDiagram(diagram.DiagramID);
    }

    // 5. Refrescar el árbol de modelos en Enterprise Architect
    Repository.RefreshModelView(rootPkg.PackageID);
    Repository.ShowInProjectView(rootPkg);

    Session.Output("\n=================================================================");
    Session.Output(" Proceso finalizado con éxito: " + totalCasos + " Casos de Uso generados.");
    Session.Output(" Paquetes creados: 7 módulos funcionales (P1 a P7) + Paquete de Actores.");
    Session.Output("=================================================================");
    Session.Prompt("¡Generación completada! Se crearon exitosamente los " + totalCasos + " Casos de Uso, Actores y Diagramas UML en Enterprise Architect.", 0);
}

// Ejecutar función principal
main();
