!INC Local Scripts.EAConstants - JScript

/* =========================================================================================
 * Script Name: EnterpriseArchitect_DiagramasDeSecuencia_VidaSalud.js
 * Author:      Clínica Vida Salud - Sistema de Gestión de Citas Médicas
 * Purpose:     Genera automáticamente en Sparx Systems Enterprise Architect:
 *              - 1 Paquete contenedor general "Diagramas de Secuencia (CU01-CU43)"
 *              - 7 Subpaquetes para los módulos del sistema (P1 a P7)
 *              - 43 Diagramas de Secuencia UML individuales (uno por cada Caso de Uso)
 *              - Líneas de vida (Lifelines) estándar por diagrama: Actor, Frontend Web,
 *                Controlador Laravel, DB PostgreSQL y Servicio de Auditoría
 *              - Conectores de secuencia con estereotipo 'return' en respuestas HTTP/JSON
 *              - Nota técnica descriptiva (Boundary / Note) por cada diagrama con endpoints y BD
 *              - Dimensionamiento adaptativo según la cantidad de mensajes
 * Language:    JScript (Compatible con Enterprise Architect 12, 13, 14, 15, 16)
 * ========================================================================================= */

function main() {
    Repository.EnsureOutputVisible("Script");
    Session.Output("========================================================================");
    Session.Output(" Iniciando creación de los 43 Diagramas de Secuencia - Clínica Vida Salud ");
    Session.Output("========================================================================");

    var targetPackage = Repository.GetTreeSelectedPackage();
    if (targetPackage == null) {
        Session.Prompt("Por favor, selecciona un Paquete o Vista en el Project Browser antes de ejecutar este script.", 0);
        return;
    }

    Session.Output("Paquete destino seleccionado: " + targetPackage.Name);

    // Paquete raíz para los Diagramas de Secuencia
    var rootSeqPkg = targetPackage.Packages.AddNew("Diagramas de Secuencia - Clínica Vida Salud (CU01-CU43)", "");
    rootSeqPkg.Notes = "Diagramas de secuencia UML que detallan la interacción entre Actores, Frontend Web (JS/DOM), Controladores Laravel REST, Base de Datos PostgreSQL y el Servicio de Auditoría para los 43 Casos de Uso del Sistema de Gestión de Citas Médicas.";
    rootSeqPkg.Update();
    targetPackage.Packages.Refresh();

    // Definición completa de los 43 Casos de Uso organizados en los 7 Paquetes del Sistema
    var modules = [
        {
            pkgName: "P1 - Secuencia Seguridad y Autenticación",
            diagrams: [
                {
                    cu: "CU01",
                    title: "CU01 - Iniciar Sesión",
                    actor: "Usuario / Paciente",
                    controller: "AuthController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/auth/login",
                    tables: "usuario, rol, persona, sesion, bitacora",
                    desc: "Autenticación segura con verificación de contraseña hash (Bcrypt), emisión de token, apertura de sesión y registro de LOGIN en bitácora.",
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar credenciales (usuario/email, clave)", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/auth/login {identificador, password}", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT * FROM usuario WHERE nombre_usuario = ? OR email = ?", isReturn: false },
                        { from: 3, to: 2, text: "4: Retornar registro usuario + hash + rol", isReturn: true },
                        { from: 2, to: 2, text: "5: Hash::check(password, hash_contrasena)", isReturn: false },
                        { from: 2, to: 3, text: "6: INSERT INTO sesion (id_usuario, token, fecha_inicio, activa)", isReturn: false },
                        { from: 2, to: 4, text: "7: registrar('P1_SEGURIDAD', 'LOGIN', usuario, ip, nav)", isReturn: false },
                        { from: 2, to: 1, text: "8: HTTP 200 JSON {success: true, token, rol, usuario}", isReturn: true },
                        { from: 1, to: 1, text: "9: Almacenar token en localStorage/sessionStorage", isReturn: false },
                        { from: 1, to: 0, text: "10: Redireccionar al panel principal según rol", isReturn: true }
                    ]
                },
                {
                    cu: "CU02",
                    title: "CU02 - Cerrar Sesión",
                    actor: "Usuario Autenticado",
                    controller: "AuthController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/auth/logout",
                    tables: "sesion, bitacora",
                    desc: "Cierre de sesión seguro con invalidación de sesión en BD, auditoría en bitácora y limpieza de credenciales locales.",
                    messages: [
                        { from: 0, to: 1, text: "1: Clic en botón 'Salir' del menú", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/auth/logout (Bearer token)", isReturn: false },
                        { from: 2, to: 3, text: "3: UPDATE sesion SET activa = false, fecha_cierre = now()", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P1_SEGURIDAD', 'LOGOUT', usuario)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {success: true, message: 'Sesión finalizada'}", isReturn: true },
                        { from: 1, to: 1, text: "6: Remover token y perfil del storage local", isReturn: false },
                        { from: 1, to: 0, text: "7: Redirigir a vista cu02-sesion-cerrada.html", isReturn: true }
                    ]
                },
                {
                    cu: "CU03",
                    title: "CU03 - Recuperar Contraseña",
                    actor: "Usuario / Paciente",
                    controller: "TokenRecuperacionController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/auth/recuperar-clave / POST /api/auth/reset-clave",
                    tables: "usuario, token_recuperacion, bitacora",
                    desc: "Generación de token temporal de recuperación de contraseña con vencimiento de 15 min y actualización de credenciales.",
                    messages: [
                        { from: 0, to: 1, text: "1: Solicitar recuperación indicando correo o CI", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/auth/recuperar-clave {email}", isReturn: false },
                        { from: 2, to: 3, text: "3: INSERT INTO token_recuperacion (token_hash, expira_en)", isReturn: false },
                        { from: 2, to: 1, text: "4: HTTP 200 Token de restablecimiento enviado", isReturn: true },
                        { from: 0, to: 1, text: "5: Ingresar token recibido y nueva contraseña", isReturn: false },
                        { from: 1, to: 2, text: "6: POST /api/auth/reset-clave {token, nueva_password}", isReturn: false },
                        { from: 2, to: 3, text: "7: UPDATE usuario SET hash_contrasena = Hash::make()", isReturn: false },
                        { from: 2, to: 4, text: "8: registrar('P1_SEGURIDAD', 'MODIFICAR', 'usuario', id)", isReturn: false },
                        { from: 2, to: 1, text: "9: HTTP 200 Clave actualizada correctamente", isReturn: true },
                        { from: 1, to: 0, text: "10: Notificar al usuario y permitir nuevo login", isReturn: true }
                    ]
                },
                {
                    cu: "CU04",
                    title: "CU04 - Bloqueo por Intentos Fallidos",
                    actor: "Usuario no autenticado",
                    controller: "AuthController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/auth/login (Intento fallido >= 3)",
                    tables: "usuario, bitacora",
                    desc: "Mecanismo defensivo de seguridad: tras 3 intentos fallidos consecutivos, la cuenta se bloquea por 1 minuto con registro de auditoría BLOQUEO.",
                    messages: [
                        { from: 0, to: 1, text: "1: Enviar credenciales incorrectas por 3ra vez", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/auth/login", isReturn: false },
                        { from: 2, to: 3, text: "3: UPDATE usuario SET intentos_fallidos = intentos_fallidos + 1", isReturn: false },
                        { from: 2, to: 2, text: "4: Validar regla: intentos_fallidos >= 3", isReturn: false },
                        { from: 2, to: 3, text: "5: UPDATE usuario SET bloqueado_hasta = now() + INTERVAL '1 min'", isReturn: false },
                        { from: 2, to: 4, text: "6: registrar('P1_SEGURIDAD', 'BLOQUEO', usuario, 'Bloqueo temporal 60s')", isReturn: false },
                        { from: 2, to: 1, text: "7: HTTP 423 Locked {bloqueado: true, restante_segundos: 60}", isReturn: true },
                        { from: 1, to: 0, text: "8: Renderizar alerta de cuenta bloqueada y temporizador", isReturn: true }
                    ]
                },
                {
                    cu: "CU37",
                    title: "CU37 - Auto-Registro de Paciente Web y Sesiones",
                    actor: "Paciente Web",
                    controller: "PacienteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/auth/autoregistro-paciente",
                    tables: "persona, paciente, usuario, rol, bitacora",
                    desc: "Auto-registro en línea de pacientes con validación de CI único, creación de registro clínico PAC-XXXX y usuario con rol PACIENTE.",
                    messages: [
                        { from: 0, to: 1, text: "1: Completar formulario web (CI, Nombres, Apellidos, Email, Pass)", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/auth/autoregistro-paciente", isReturn: false },
                        { from: 2, to: 3, text: "3: Validar CI único e INSERT INTO persona RETURNING id_persona", isReturn: false },
                        { from: 2, to: 3, text: "4: INSERT INTO paciente (id_persona, codigo='PAC-####', fecha_nac)", isReturn: false },
                        { from: 2, to: 3, text: "5: INSERT INTO usuario (id_persona, id_rol=4 [PACIENTE], hash_pass)", isReturn: false },
                        { from: 2, to: 4, text: "6: registrar('P1_SEGURIDAD', 'REGISTRAR', paciente, 'Auto-registro web')", isReturn: false },
                        { from: 2, to: 1, text: "7: HTTP 201 Created {success: true, paciente, token}", isReturn: true },
                        { from: 1, to: 0, text: "8: Notificar alta exitosa y habilitar portal de citas", isReturn: true }
                    ]
                }
            ]
        },
        {
            pkgName: "P2 - Secuencia Administración de Usuarios y Permisos",
            diagrams: [
                {
                    cu: "CU05",
                    title: "CU05 - Registrar Usuario",
                    actor: "Administrador",
                    controller: "UsuarioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/usuarios",
                    tables: "persona, usuario, rol, bitacora",
                    desc: "Alta de cuentas institucionales para médicos, recepcionistas o administradores con asignación de rol y auditoría.",
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar datos de usuario y seleccionar rol", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/usuarios {ci, nombres, rol, username, password}", isReturn: false },
                        { from: 2, to: 3, text: "3: INSERT INTO usuario (id_persona, id_rol, nombre_usuario, hash)", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P2_RBAC', 'REGISTRAR', 'usuario', id_usuario)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 201 Created {usuario creado, rol}", isReturn: true },
                        { from: 1, to: 0, text: "6: Actualizar catálogo web y mostrar toast de éxito", isReturn: true }
                    ]
                },
                {
                    cu: "CU06",
                    title: "CU06 - Consultar Catálogo de Usuarios",
                    actor: "Administrador",
                    controller: "UsuarioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/usuarios?search=...&rol=...",
                    tables: "usuario, rol, persona",
                    desc: "Búsqueda y paginación en vivo del catálogo institucional de usuarios con filtros por nombre, CI y rol asignado.",
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar criterio de búsqueda o filtro de rol", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/usuarios?q=...&id_rol=...", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT * FROM usuario JOIN persona JOIN rol WHERE ...", isReturn: false },
                        { from: 3, to: 2, text: "4: Dataset paginado de usuarios con estado", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {data: usuarios, total, per_page}", isReturn: true },
                        { from: 1, to: 0, text: "6: Renderizar tabla dinámica con badges de rol y estado", isReturn: true }
                    ]
                },
                {
                    cu: "CU07",
                    title: "CU07 - Modificar Cuenta de Usuario",
                    actor: "Administrador",
                    controller: "UsuarioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "PUT /api/usuarios/{id}",
                    tables: "usuario, persona, bitacora",
                    desc: "Edición de datos de cuenta institucional, reseteo de clave opcional y registro de MODIFICAR en bitácora.",
                    messages: [
                        { from: 0, to: 1, text: "1: Modificar nombre, email o clave en formulario", isReturn: false },
                        { from: 1, to: 2, text: "2: PUT /api/usuarios/{id} {datos}", isReturn: false },
                        { from: 2, to: 3, text: "3: UPDATE usuario SET nombre_usuario=?, ... WHERE id_usuario=?", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P2_RBAC', 'MODIFICAR', 'usuario', id_usuario)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {success: true, usuario}", isReturn: true },
                        { from: 1, to: 0, text: "6: Notificar cambios guardados en la tabla", isReturn: true }
                    ]
                },
                {
                    cu: "CU08",
                    title: "CU08 - Gestionar Roles y Permisos",
                    actor: "Administrador",
                    controller: "RolPermisoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "PUT /api/roles/{id}/permisos",
                    tables: "rol, permiso, rol_permiso, bitacora",
                    desc: "Configuración de la matriz de privilegios RBAC asignando o desasignando permisos a cada rol del sistema.",
                    messages: [
                        { from: 0, to: 1, text: "1: Seleccionar rol y alternar switches de permisos", isReturn: false },
                        { from: 1, to: 2, text: "2: PUT /api/roles/{id}/permisos {permisos: [ids]}", isReturn: false },
                        { from: 2, to: 3, text: "3: Sincronizar: DELETE antiguos e INSERT INTO rol_permiso", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P2_RBAC', 'MODIFICAR', 'rol_permiso', id_rol)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 200 Matriz RBAC actualizada exitosamente", isReturn: true },
                        { from: 1, to: 0, text: "6: Actualizar privilegios en tiempo real", isReturn: true }
                    ]
                },
                {
                    cu: "CU09",
                    title: "CU09 - Suspender Cuenta de Usuario",
                    actor: "Administrador",
                    controller: "UsuarioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "PUT /api/usuarios/{id}/toggle-estado",
                    tables: "usuario, bitacora",
                    desc: "Inactivación o reactivación preventiva de cuentas de usuario con registro de INACTIVAR en bitácora.",
                    messages: [
                        { from: 0, to: 1, text: "1: Clic en Suspender/Reactivar usuario", isReturn: false },
                        { from: 1, to: 2, text: "2: PUT /api/usuarios/{id}/toggle-estado", isReturn: false },
                        { from: 2, to: 3, text: "3: UPDATE usuario SET estado = 'INACTIVO' WHERE id_usuario = ?", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P2_RBAC', 'INACTIVAR', 'usuario', id_usuario)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 200 {success: true, estado: 'INACTIVO'}", isReturn: true },
                        { from: 1, to: 0, text: "6: Actualizar badge en la fila de la tabla", isReturn: true }
                    ]
                },
                {
                    cu: "CU38",
                    title: "CU38 - Personal Administrativo y Permisos RBAC",
                    actor: "Administrador",
                    controller: "PersonalAdministrativoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/personal-administrativo / POST",
                    tables: "persona, personal_administrativo, rol, bitacora",
                    desc: "Gestión exclusiva para Administrador: asignación de cargos administrativos y control de permisos.",
                    messages: [
                        { from: 0, to: 1, text: "1: Acceder a vista exclusiva de Personal Administrativo", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/personal-administrativo (Verificar rol admin)", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT * FROM personal_administrativo JOIN persona", isReturn: false },
                        { from: 3, to: 2, text: "4: Listado de personal y cargos asignados", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {data: personal_administrativo}", isReturn: true },
                        { from: 1, to: 0, text: "6: Desplegar panel con opciones de gestión de cargo y permisos", isReturn: true }
                    ]
                }
            ]
        },
        {
            pkgName: "P3 - Secuencia Auditoría, Trazabilidad y Bitácora",
            diagrams: [
                {
                    cu: "CU10",
                    title: "CU10 - Registrar Acción Automática en Bitácora",
                    actor: "Sistema / Middleware / Servicio",
                    controller: "AuditoriaService",
                    db: "DB PostgreSQL",
                    extra: "Bitacora",
                    endpoint: "AuditoriaService::registrar(modulo, accion, tabla, id, detalle)",
                    tables: "bitacora",
                    desc: "Registro automático de eventos con filtro de deduplicación de 15 segundos: si los datos son idénticos en la ventana temporal, se previene el duplicado.",
                    messages: [
                        { from: 0, to: 1, text: "1: Operación de negocio ejecutada (CREAR/MODIFICAR/PAGO)", isReturn: false },
                        { from: 1, to: 2, text: "2: Invocar AuditoriaService::registrar() con detalles", isReturn: false },
                        { from: 2, to: 4, text: "3: Consultar duplicado idéntico en los últimos 15 seg", isReturn: false },
                        { from: 4, to: 2, text: "4: Retornar existencia (¿coinciden todos los campos?)", isReturn: true },
                        { from: 2, to: 3, text: "5: Si no existe duplicado: INSERT INTO bitacora (fecha_hora en hora Bolivia)", isReturn: false },
                        { from: 3, to: 2, text: "6: ID de bitácora generado", isReturn: true },
                        { from: 2, to: 1, text: "7: Confirmación de auditoría inmutable completada", isReturn: true },
                        { from: 1, to: 0, text: "8: Continuar flujo sin interrupción", isReturn: true }
                    ]
                },
                {
                    cu: "CU11",
                    title: "CU11 - Consultar y Filtrar Bitácora de Auditoría",
                    actor: "Administrador",
                    controller: "BitacoraController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/bitacora / GET /api/bitacora/live",
                    tables: "bitacora, usuario, persona",
                    desc: "Consulta paginada y en vivo de los eventos de auditoría con fecha y hora sincronizada a Bolivia (America/La_Paz).",
                    messages: [
                        { from: 0, to: 1, text: "1: Aplicar filtros por usuario, módulo, tipo de acción y fechas", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/bitacora?modulo=...&tipo_accion=...&fecha_desde=...", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT * FROM bitacora ORDER BY fecha_hora DESC", isReturn: false },
                        { from: 3, to: 2, text: "4: Colección paginada de eventos auditados", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {data: bitacora, total_hoy, alertas_hoy}", isReturn: true },
                        { from: 1, to: 0, text: "6: Renderizar tabla en vivo con timestamps en hora local", isReturn: true }
                    ]
                }
            ]
        },
        {
            pkgName: "P4 - Secuencia Gestión de Pacientes",
            diagrams: [
                {
                    cu: "CU12",
                    title: "CU12 - Registrar Paciente",
                    actor: "Recepcionista / Admin",
                    controller: "PacienteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/pacientes",
                    tables: "persona, paciente, bitacora",
                    desc: "Registro de nuevo paciente con validación de CI, generación de código secuencial PAC-#### y guardado en PostgreSQL.",
                    messages: [
                        { from: 0, to: 1, text: "1: Completar formulario con CI, nombres, fecha nac y dirección", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/pacientes {ci, nombres, apellidos, fecha_nac, ...}", isReturn: false },
                        { from: 2, to: 3, text: "3: INSERT INTO persona (...) RETURNING id_persona", isReturn: false },
                        { from: 2, to: 3, text: "4: INSERT INTO paciente (id_persona, codigo, direccion, fecha_reg)", isReturn: false },
                        { from: 2, to: 4, text: "5: registrar('P4_PACIENTES', 'REGISTRAR', paciente, 'Nuevo paciente')", isReturn: false },
                        { from: 2, to: 1, text: "6: HTTP 201 Created {paciente, codigo: 'PAC-####'}", isReturn: true },
                        { from: 1, to: 0, text: "7: Mostrar confirmación y abrir ficha del paciente", isReturn: true }
                    ]
                },
                {
                    cu: "CU13",
                    title: "CU13 - Gestionar Información Médica Básica",
                    actor: "Paciente / Médico",
                    controller: "InformacionMedicaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "PUT /api/pacientes/{id}/informacion-medica",
                    tables: "informacion_medica, bitacora",
                    desc: "Carga y actualización de tipo de sangre (A+, O+, etc.), alergias, enfermedades crónicas y medicamentos habituales.",
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar datos clínicos en la pestaña 'Médica'", isReturn: false },
                        { from: 1, to: 2, text: "2: PUT /api/pacientes/{id}/informacion-medica", isReturn: false },
                        { from: 2, to: 3, text: "3: UPSERT INTO informacion_medica (tipo_sangre, alergias, cronicas)", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P4_PACIENTES', 'MODIFICAR', 'informacion_medica', id)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {success: true, informacion_medica}", isReturn: true },
                        { from: 1, to: 0, text: "6: Mostrar toast 'Ficha médica actualizada'", isReturn: true }
                    ]
                },
                {
                    cu: "CU14",
                    title: "CU14 - Gestionar Contacto de Emergencia",
                    actor: "Paciente / Recepcionista",
                    controller: "ContactoEmergenciaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST / PUT /api/pacientes/{id}/contacto-emergencia",
                    tables: "contacto_emergencia, bitacora",
                    desc: "Asociación de contactos de emergencia (familiar, parentesco y teléfono de urgencia) vinculados al paciente.",
                    messages: [
                        { from: 0, to: 1, text: "1: Llenar nombre del contacto, parentesco y teléfono", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/pacientes/{id}/contacto-emergencia", isReturn: false },
                        { from: 2, to: 3, text: "3: INSERT INTO contacto_emergencia (id_paciente, nombre, parentesco, tel)", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P4_PACIENTES', 'REGISTRAR', 'contacto_emergencia', id)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 200 Contacto registrado correctamente", isReturn: true },
                        { from: 1, to: 0, text: "6: Visualizar datos de emergencia en el perfil del paciente", isReturn: true }
                    ]
                },
                {
                    cu: "CU15",
                    title: "CU15 - Buscar y Modificar Datos de Paciente",
                    actor: "Recepcionista / Admin",
                    controller: "PacienteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "PUT /api/pacientes/{id}",
                    tables: "persona, paciente, bitacora",
                    desc: "Búsqueda en vivo de pacientes con selección dinámica de fila para editar datos personales en panel lateral sin valores fijos.",
                    messages: [
                        { from: 0, to: 1, text: "1: Buscar por CI o nombre y hacer clic en la fila del paciente", isReturn: false },
                        { from: 1, to: 1, text: "2: Cargar datos en formulario lateral (CI, Nombres, Teléfono)", isReturn: false },
                        { from: 0, to: 1, text: "3: Modificar datos y presionar 'Guardar cambios'", isReturn: false },
                        { from: 1, to: 2, text: "4: PUT /api/pacientes/{id} {nombres, apellidos, telefono, ...}", isReturn: false },
                        { from: 2, to: 3, text: "5: UPDATE persona SET ... ; UPDATE paciente SET ...", isReturn: false },
                        { from: 2, to: 4, text: "6: registrar('P4_PACIENTES', 'MODIFICAR', 'paciente', id_paciente)", isReturn: false },
                        { from: 2, to: 1, text: "7: HTTP 200 JSON {success: true, paciente: {...}}", isReturn: true },
                        { from: 1, to: 0, text: "8: Actualizar fila de la tabla y mostrar toast de confirmación", isReturn: true }
                    ]
                },
                {
                    cu: "CU16",
                    title: "CU16 - Consultar Historial de Citas",
                    actor: "Paciente / Médico",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/citas?id_paciente=...",
                    tables: "cita, medico, especialidad, persona",
                    desc: "Consulta cronológica del expediente de citas del paciente con estados (PROGRAMADA, CONFIRMADA, ATENDIDA, CANCELADA).",
                    messages: [
                        { from: 0, to: 1, text: "1: Acceder al historial clínico de citas del paciente", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/citas?id_paciente={id}", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT * FROM cita WHERE id_paciente = ? ORDER BY fecha DESC", isReturn: false },
                        { from: 3, to: 2, text: "4: Retornar citas con médico, especialidad y diagnóstico", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {data: citas}", isReturn: true },
                        { from: 1, to: 0, text: "6: Desplegar cronograma de atenciones pasadas y futuras", isReturn: true }
                    ]
                },
                {
                    cu: "CU17",
                    title: "CU17 - Desactivar Registro de Paciente",
                    actor: "Administrador / Recepcionista",
                    controller: "PacienteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "DELETE /api/pacientes/{id}",
                    tables: "persona, paciente, bitacora",
                    desc: "Baja lógica preventiva del paciente preservando su historial clínico inmutable en la base de datos.",
                    messages: [
                        { from: 0, to: 1, text: "1: Confirmar desactivación en diálogo de seguridad", isReturn: false },
                        { from: 1, to: 2, text: "2: DELETE /api/pacientes/{id}", isReturn: false },
                        { from: 2, to: 3, text: "3: UPDATE persona SET activo = false WHERE id_persona = ?", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P4_PACIENTES', 'INACTIVAR', 'paciente', id)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 200 Paciente desactivado lógicamente", isReturn: true },
                        { from: 1, to: 0, text: "6: Actualizar badge a 'INACTIVO' en la interfaz", isReturn: true }
                    ]
                }
            ]
        },
        {
            pkgName: "P5 - Secuencia Gestión Médica y Horarios",
            diagrams: [
                {
                    cu: "CU18",
                    title: "CU18 - Gestionar Especialidades Médicas",
                    actor: "Administrador",
                    controller: "EspecialidadController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST / PUT /api/especialidades",
                    tables: "especialidad, bitacora",
                    desc: "Administración del catálogo de especialidades médicas (Medicina General, Pediatría, Cardiología, etc.).",
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar nombre y descripción de la especialidad", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/especialidades {nombre, descripcion}", isReturn: false },
                        { from: 2, to: 3, text: "3: INSERT INTO especialidad (nombre, descripcion, activo=true)", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P5_MEDICOS', 'REGISTRAR', 'especialidad', id)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 201 Especialidad creada exitosamente", isReturn: true },
                        { from: 1, to: 0, text: "6: Agregar a selectores y catálogos de citas", isReturn: true }
                    ]
                },
                {
                    cu: "CU19",
                    title: "CU19 - Registrar y Administrar Personal Médico",
                    actor: "Administrador",
                    controller: "MedicoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/medicos",
                    tables: "persona, medico, bitacora",
                    desc: "Alta de personal médico con código MED-### y matrícula profesional ante el Colegio Médico.",
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar datos personales, matrícula y código médico", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/medicos {ci, nombres, matricula, codigo}", isReturn: false },
                        { from: 2, to: 3, text: "3: INSERT persona RETURNING id_persona ; INSERT INTO medico", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P5_MEDICOS', 'REGISTRAR', 'medico', id_persona)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 201 Médico registrado en la plantilla", isReturn: true },
                        { from: 1, to: 0, text: "6: Habilitar asignación de turnos y especialidades", isReturn: true }
                    ]
                },
                {
                    cu: "CU20",
                    title: "CU20 - Configurar Horarios y Bloques de Disponibilidad",
                    actor: "Administrador / Recepcionista",
                    controller: "HorarioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/horarios",
                    tables: "horario, medico, bitacora",
                    desc: "Configuración de turnos semanales (día_semana, hora_inicio, hora_fin, duracion_bloque_min = 15).",
                    messages: [
                        { from: 0, to: 1, text: "1: Definir día de atención (1-7), rango de horas y duración", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/horarios {id_medico, dia_semana, hora_inicio, hora_fin}", isReturn: false },
                        { from: 2, to: 3, text: "3: INSERT INTO horario (id_medico, dia_semana, duracion_bloque_min=15)", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P5_MEDICOS', 'REGISTRAR', 'horario', id_horario)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 201 Turno de atención configurado", isReturn: true },
                        { from: 1, to: 0, text: "6: Refrescar grilla de disponibilidad médica", isReturn: true }
                    ]
                },
                {
                    cu: "CU21",
                    title: "CU21 - Desactivar Registro de Médico",
                    actor: "Administrador",
                    controller: "MedicoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "DELETE /api/medicos/{id}",
                    tables: "persona, medico, bitacora",
                    desc: "Baja temporal de médico inactivando su recepción de nuevas citas y preservando consultas históricas.",
                    messages: [
                        { from: 0, to: 1, text: "1: Confirmar suspensión del profesional médico", isReturn: false },
                        { from: 1, to: 2, text: "2: DELETE /api/medicos/{id}", isReturn: false },
                        { from: 2, to: 3, text: "3: UPDATE persona SET activo = false WHERE id_persona = ?", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P5_MEDICOS', 'INACTIVAR', 'medico', id)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 200 Médico desactivado de la plantilla activa", isReturn: true },
                        { from: 1, to: 0, text: "6: Ocultar de la búsqueda de disponibilidad pública", isReturn: true }
                    ]
                },
                {
                    cu: "CU39",
                    title: "CU39 - Asignación de Especialidades por Médico",
                    actor: "Administrador",
                    controller: "MedicoEspecialidadController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "PUT /api/medicos/{id}/especialidades",
                    tables: "medico_especialidad, bitacora",
                    desc: "Asignación múltiple N:M de especialidades a cada doctor para permitir consultas cruzadas.",
                    messages: [
                        { from: 0, to: 1, text: "1: Marcar especialidades a asignar en checklist", isReturn: false },
                        { from: 1, to: 2, text: "2: PUT /api/medicos/{id}/especialidades {especialidades: [ids]}", isReturn: false },
                        { from: 2, to: 3, text: "3: Sincronizar tabla medico_especialidad", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P5_MEDICOS', 'MODIFICAR', 'medico_especialidad', id)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 200 Especialidades asignadas exitosamente", isReturn: true },
                        { from: 1, to: 0, text: "6: Actualizar catálogo de búsqueda por especialidad", isReturn: true }
                    ]
                }
            ]
        },
        {
            pkgName: "P6 - Secuencia Gestión de Citas Médicas y Pasarela de Pagos",
            diagrams: [
                {
                    cu: "CU22",
                    title: "CU22 - Consultar Disponibilidad Horaria (15 Min)",
                    actor: "Paciente / Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/citas/disponibilidad?id_medico=...&fecha=...",
                    tables: "horario, cita, bloqueo_agenda, medico",
                    desc: "Consulta dinámica de bloques de 15 minutos: cruce con horario semanal, citas existentes y bloqueos de agenda. Los bloques ocupados o bloqueados no se pueden tomar.",
                    messages: [
                        { from: 0, to: 1, text: "1: Elegir médico/especialidad y fecha a consultar", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/citas/disponibilidad {id_medico, fecha, duracion=15}", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT horario WHERE dia_semana = ? ; SELECT citas ; SELECT bloqueos", isReturn: false },
                        { from: 3, to: 2, text: "4: Retornar slots de 15 min (LIBRE, OCUPADO, BLOQUEADO)", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {slots, total_bloques, bloques_libres, otros_medicos}", isReturn: true },
                        { from: 0, to: 1, text: "6: Clic en slot LIBRE (se selecciona) / Clic en OCUPADO (emite alerta)", isReturn: false },
                        { from: 1, to: 0, text: "7: Habilitar botón 'Programar en este bloque' con parámetros", isReturn: true }
                    ]
                },
                {
                    cu: "CU23",
                    title: "CU23 - Bloquear Agenda Médica",
                    actor: "Administrador / Médico",
                    controller: "BloqueoAgendaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/bloqueos-agenda",
                    tables: "bloqueo_agenda, bitacora",
                    desc: "Bloqueo preventivo de turnos por feriados nacionales, vacaciones o licencias médicas.",
                    messages: [
                        { from: 0, to: 1, text: "1: Definir rango de fechas y motivo de bloqueo", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/bloqueos-agenda {fecha_inicio, fecha_fin, motivo}", isReturn: false },
                        { from: 2, to: 3, text: "3: INSERT INTO bloqueo_agenda (id_medico, fechas, motivo, tipo)", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P6_CITAS', 'BLOQUEO', 'bloqueo_agenda', id)", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 201 Agenda médica bloqueada correctamente", isReturn: true },
                        { from: 1, to: 0, text: "6: Actualizar grilla bloqueando la selección de turnos", isReturn: true }
                    ]
                },
                {
                    cu: "CU24",
                    title: "CU24 - Programar y Registrar Cita Médica",
                    actor: "Paciente / Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/citas",
                    tables: "cita, historial_estado_cita, bitacora",
                    desc: "Creación de cita médica con generación de código CM-####, estado inicial PROGRAMADA y registro de auditoría.",
                    messages: [
                        { from: 0, to: 1, text: "1: Seleccionar paciente, médico, especialidad, fecha, hora y motivo", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/citas {id_paciente, id_medico, fecha, hora_inicio, ...}", isReturn: false },
                        { from: 2, to: 3, text: "3: INSERT INTO cita (codigo='CM-####', estado='PROGRAMADA')", isReturn: false },
                        { from: 2, to: 3, text: "4: INSERT INTO historial_estado_cita (estado_nuevo='PROGRAMADA')", isReturn: false },
                        { from: 2, to: 4, text: "5: registrar('P6_CITAS', 'REGISTRAR', 'cita', id_cita, 'Cita agendada')", isReturn: false },
                        { from: 2, to: 1, text: "6: HTTP 201 Created {success: true, cita}", isReturn: true },
                        { from: 1, to: 0, text: "7: Mostrar ticket de cita y redirigir a pasarela de pagos (CU41)", isReturn: true }
                    ]
                },
                {
                    cu: "CU25",
                    title: "CU25 - Prevenir Citas Duplicadas (Concurrencia)",
                    actor: "Sistema / Transacción",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/citas (Conflicto de concurrencia)",
                    tables: "cita",
                    desc: "Control de concurrencia mediante índice único y bloqueo transaccional que previene agendar dos citas en el mismo bloque.",
                    messages: [
                        { from: 0, to: 1, text: "1: Petición concurrente para un horario ya tomado", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/citas", isReturn: false },
                        { from: 2, to: 3, text: "3: Verificar conflicto: SELECT 1 FROM cita WHERE medico AND slot", isReturn: false },
                        { from: 3, to: 2, text: "4: Retornar existencia de solapamiento", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 422 Unprocessable Entity {error: 'Horario ya ocupado'}", isReturn: true },
                        { from: 1, to: 0, text: "6: Alerta inmediata 'El bloque acaba de ser reservado, escoge otro'", isReturn: true }
                    ]
                },
                {
                    cu: "CU26",
                    title: "CU26 - Reprogramar Cita Médica",
                    actor: "Paciente / Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "PUT /api/citas/{id}/reprogramar",
                    tables: "cita, historial_estado_cita, bitacora",
                    desc: "Cambio de fecha u hora de una cita programada liberando el turno anterior y registrando la transición.",
                    messages: [
                        { from: 0, to: 1, text: "1: Elegir nueva fecha y hora para la cita existente", isReturn: false },
                        { from: 1, to: 2, text: "2: PUT /api/citas/{id}/reprogramar {nueva_fecha, nueva_hora, motivo}", isReturn: false },
                        { from: 2, to: 3, text: "3: UPDATE cita SET fecha = ?, hora_inicio = ?, estado = 'PROGRAMADA'", isReturn: false },
                        { from: 2, to: 3, text: "4: INSERT INTO historial_estado_cita (motivo='Reprogramación')", isReturn: false },
                        { from: 2, to: 4, text: "5: registrar('P6_CITAS', 'MODIFICAR', 'cita', id, 'Cita reprogramada')", isReturn: false },
                        { from: 2, to: 1, text: "6: HTTP 200 Cita reprogramada con éxito", isReturn: true },
                        { from: 1, to: 0, text: "7: Notificar al paciente con la nueva fecha asignada", isReturn: true }
                    ]
                },
                {
                    cu: "CU27",
                    title: "CU27 - Cancelar Cita Médica",
                    actor: "Paciente / Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "PUT /api/citas/{id}/cancelar",
                    tables: "cita, historial_estado_cita, bitacora",
                    desc: "Cancelación justificada de cita médica, marcando estado CANCELADA y liberando el bloque para otros pacientes.",
                    messages: [
                        { from: 0, to: 1, text: "1: Confirmar anulación e indicar motivo de cancelación", isReturn: false },
                        { from: 1, to: 2, text: "2: PUT /api/citas/{id}/cancelar {motivo_cancelacion}", isReturn: false },
                        { from: 2, to: 3, text: "3: UPDATE cita SET estado = 'CANCELADA', motivo_cancelacion = ?", isReturn: false },
                        { from: 2, to: 3, text: "4: INSERT INTO historial_estado_cita (estado_nuevo='CANCELADA')", isReturn: false },
                        { from: 2, to: 4, text: "5: registrar('P6_CITAS', 'ELIMINAR', 'cita', id, 'Cancelación de cita')", isReturn: false },
                        { from: 2, to: 1, text: "6: HTTP 200 Cita cancelada y bloque liberado en agenda", isReturn: true },
                        { from: 1, to: 0, text: "7: Mostrar confirmación y actualizar disponibilidad", isReturn: true }
                    ]
                },
                {
                    cu: "CU28",
                    title: "CU28 - Emitir Recordatorio de Cita Programada",
                    actor: "Sistema / Cron / Recepcionista",
                    controller: "NotificacionController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/notificaciones/regenerar",
                    tables: "notificacion, cita, paciente, usuario",
                    desc: "Generación automática de recordatorios de citas con antelación de 24h para reducir el ausentismo.",
                    messages: [
                        { from: 0, to: 1, text: "1: Ejecución programada o clic en 'Regenerar Recordatorios'", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/notificaciones/regenerar", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT citas WHERE fecha = CURRENT_DATE + 1 AND estado='CONFIRMADA'", isReturn: false },
                        { from: 2, to: 3, text: "4: INSERT INTO notificacion (id_cita, mensaje, estado='PENDIENTE')", isReturn: false },
                        { from: 2, to: 4, text: "5: registrar('P6_CITAS', 'REGISTRAR', 'notificacion', ...)", isReturn: false },
                        { from: 2, to: 1, text: "6: HTTP 200 Lista de recordatorios generada", isReturn: true },
                        { from: 1, to: 0, text: "7: Presentar bandeja de notificaciones pendientes de envío", isReturn: true }
                    ]
                },
                {
                    cu: "CU29",
                    title: "CU29 - Controlar Asistencia y Llegada del Paciente",
                    actor: "Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "PUT /api/citas/{id}/estado",
                    tables: "cita, historial_estado_cita, bitacora",
                    desc: "Registro de llegada del paciente a recepción pasando el estado de la cita a CONFIRMADA / EN SALA DE ESPERA.",
                    messages: [
                        { from: 0, to: 1, text: "1: Paciente se presenta en recepción física", isReturn: false },
                        { from: 1, to: 2, text: "2: PUT /api/citas/{id}/estado {estado: 'CONFIRMADA', motivo: 'Llegó paciente'}", isReturn: false },
                        { from: 2, to: 3, text: "3: UPDATE cita SET estado = 'CONFIRMADA' WHERE id_cita = ?", isReturn: false },
                        { from: 2, to: 3, text: "4: INSERT INTO historial_estado_cita (estado_nuevo='CONFIRMADA')", isReturn: false },
                        { from: 2, to: 4, text: "5: registrar('P6_CITAS', 'MODIFICAR', 'cita', id, 'Llegada registrada')", isReturn: false },
                        { from: 2, to: 1, text: "6: HTTP 200 Paciente marcado en sala de espera", isReturn: true },
                        { from: 1, to: 0, text: "7: Notificar visualmente al médico en su agenda diaria", isReturn: true }
                    ]
                },
                {
                    cu: "CU30",
                    title: "CU30 - Consultar Agenda Médica Diaria",
                    actor: "Médico Tratante",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/citas?id_medico=...&fecha=...",
                    tables: "cita, paciente, persona",
                    desc: "Visualización ordenada de los turnos del día para el médico con indicadores de estado (espera, atendido, cancelado).",
                    messages: [
                        { from: 0, to: 1, text: "1: Médico abre su agenda de atenciones del día", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/citas?id_medico={id}&fecha={hoy}", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT * FROM cita JOIN paciente WHERE id_medico=? AND fecha=?", isReturn: false },
                        { from: 3, to: 2, text: "4: Retornar lista ordenada de pacientes por bloque de 15 min", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {citas: [...], kpis: {total, atendidas, espera}}", isReturn: true },
                        { from: 1, to: 0, text: "6: Desplegar lista interactiva para llamar a consulta", isReturn: true }
                    ]
                },
                {
                    cu: "CU31",
                    title: "CU31 - Registrar Atención Médica Concluida",
                    actor: "Médico Tratante",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "PUT /api/citas/{id}/atender",
                    tables: "cita, historial_estado_cita, bitacora",
                    desc: "Conclusión de consulta médica: registro de observaciones/diagnóstico, estado ATENDIDA inmutable y auditoría sin duplicados.",
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar observaciones de la consulta y hacer clic en 'Concluir Atención'", isReturn: false },
                        { from: 1, to: 2, text: "2: PUT /api/citas/{id}/atender {observacion_atencion}", isReturn: false },
                        { from: 2, to: 3, text: "3: UPDATE cita SET estado = 'ATENDIDA', fecha_hora_atencion = now()", isReturn: false },
                        { from: 2, to: 3, text: "4: INSERT INTO historial_estado_cita (estado_nuevo='ATENDIDA')", isReturn: false },
                        { from: 2, to: 4, text: "5: registrar('P6_CITAS', 'MODIFICAR', 'cita', id, 'Cita ATENDIDA')", isReturn: false },
                        { from: 2, to: 1, text: "6: HTTP 200 Consulta finalizada exitosamente", isReturn: true },
                        { from: 1, to: 0, text: "7: Mostrar toast de éxito y redirigir a agenda diaria", isReturn: true }
                    ]
                },
                {
                    cu: "CU40",
                    title: "CU40 - Reserva de Ficha Web e Historial de Estados",
                    actor: "Paciente / Recepcionista",
                    controller: "HistorialEstadoCitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/citas/{id}/historial-estados",
                    tables: "historial_estado_cita, cita, usuario",
                    desc: "Trazabilidad completa de la vida de una cita: muestra cada cambio de estado, timestamp real en hora Bolivia y responsable.",
                    messages: [
                        { from: 0, to: 1, text: "1: Solicitar trazabilidad cronológica de una cita", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/citas/{id}/historial-estados", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT * FROM historial_estado_cita WHERE id_cita=? ORDER BY fecha_cambio ASC", isReturn: false },
                        { from: 3, to: 2, text: "4: Colección de transiciones de estado", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {data: [PROGRAMADA -> CONFIRMADA -> ATENDIDA]}", isReturn: true },
                        { from: 1, to: 0, text: "6: Renderizar línea de tiempo interactiva de la ficha médica", isReturn: true }
                    ]
                },
                {
                    cu: "CU41",
                    title: "CU41 - Pasarela de Pago en Línea y Comprobante Digital",
                    actor: "Paciente / Recepcionista",
                    controller: "PagoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/pagos/stripe/crear-sesion / POST /api/pagos",
                    tables: "pago, comprobante_pago, cita, historial_estado_cita, bitacora",
                    desc: "Procesamiento de pagos (QR Simple, Tarjeta o Stripe Payments), confirmación automática de cita y emisión de comprobante COMP-2026-####.",
                    messages: [
                        { from: 0, to: 1, text: "1: Seleccionar método de pago (QR Simple / Tarjeta / Stripe) e ingresar NIT", isReturn: false },
                        { from: 1, to: 2, text: "2: (Si Stripe) POST /api/pagos/stripe/crear-sesion -> Retorna payment_intent", isReturn: false },
                        { from: 1, to: 2, text: "3: POST /api/pagos {id_cita, monto, metodo, nit_ci, referencia_externa}", isReturn: false },
                        { from: 2, to: 3, text: "4: INSERT INTO pago (monto, metodo, estado='APROBADO', fecha_hora=now())", isReturn: false },
                        { from: 2, to: 3, text: "5: INSERT INTO comprobante_pago (numero='COMP-2026-####', monto_total)", isReturn: false },
                        { from: 2, to: 3, text: "6: UPDATE cita SET estado = 'CONFIRMADA' WHERE id_cita = ?", isReturn: false },
                        { from: 2, to: 4, text: "7: registrar('P8_PAGOS', 'REGISTRAR', 'pago', id, 'Pago aprobado')", isReturn: false },
                        { from: 2, to: 1, text: "8: HTTP 201 Created {pago, comprobante_pago}", isReturn: true },
                        { from: 1, to: 0, text: "9: Presentar comprobante digital y habilitar descarga en .txt / PDF", isReturn: true }
                    ]
                },
                {
                    cu: "CU42",
                    title: "CU42 - Historial de Pagos y Gestión de Reembolsos",
                    actor: "Recepcionista / Administrador",
                    controller: "PagoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/pagos / POST /api/pagos/{id}/reembolso",
                    tables: "pago, reembolso, cita, historial_estado_cita, bitacora",
                    desc: "Historial de pagos coordinado en 9 columnas reales. Permite procesar reembolsos marcando pago como REEMBOLSADO, cita CANCELADA y liberando la agenda.",
                    messages: [
                        { from: 0, to: 1, text: "1: Consultar historial de pagos (9 columnas: comprobante, paciente, monto, fecha pago...)", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/pagos", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT * FROM pago JOIN cita JOIN comprobante_pago ORDER BY id_pago DESC", isReturn: false },
                        { from: 3, to: 2, text: "4: Retornar lista de transacciones con fechas reales en hora Bolivia", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {data: pagos, kpis: {recaudado, reembolsado}}", isReturn: true },
                        { from: 0, to: 1, text: "6: Clic en 'Reembolsar', completar motivo justificado y presionar enviar", isReturn: false },
                        { from: 1, to: 2, text: "7: POST /api/pagos/{id}/reembolso {motivo}", isReturn: false },
                        { from: 2, to: 3, text: "8: UPDATE pago SET estado = 'REEMBOLSADO' ; INSERT INTO reembolso", isReturn: false },
                        { from: 2, to: 3, text: "9: UPDATE cita SET estado = 'CANCELADA' (libera el bloque médico)", isReturn: false },
                        { from: 2, to: 4, text: "10: registrar('P8_PAGOS', 'MODIFICAR', 'pago', id, 'Reembolso procesado')", isReturn: false },
                        { from: 2, to: 1, text: "11: HTTP 200 Reembolso procesado exitosamente", isReturn: true },
                        { from: 1, to: 0, text: "12: Actualizar badge a REEMBOLSADO y refrescar tabla", isReturn: true }
                    ]
                }
            ]
        },
        {
            pkgName: "P7 - Secuencia Reportes Gerenciales y Financieros",
            diagrams: [
                {
                    cu: "CU32",
                    title: "CU32 - Reporte de Citas por Período",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/reportes?tipo=CITAS_PERIODO&fecha_desde=...&fecha_hasta=...",
                    tables: "cita, reporte, bitacora",
                    desc: "Análisis estadístico de volumen de citas por estado en un rango de fechas con desglose gráfico.",
                    messages: [
                        { from: 0, to: 1, text: "1: Filtrar por fecha_desde y fecha_hasta", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/reportes?tipo=CITAS_PERIODO", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT estado, count(*) FROM cita WHERE fecha BETWEEN ... GROUP BY estado", isReturn: false },
                        { from: 3, to: 2, text: "4: Totales consolidados de citas", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {kpis, distribucion}", isReturn: true },
                        { from: 1, to: 0, text: "6: Renderizar gráficos de barras y tablas de rendimiento", isReturn: true }
                    ]
                },
                {
                    cu: "CU33",
                    title: "CU33 - Reporte de Atenciones por Médico y Especialidad",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/reportes?tipo=ATENCIONES_MEDICO",
                    tables: "cita, medico, especialidad, reporte",
                    desc: "Productividad médica: total de consultas concluidas por médico y especialidad.",
                    messages: [
                        { from: 0, to: 1, text: "1: Seleccionar médico o especialidad específica", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/reportes?tipo=ATENCIONES_MEDICO", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT medico, esp, count(citas_atendidas) GROUP BY medico", isReturn: false },
                        { from: 3, to: 2, text: "4: Métricas de atención por profesional", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {atenciones_por_medico}", isReturn: true },
                        { from: 1, to: 0, text: "6: Mostrar matriz de productividad y tiempos de consulta", isReturn: true }
                    ]
                },
                {
                    cu: "CU34",
                    title: "CU34 - Reporte de Control de Asistencia y Ausentismo",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/reportes?tipo=ASISTENCIA",
                    tables: "cita, reporte",
                    desc: "Cálculo de tasas de asistencia vs. inasistencias y cancelaciones de citas médicas.",
                    messages: [
                        { from: 0, to: 1, text: "1: Solicitar métricas de cumplimiento de citas", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/reportes?tipo=ASISTENCIA", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT asistencias vs inasistencias vs cancelaciones", isReturn: false },
                        { from: 3, to: 2, text: "4: Tasas porcentuales calculadas", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {tasa_asistencia, tasa_abandono}", isReturn: true },
                        { from: 1, to: 0, text: "6: Graficar tasas de efectividad en el panel gerencial", isReturn: true }
                    ]
                },
                {
                    cu: "CU35",
                    title: "CU35 - Exportar Reportes Administrativos (PDF / CSV)",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "POST /api/reportes {formato: 'PDF' | 'CSV'}",
                    tables: "reporte, bitacora",
                    desc: "Generación y descarga de documentos de reportes oficiales en formatos PDF o CSV con registro de auditoría.",
                    messages: [
                        { from: 0, to: 1, text: "1: Clic en botón 'Exportar PDF' o 'Exportar CSV'", isReturn: false },
                        { from: 1, to: 2, text: "2: POST /api/reportes {tipo, formato: 'PDF', filtros}", isReturn: false },
                        { from: 2, to: 3, text: "3: INSERT INTO reporte (tipo, formato, fecha_generacion=now())", isReturn: false },
                        { from: 2, to: 4, text: "4: registrar('P7_REPORTES', 'REGISTRAR', 'reporte', id, 'Exportación PDF')", isReturn: false },
                        { from: 2, to: 1, text: "5: HTTP 200 Archivo generado (Stream binario / download)", isReturn: true },
                        { from: 1, to: 0, text: "6: Descarga automática iniciada en el navegador", isReturn: true }
                    ]
                },
                {
                    cu: "CU36",
                    title: "CU36 - Reporte de Padrón General de Pacientes",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/reportes?tipo=PADRON_PACIENTES",
                    tables: "paciente, persona, reporte",
                    desc: "Padrón completo de pacientes registrados, agrupados por grupo etario, sexo y estado clínico.",
                    messages: [
                        { from: 0, to: 1, text: "1: Solicitar padrón general de pacientes", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/reportes?tipo=PADRON_PACIENTES", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT * FROM paciente JOIN persona ORDER BY fecha_registro DESC", isReturn: false },
                        { from: 3, to: 2, text: "4: Dataset consolidado de pacientes", isReturn: true },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {padron_pacientes, total_pacientes}", isReturn: true },
                        { from: 1, to: 0, text: "6: Renderizar tabla del padrón y totales demográficos", isReturn: true }
                    ]
                },
                {
                    cu: "CU43",
                    title: "CU43 - Reporte de Ingresos Financieros y Auditoría",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    endpoint: "GET /api/reportes?tipo=INGRESOS_FINANCIEROS",
                    tables: "pago, reembolso, reporte, bitacora",
                    desc: "Balance financiero de recaudación: sumatoria de pagos aprobados por método (QR, Tarjeta, Stripe), reembolsos procesados e ingresos netos.",
                    messages: [
                        { from: 0, to: 1, text: "1: Generar balance financiero de ingresos por consultas", isReturn: false },
                        { from: 1, to: 2, text: "2: GET /api/reportes?tipo=INGRESOS_FINANCIEROS&desde=...&hasta=...", isReturn: false },
                        { from: 2, to: 3, text: "3: SELECT metodo, sum(monto) FROM pago WHERE estado='APROBADO' GROUP BY metodo", isReturn: false },
                        { from: 2, to: 3, text: "4: SELECT sum(monto) FROM reembolso WHERE estado='PROCESADO'", isReturn: false },
                        { from: 3, to: 2, text: "5: Retornar balances netos y desglose por canal de cobro", isReturn: true },
                        { from: 2, to: 4, text: "6: registrar('P7_REPORTES', 'REGISTRAR', 'reporte', id, 'Balance financiero')", isReturn: false },
                        { from: 2, to: 1, text: "7: HTTP 200 JSON {ingresos_brutos, reembolsos, total_neto}", isReturn: true },
                        { from: 1, to: 0, text: "8: Desplegar KPIs financieros y gráficos de recaudación", isReturn: true }
                    ]
                }
            ]
        }
    ];

    var totalDiagrams = 0;

    // Procesar cada módulo y generar sus diagramas de secuencia estructurados
    for (var m = 0; m < modules.length; m++) {
        var modData = modules[m];
        Session.Output("\n[Módulo " + (m + 1) + "/7] Creando Paquete: " + modData.pkgName + "...");

        var modPkg = rootSeqPkg.Packages.AddNew(modData.pkgName, "");
        modPkg.Update();
        rootSeqPkg.Packages.Refresh();

        for (var d = 0; d < modData.diagrams.length; d++) {
            var dData = modData.diagrams[d];
            totalDiagrams++;

            Session.Output("  -> Creando Diagrama de Secuencia (" + totalDiagrams + "/43): " + dData.title);

            // 1. Crear subpaquete para encapsular el caso de uso y sus elementos UML
            var cuPkg = modPkg.Packages.AddNew(dData.cu + " - " + dData.title, "");
            cuPkg.Update();
            modPkg.Packages.Refresh();

            // 2. Crear el Diagrama de Secuencia UML
            var seqDiagram = cuPkg.Diagrams.AddNew(dData.title, "Sequence");
            seqDiagram.Notes = "Caso de Uso: " + dData.title + "\n" +
                               "Endpoint REST: " + dData.endpoint + "\n" +
                               "Tablas PostgreSQL: " + dData.tables + "\n" +
                               "Descripción: " + dData.desc;
            seqDiagram.Update();
            cuPkg.Diagrams.Refresh();

            // 3. Crear las Líneas de Vida (Lifelines) estándar
            var lifelinesDef = [
                { name: dData.actor, type: "Actor" },
                { name: ":Frontend Web (JS/DOM)", type: "Sequence" },
                { name: ":" + dData.controller + " (Laravel)", type: "Sequence" },
                { name: ":" + dData.db, type: "Sequence" },
                { name: ":" + dData.extra, type: "Sequence" }
            ];

            var lifelinesObj = [];
            var startX = 60;
            var gapX = 210;
            var width = 130;
            var top = -30;
            // Cálculo dinámico de altura vertical para que los mensajes no queden comprimidos
            var msgCount = dData.messages.length;
            var bottom = -(90 + (msgCount * 46));

            for (var l = 0; l < lifelinesDef.length; l++) {
                var lDef = lifelinesDef[l];
                var lElement = cuPkg.Elements.AddNew(lDef.name, lDef.type);
                lElement.Update();
                lifelinesObj.push(lElement);

                // Posicionamiento horizontal y vertical en el diagrama
                var left = startX + (l * gapX);
                var right = left + width;

                var diagObj = seqDiagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
                diagObj.ElementID = lElement.ElementID;
                diagObj.Update();
            }

            // 4. Crear Nota descriptiva a la derecha del diagrama (diseño agradable e informativo)
            var noteElement = cuPkg.Elements.AddNew("Nota Técnica - " + dData.cu, "Note");
            noteElement.Notes = "CASO DE USO: " + dData.title + "\n\n" +
                                "• Endpoint: " + dData.endpoint + "\n" +
                                "• Tablas BD: " + dData.tables + "\n\n" +
                                "DESCRIPCIÓN:\n" + dData.desc;
            noteElement.Update();

            var noteLeft = startX + (lifelinesDef.length * gapX) + 30;
            var noteRight = noteLeft + 280;
            var noteBottom = -210;
            var noteDiagObj = seqDiagram.DiagramObjects.AddNew("l=" + noteLeft + ";r=" + noteRight + ";t=" + top + ";b=" + noteBottom + ";", "");
            noteDiagObj.ElementID = noteElement.ElementID;
            noteDiagObj.Update();

            cuPkg.Elements.Refresh();

            // 5. Crear los Mensajes de Secuencia entre las Líneas de Vida
            for (var msgIdx = 0; msgIdx < dData.messages.length; msgIdx++) {
                var mItem = dData.messages[msgIdx];
                var fromLifeline = lifelinesObj[mItem.from];
                var toLifeline = lifelinesObj[mItem.to];

                if (fromLifeline != null && toLifeline != null) {
                    var seqCon = fromLifeline.Connectors.AddNew(mItem.text, "Sequence");
                    seqCon.SupplierID = toLifeline.ElementID;
                    seqCon.SequenceNo = msgIdx + 1;

                    // Si es respuesta / retorno HTTP o de BD, aplicar estereotipo UML return
                    if (mItem.isReturn) {
                        seqCon.Stereotype = "return";
                    }

                    seqCon.Update();
                    fromLifeline.Connectors.Refresh();
                }
            }

            seqDiagram.Update();
            Repository.ReloadDiagram(seqDiagram.DiagramID);
        }
    }

    Repository.RefreshModelView(rootSeqPkg.PackageID);
    Repository.ShowInProjectView(rootSeqPkg);

    Session.Output("\n========================================================================");
    Session.Output(" Proceso finalizado con éxito: " + totalDiagrams + " Diagramas de Secuencia creados.");
    Session.Output(" Paquetes estructurados en los 7 módulos (P1 a P7).");
    Session.Output("========================================================================");
    Session.Prompt("¡Generación completada! Se crearon exitosamente los " + totalDiagrams + " Diagramas de Secuencia UML con sus notas técnicas, líneas de vida y mensajes ordenados en Enterprise Architect.", 0);
}

// Iniciar ejecución
main();
