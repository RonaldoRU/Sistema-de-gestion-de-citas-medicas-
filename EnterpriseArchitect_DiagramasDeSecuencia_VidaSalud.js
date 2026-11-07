!INC Local Scripts.EAConstants-JScript

/* =========================================================================================
 * Script Name: GenerarDiagramasDeSecuencia_VidaSalud_CU01_CU43.js
 * Author:      Clínica Vida Salud - Sistema de Gestión de Citas Médicas
 * Purpose:     Genera automáticamente en Sparx Systems Enterprise Architect:
 *              - 1 Paquete contenedor general "Diagramas de Secuencia (CU01-CU43)"
 *              - 7 Subpaquetes para los módulos del sistema (P1 a P7)
 *              - 43 Diagramas de Secuencia UML individuales (uno por cada Caso de Uso)
 *              - Líneas de vida (Lifelines) estándar por diagrama: Actor, Frontend, Controlador, DB y Bitácora
 *              - Mensajes de secuencia UML numerados y ordenados cronológicamente
 * Language:    JScript (Compatible con Enterprise Architect 12, 13, 14, 15, 16)
 * ========================================================================================= */

function main()
{
    Repository.EnsureOutputVisible("Script");
    Session.Output("========================================================================");
    Session.Output(" Iniciando creación de los 43 Diagramas de Secuencia - Clínica Vida Salud ");
    Session.Output("========================================================================");

    var targetPackage = Repository.GetTreeSelectedPackage();
    if (targetPackage == null)
    {
        Session.Prompt("Por favor, selecciona un Paquete o Vista en el Project Browser antes de ejecutar este script.", 0);
        return;
    }

    Session.Output("Paquete destino: " + targetPackage.Name);

    // Paquete raíz para los Diagramas de Secuencia
    var rootSeqPkg = targetPackage.Packages.AddNew("Diagramas de Secuencia - Clínica Vida Salud (CU01-CU43)", "");
    rootSeqPkg.Notes = "Diagramas de secuencia UML que detallan la interacción entre Actores, Frontend Web, Controladores Laravel, Base de Datos PostgreSQL y el Servicio de Auditoría para los 43 Casos de Uso.";
    rootSeqPkg.Update();
    targetPackage.Packages.Refresh();

    // Definición de los 43 Casos de Uso con sus flujos de secuencia
    var modules = [
        {
            pkgName: "P1 - Secuencia Seguridad y Autenticación",
            diagrams: [
                {
                    cu: "CU01",
                    title: "CU01 - Iniciar Sesión",
                    actor: "Usuario / Paciente",
                    controller: "SesionController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar credenciales (usuario, clave)" },
                        { from: 1, to: 2, text: "2: POST /api/auth/login" },
                        { from: 2, to: 3, text: "3: SELECT * FROM usuario WHERE nombre_usuario = ?" },
                        { from: 3, to: 2, text: "4: Retornar usuario con hash y rol" },
                        { from: 2, to: 2, text: "5: Hash::check(clave, hash_contrasena)" },
                        { from: 2, to: 3, text: "6: INSERT INTO sesion (token, ip, fecha_inicio)" },
                        { from: 2, to: 4, text: "7: registrar('P1_SEGURIDAD', 'LOGIN', usuario)" },
                        { from: 2, to: 1, text: "8: HTTP 200 JSON {success: true, token, rol, usuario}" },
                        { from: 1, to: 0, text: "9: Redirigir según rol (inicio.html / portal)" }
                    ]
                },
                {
                    cu: "CU02",
                    title: "CU02 - Cerrar Sesión",
                    actor: "Usuario Autenticado",
                    controller: "SesionController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Clic en Salir / Diálogo de confirmación" },
                        { from: 1, to: 2, text: "2: POST /api/auth/logout (Bearer token)" },
                        { from: 2, to: 3, text: "3: UPDATE sesion SET activa = false, fecha_fin = now()" },
                        { from: 2, to: 4, text: "4: registrar('P1_SEGURIDAD', 'LOGOUT', usuario)" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {success: true, message: 'Sesión cerrada'}" },
                        { from: 1, to: 1, text: "6: Limpiar localStorage y sessionStorage" },
                        { from: 1, to: 0, text: "7: Redirigir a cu02-sesion-cerrada.html" }
                    ]
                },
                {
                    cu: "CU03",
                    title: "CU03 - Recuperar Contraseña",
                    actor: "Usuario / Paciente",
                    controller: "TokenRecuperacionController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Solicitar recuperación por correo o CI" },
                        { from: 1, to: 2, text: "2: POST /api/auth/recuperar-clave/solicitar" },
                        { from: 2, to: 3, text: "3: INSERT INTO token_recuperacion (token, expira)" },
                        { from: 2, to: 1, text: "4: Token de restablecimiento generado" },
                        { from: 0, to: 1, text: "5: Ingresar token y nueva contraseña" },
                        { from: 1, to: 2, text: "6: POST /api/auth/recuperar-clave/restablecer" },
                        { from: 2, to: 3, text: "7: UPDATE usuario SET hash_contrasena = Hash::make()" },
                        { from: 2, to: 4, text: "8: registrar('P1_SEGURIDAD', 'RESET_PASSWORD')" },
                        { from: 2, to: 1, text: "9: HTTP 200 Clave restablecida exitosamente" },
                        { from: 1, to: 0, text: "10: Notificar al usuario e invitar a iniciar sesión" }
                    ]
                },
                {
                    cu: "CU04",
                    title: "CU04 - Bloqueo por Intentos Fallidos",
                    actor: "Usuario no autenticado",
                    controller: "SesionController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Intento fallido de login con clave errónea" },
                        { from: 1, to: 2, text: "2: POST /api/auth/login" },
                        { from: 2, to: 3, text: "3: UPDATE usuario SET intentos_fallidos = intentos_fallidos + 1" },
                        { from: 2, to: 2, text: "4: Evaluar condición (intentos >= 3)" },
                        { from: 2, to: 3, text: "5: UPDATE usuario SET bloqueado_hasta = now() + 1 min" },
                        { from: 2, to: 4, text: "6: registrar('P1_SEGURIDAD', 'BLOQUEO', usuario)" },
                        { from: 2, to: 1, text: "7: HTTP 423 {bloqueado: true, tiempo: 60s}" },
                        { from: 1, to: 0, text: "8: Mostrar alerta de bloqueo temporal en pantalla" }
                    ]
                },
                {
                    cu: "CU37",
                    title: "CU37 - Auto-Registro de Paciente Web y Sesiones",
                    actor: "Paciente Web",
                    controller: "PacienteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Llenar formulario de registro (CI, nombres, email, pass)" },
                        { from: 1, to: 2, text: "2: POST /api/auth/autoregistro-paciente" },
                        { from: 2, to: 3, text: "3: Validar CI único e INSERT INTO persona" },
                        { from: 2, to: 3, text: "4: INSERT INTO paciente (codigo PAC-####, fecha_nac)" },
                        { from: 2, to: 3, text: "5: INSERT INTO usuario (id_rol = 4 [Paciente], hash_pass)" },
                        { from: 2, to: 4, text: "6: registrar('P1_SEGURIDAD', 'REGISTRAR', paciente)" },
                        { from: 2, to: 1, text: "7: HTTP 201 {success: true, paciente, usuario}" },
                        { from: 1, to: 0, text: "8: Confirmación y acceso habilitado al portal paciente" }
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
                    messages: [
                        { from: 0, to: 1, text: "1: Formulario nuevo usuario institucional" },
                        { from: 1, to: 2, text: "2: POST /api/usuarios" },
                        { from: 2, to: 3, text: "3: Validar unicidad e INSERT INTO usuario" },
                        { from: 2, to: 4, text: "4: registrar('P2_RBAC', 'REGISTRAR', usuario)" },
                        { from: 2, to: 1, text: "5: HTTP 201 {usuario creado}" },
                        { from: 1, to: 0, text: "6: Notificar éxito y actualizar tabla" }
                    ]
                },
                {
                    cu: "CU06",
                    title: "CU06 - Consultar Catálogo de Usuarios",
                    actor: "Administrador",
                    controller: "UsuarioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Abrir catálogo y aplicar filtros de búsqueda" },
                        { from: 1, to: 2, text: "2: GET /api/usuarios?search=..." },
                        { from: 2, to: 3, text: "3: SELECT * FROM usuario JOIN rol JOIN persona" },
                        { from: 3, to: 2, text: "4: Listado paginado de usuarios" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {data: usuarios, total}" },
                        { from: 1, to: 0, text: "6: Renderizar catálogo y badges de rol" }
                    ]
                },
                {
                    cu: "CU07",
                    title: "CU07 - Modificar Cuenta de Usuario",
                    actor: "Administrador",
                    controller: "UsuarioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Modificar datos de cuenta o credencial" },
                        { from: 1, to: 2, text: "2: PUT /api/usuarios/{id}" },
                        { from: 2, to: 3, text: "3: UPDATE usuario SET ... WHERE id_usuario = ?" },
                        { from: 2, to: 4, text: "4: registrar('P2_RBAC', 'MODIFICAR', usuario)" },
                        { from: 2, to: 1, text: "5: HTTP 200 {success: true, usuario}" },
                        { from: 1, to: 0, text: "6: Toast 'Datos modificados correctamente'" }
                    ]
                },
                {
                    cu: "CU08",
                    title: "CU08 - Gestionar Roles y Permisos",
                    actor: "Administrador",
                    controller: "RolController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Seleccionar rol y conmutar permisos" },
                        { from: 1, to: 2, text: "2: POST /api/roles/{id}/permisos" },
                        { from: 2, to: 3, text: "3: DELETE / INSERT INTO rol_permiso" },
                        { from: 2, to: 4, text: "4: registrar('P2_RBAC', 'ASIGNAR_PERMISOS', rol)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Matriz RBAC actualizada" },
                        { from: 1, to: 0, text: "6: Confirmar asignación en pantalla" }
                    ]
                },
                {
                    cu: "CU09",
                    title: "CU09 - Suspender Cuenta de Usuario",
                    actor: "Administrador",
                    controller: "UsuarioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Clic en Suspender / Inactivar cuenta" },
                        { from: 1, to: 2, text: "2: POST /api/usuarios/{id}/toggle-estado" },
                        { from: 2, to: 3, text: "3: UPDATE usuario SET estado = 'INACTIVO'" },
                        { from: 2, to: 4, text: "4: registrar('P2_RBAC', 'INACTIVAR', usuario)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Cuenta inactivada" },
                        { from: 1, to: 0, text: "6: Actualizar badge a INACTIVO" }
                    ]
                },
                {
                    cu: "CU38",
                    title: "CU38 - Personal Administrativo y Permisos RBAC",
                    actor: "Administrador",
                    controller: "PersonalController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Asignar cargo a personal y asociar permisos" },
                        { from: 1, to: 2, text: "2: POST /api/personal-administrativo" },
                        { from: 2, to: 3, text: "3: INSERT INTO personal_administrativo (cargo, ci)" },
                        { from: 2, to: 4, text: "4: registrar('P2_RBAC', 'REGISTRAR', personal)" },
                        { from: 2, to: 1, text: "5: HTTP 201 Personal y permisos vinculados" },
                        { from: 1, to: 0, text: "6: Mostrar ficha de personal actualizada" }
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
                    actor: "Sistema / Middleware",
                    controller: "RegistrarBitacoraEnVivo",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Detectar mutación HTTP (POST/PUT/DELETE)" },
                        { from: 1, to: 3, text: "2: Invocar AuditoriaService::registrar()" },
                        { from: 3, to: 2, text: "3: INSERT INTO bitacora (modulo, accion, usuario, fecha, ip)" },
                        { from: 2, to: 3, text: "4: Retornar ID de bitácora generado" },
                        { from: 3, to: 1, text: "5: Registro inmutable confirmado" },
                        { from: 1, to: 0, text: "6: Continuar ejecución de la petición" }
                    ]
                },
                {
                    cu: "CU11",
                    title: "CU11 - Consultar y Filtrar Bitácora de Auditoría",
                    actor: "Administrador",
                    controller: "BitacoraController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Filtrar eventos por rango, módulo o acción" },
                        { from: 1, to: 2, text: "2: GET /api/bitacora?modulo=...&accion=..." },
                        { from: 2, to: 3, text: "3: SELECT * FROM bitacora WHERE ... ORDER BY fecha DESC" },
                        { from: 3, to: 2, text: "4: Colección paginada de auditoría" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {data: eventos, total, kpis}" },
                        { from: 1, to: 0, text: "6: Renderizar tabla en vivo y línea de tiempo" }
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
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar datos de filiación y CI" },
                        { from: 1, to: 2, text: "2: POST /api/pacientes" },
                        { from: 2, to: 3, text: "3: INSERT INTO persona (...) RETURNING id_persona" },
                        { from: 2, to: 3, text: "4: INSERT INTO paciente (codigo PAC-####, direccion)" },
                        { from: 2, to: 4, text: "5: registrar('P4_PACIENTES', 'REGISTRAR', paciente)" },
                        { from: 2, to: 1, text: "6: HTTP 201 {paciente creado, codigo}" },
                        { from: 1, to: 0, text: "7: Mostrar carnet / ficha de paciente creada" }
                    ]
                },
                {
                    cu: "CU13",
                    title: "CU13 - Gestionar Información Médica Básica",
                    actor: "Paciente / Médico",
                    controller: "PacienteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Cargar alergias, tipo de sangre y antecedentes" },
                        { from: 1, to: 2, text: "2: PUT /api/pacientes/{id}/informacion-medica" },
                        { from: 2, to: 3, text: "3: UPDATE paciente SET tipo_sangre=?, alergias=?" },
                        { from: 2, to: 4, text: "4: registrar('P4_PACIENTES', 'ACTUALIZAR_MEDICA', paciente)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Información médica guardada" },
                        { from: 1, to: 0, text: "6: Notificar actualización clínica exitosa" }
                    ]
                },
                {
                    cu: "CU14",
                    title: "CU14 - Gestionar Contacto de Emergencia",
                    actor: "Paciente / Recepcionista",
                    controller: "PacienteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar familiar de contacto y teléfono de urgencia" },
                        { from: 1, to: 2, text: "2: POST /api/pacientes/{id}/contacto-emergencia" },
                        { from: 2, to: 3, text: "3: INSERT INTO contacto_emergencia (nombre, parentesco, tel)" },
                        { from: 2, to: 4, text: "4: registrar('P4_PACIENTES', 'CONTACTO_EMERGENCIA')" },
                        { from: 2, to: 1, text: "5: HTTP 200 Contacto vinculado" },
                        { from: 1, to: 0, text: "6: Visualizar contacto en perfil del paciente" }
                    ]
                },
                {
                    cu: "CU15",
                    title: "CU15 - Buscar y Modificar Datos de Paciente",
                    actor: "Recepcionista / Admin",
                    controller: "PacienteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Buscar por CI y actualizar teléfono o domicilio" },
                        { from: 1, to: 2, text: "2: PUT /api/pacientes/{id}" },
                        { from: 2, to: 3, text: "3: UPDATE persona / UPDATE paciente" },
                        { from: 2, to: 4, text: "4: registrar('P4_PACIENTES', 'MODIFICAR', paciente)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Datos de paciente actualizados" },
                        { from: 1, to: 0, text: "6: Refrescar información en pantalla" }
                    ]
                },
                {
                    cu: "CU16",
                    title: "CU16 - Consultar Historial de Citas",
                    actor: "Paciente / Médico",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Solicitar historial cronológico de citas" },
                        { from: 1, to: 2, text: "2: GET /api/pacientes/{id}/citas" },
                        { from: 2, to: 3, text: "3: SELECT * FROM cita WHERE id_paciente = ? ORDER BY fecha DESC" },
                        { from: 3, to: 2, text: "4: Retornar citas atendidas, canceladas y pendientes" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {data: citas_historial}" },
                        { from: 1, to: 0, text: "6: Renderizar línea de tiempo de consultas" }
                    ]
                },
                {
                    cu: "CU17",
                    title: "CU17 - Desactivar Registro de Paciente",
                    actor: "Administrador / Recepcionista",
                    controller: "PacienteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Confirmar desactivación de paciente" },
                        { from: 1, to: 2, text: "2: DELETE /api/pacientes/{id}" },
                        { from: 2, to: 3, text: "3: UPDATE persona SET activo = false WHERE id_persona = ?" },
                        { from: 2, to: 4, text: "4: registrar('P4_PACIENTES', 'DESACTIVAR', paciente)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Paciente desactivado" },
                        { from: 1, to: 0, text: "6: Marcar estado INACTIVO preservando historial" }
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
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar código, nombre y duración de consulta" },
                        { from: 1, to: 2, text: "2: POST /api/especialidades" },
                        { from: 2, to: 3, text: "3: INSERT INTO especialidad (codigo, nombre, duracion)" },
                        { from: 2, to: 4, text: "4: registrar('P5_MEDICOS', 'REGISTRAR', especialidad)" },
                        { from: 2, to: 1, text: "5: HTTP 201 Especialidad registrada" },
                        { from: 1, to: 0, text: "6: Agregar especialidad al catálogo activo" }
                    ]
                },
                {
                    cu: "CU19",
                    title: "CU19 - Registrar y Administrar Personal Médico",
                    actor: "Administrador",
                    controller: "MedicoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Completar datos personales y matrícula profesional" },
                        { from: 1, to: 2, text: "2: POST /api/medicos" },
                        { from: 2, to: 3, text: "3: INSERT persona + INSERT medico (nro_colegiatura)" },
                        { from: 2, to: 4, text: "4: registrar('P5_MEDICOS', 'REGISTRAR', medico)" },
                        { from: 2, to: 1, text: "5: HTTP 201 Médico registrado exitosamente" },
                        { from: 1, to: 0, text: "6: Habilitar asignación de turnos y agenda" }
                    ]
                },
                {
                    cu: "CU20",
                    title: "CU20 - Configurar Horarios y Bloques de Disponibilidad",
                    actor: "Administrador / Recepcionista",
                    controller: "HorarioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Definir días, hora inicio/fin y duración por bloque" },
                        { from: 1, to: 2, text: "2: POST /api/horarios-atencion" },
                        { from: 2, to: 3, text: "3: INSERT INTO horario_atencion (dia_semana, turnos)" },
                        { from: 2, to: 4, text: "4: registrar('P5_MEDICOS', 'CONFIGURAR_HORARIO')" },
                        { from: 2, to: 1, text: "5: HTTP 201 Bloques de atención generados" },
                        { from: 1, to: 0, text: "6: Visualizar calendario de turnos habilitados" }
                    ]
                },
                {
                    cu: "CU21",
                    title: "CU21 - Desactivar Registro de Médico",
                    actor: "Administrador",
                    controller: "MedicoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Suspender médico de la plantilla activa" },
                        { from: 1, to: 2, text: "2: DELETE /api/medicos/{id}" },
                        { from: 2, to: 3, text: "3: UPDATE persona SET activo = false WHERE id_persona = ?" },
                        { from: 2, to: 4, text: "4: registrar('P5_MEDICOS', 'INACTIVAR', medico)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Médico inactivado" },
                        { from: 1, to: 0, text: "6: Bloquear recepción de nuevas citas" }
                    ]
                },
                {
                    cu: "CU39",
                    title: "CU39 - Asignación de Especialidades por Médico",
                    actor: "Administrador",
                    controller: "MedicoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Seleccionar médico y marcar especialidades" },
                        { from: 1, to: 2, text: "2: POST /api/medicos/{id}/especialidades" },
                        { from: 2, to: 3, text: "3: INSERT INTO medico_especialidad (id_medico, id_esp)" },
                        { from: 2, to: 4, text: "4: registrar('P5_MEDICOS', 'ASIGNAR_ESPECIALIDAD')" },
                        { from: 2, to: 1, text: "5: HTTP 200 Especialidades asociadas" },
                        { from: 1, to: 0, text: "6: Refrescar catálogo de atención por especialidad" }
                    ]
                }
            ]
        },
        {
            pkgName: "P6 - Secuencia Gestión de Citas Médicas",
            diagrams: [
                {
                    cu: "CU22",
                    title: "CU22 - Consultar Disponibilidad Horaria",
                    actor: "Paciente / Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Elegir especialidad, médico y fecha de consulta" },
                        { from: 1, to: 2, text: "2: GET /api/citas/disponibilidad" },
                        { from: 2, to: 3, text: "3: SELECT bloques_libres WHERE NOT EXISTS (citas)" },
                        { from: 3, to: 2, text: "4: Turnos disponibles en el intervalo" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {bloques_disponibles}" },
                        { from: 1, to: 0, text: "6: Desplegar selector de turnos libres" }
                    ]
                },
                {
                    cu: "CU23",
                    title: "CU23 - Bloquear Agenda Médica",
                    actor: "Administrador / Médico",
                    controller: "HorarioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Bloquear día por feriado, licencia o vacaciones" },
                        { from: 1, to: 2, text: "2: POST /api/bloqueos-agenda" },
                        { from: 2, to: 3, text: "3: INSERT INTO bloqueo_agenda (fecha, motivo)" },
                        { from: 2, to: 4, text: "4: registrar('P6_CITAS', 'BLOQUEAR_AGENDA')" },
                        { from: 2, to: 1, text: "5: HTTP 201 Agenda médica bloqueada" },
                        { from: 1, to: 0, text: "6: Notificar y ocultar turnos del calendario" }
                    ]
                },
                {
                    cu: "CU24",
                    title: "CU24 - Programar y Registrar Cita Médica",
                    actor: "Paciente / Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Seleccionar turno y motivo de atención" },
                        { from: 1, to: 2, text: "2: POST /api/citas" },
                        { from: 2, to: 3, text: "3: Validar disponibilidad y bloqueo transaccional" },
                        { from: 2, to: 3, text: "4: INSERT INTO cita (estado='PROGRAMADA', fecha, hora)" },
                        { from: 2, to: 4, text: "5: registrar('P6_CITAS', 'PROGRAMAR', cita)" },
                        { from: 2, to: 1, text: "6: HTTP 201 {cita creada, codigo_ticket}" },
                        { from: 1, to: 0, text: "7: Presentar comprobante de cita y opción de pago" }
                    ]
                },
                {
                    cu: "CU25",
                    title: "CU25 - Prevenir Citas Duplicadas (Concurrencia)",
                    actor: "Sistema / Transacción",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Petición simultánea de reserva sobre el mismo turno" },
                        { from: 1, to: 2, text: "2: Iniciar SELECT ... FOR UPDATE sobre el horario" },
                        { from: 2, to: 1, text: "3: Detectar que el turno ya fue reservado" },
                        { from: 1, to: 3, text: "4: registrar('P6_CITAS', 'CONFLICTO_CONCURRENCIA')" },
                        { from: 1, to: 0, text: "5: HTTP 409 Conflicto: 'Turno ya no disponible'" },
                        { from: 0, to: 0, text: "6: Alerta inmediata al segundo usuario para elegir otro turno" }
                    ]
                },
                {
                    cu: "CU26",
                    title: "CU26 - Reprogramar Cita Médica",
                    actor: "Paciente / Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Seleccionar nuevo día y bloque para la cita" },
                        { from: 1, to: 2, text: "2: PUT /api/citas/{id}/reprogramar" },
                        { from: 2, to: 3, text: "3: UPDATE cita SET fecha=?, hora=?, estado='REPROGRAMADA'" },
                        { from: 2, to: 4, text: "4: registrar('P6_CITAS', 'REPROGRAMAR', cita)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Cita reprogramada exitosamente" },
                        { from: 1, to: 0, text: "6: Emitir nuevo comprobante con horario actualizado" }
                    ]
                },
                {
                    cu: "CU27",
                    title: "CU27 - Cancelar Cita Médica",
                    actor: "Paciente / Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Cancelar cita y justificar motivo" },
                        { from: 1, to: 2, text: "2: PUT /api/citas/{id}/cancelar" },
                        { from: 2, to: 3, text: "3: UPDATE cita SET estado='CANCELADA', motivo=?" },
                        { from: 2, to: 4, text: "4: registrar('P6_CITAS', 'CANCELAR', cita)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Cita cancelada y turno liberado" },
                        { from: 1, to: 0, text: "6: Confirmar cancelación y liberar bloque en agenda" }
                    ]
                },
                {
                    cu: "CU28",
                    title: "CU28 - Emitir Recordatorio de Cita Programada",
                    actor: "Sistema / Cron",
                    controller: "RecordatorioController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Ejecución programada de verificación de citas" },
                        { from: 1, to: 2, text: "2: SELECT citas WHERE fecha = CURRENT_DATE + 1" },
                        { from: 2, to: 1, text: "3: Citas pendientes para el día siguiente" },
                        { from: 1, to: 2, text: "4: INSERT INTO recordatorio_notificacion (id_cita, canal)" },
                        { from: 1, to: 3, text: "5: registrar('P6_CITAS', 'EMITIR_RECORDATORIO')" },
                        { from: 1, to: 0, text: "6: Notificación enviada al paciente (SMS/Email/Portal)" }
                    ]
                },
                {
                    cu: "CU29",
                    title: "CU29 - Controlar Asistencia y Estados de Cita",
                    actor: "Recepcionista / Médico",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Paciente se presenta en recepción" },
                        { from: 1, to: 2, text: "2: PUT /api/citas/{id}/asistencia" },
                        { from: 2, to: 3, text: "3: UPDATE cita SET estado = 'EN_ESPERA'" },
                        { from: 2, to: 4, text: "4: registrar('P6_CITAS', 'ASISTENCIA', cita)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Paciente registrado en sala" },
                        { from: 1, to: 0, text: "6: Mostrar badge 'En Sala de Espera'" }
                    ]
                },
                {
                    cu: "CU30",
                    title: "CU30 - Consultar Agenda Médica Diaria",
                    actor: "Médico / Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Abrir agenda médica del día" },
                        { from: 1, to: 2, text: "2: GET /api/citas/agenda-diaria" },
                        { from: 2, to: 3, text: "3: SELECT * FROM cita WHERE id_medico=? AND fecha=today()" },
                        { from: 3, to: 2, text: "4: Listado ordenado por turno cronológico" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {agenda_diaria}" },
                        { from: 1, to: 0, text: "6: Desplegar pacientes agendados y turnos" }
                    ]
                },
                {
                    cu: "CU31",
                    title: "CU31 - Registrar Atención Médica Concluida",
                    actor: "Médico Tratante",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Ingresar diagnóstico, receta y evolución clínica" },
                        { from: 1, to: 2, text: "2: POST /api/citas/{id}/atender" },
                        { from: 2, to: 3, text: "3: UPDATE cita SET estado = 'ATENDIDA', diagnostico=?" },
                        { from: 2, to: 4, text: "4: registrar('P6_CITAS', 'ATENDER', cita)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Atención concluida" },
                        { from: 1, to: 0, text: "6: Cita marcada como ATENDIDA y receta generada" }
                    ]
                },
                {
                    cu: "CU40",
                    title: "CU40 - Reserva de Ficha Web e Historial de Estados",
                    actor: "Paciente / Recepcionista",
                    controller: "CitaController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Consultar evolución y trazabilidad de la cita" },
                        { from: 1, to: 2, text: "2: GET /api/citas/{id}/historial-estados" },
                        { from: 2, to: 3, text: "3: SELECT * FROM cita_estado_historial WHERE id_cita = ?" },
                        { from: 3, to: 2, text: "4: Historial de transiciones (PROGRAMADA -> ATENDIDA)" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {historial_estados}" },
                        { from: 1, to: 0, text: "6: Mostrar cronología de estados con fechas y responsables" }
                    ]
                },
                {
                    cu: "CU41",
                    title: "CU41 - Pasarela de Pago en Línea y Comprobante",
                    actor: "Paciente Web",
                    controller: "PagoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Seleccionar método de pago (QR / Tarjeta)" },
                        { from: 1, to: 2, text: "2: POST /api/pagos/procesar" },
                        { from: 2, to: 3, text: "3: INSERT INTO pago (monto, metodo, estado='PAGADO')" },
                        { from: 2, to: 3, text: "4: INSERT INTO comprobante_pago (nro_autorizacion, qr)" },
                        { from: 2, to: 4, text: "5: registrar('P6_CITAS', 'PAGO_FICHA', pago)" },
                        { from: 2, to: 1, text: "6: HTTP 201 {comprobante digital emitido}" },
                        { from: 1, to: 0, text: "7: Descargar comprobante oficial de pago" }
                    ]
                },
                {
                    cu: "CU42",
                    title: "CU42 - Historial de Pagos y Gestión de Reembolsos",
                    actor: "Recepcionista / Admin",
                    controller: "PagoController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Solicitar devolución por cita médica cancelada" },
                        { from: 1, to: 2, text: "2: POST /api/pagos/{id}/reembolso" },
                        { from: 2, to: 3, text: "3: UPDATE pago SET estado = 'REEMBOLSADO', fecha_reembolso=now()" },
                        { from: 2, to: 4, text: "4: registrar('P6_CITAS', 'REEMBOLSO', pago)" },
                        { from: 2, to: 1, text: "5: HTTP 200 Reembolso procesado exitosamente" },
                        { from: 1, to: 0, text: "6: Actualizar estado a REEMBOLSADO y comprobante" }
                    ]
                }
            ]
        },
        {
            pkgName: "P7 - Secuencia Reportes Administrativos",
            diagrams: [
                {
                    cu: "CU32",
                    title: "CU32 - Reporte de Citas por Período",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Seleccionar rango de fechas (desde, hasta)" },
                        { from: 1, to: 2, text: "2: GET /api/reportes/citas-periodo?desde=...&hasta=..." },
                        { from: 2, to: 3, text: "3: SELECT estado, count(*) GROUP BY estado" },
                        { from: 3, to: 2, text: "4: Resumen de citas agrupadas por estado" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {kpis, distribucion}" },
                        { from: 1, to: 0, text: "6: Renderizar gráficos y tablas estadísticas" }
                    ]
                },
                {
                    cu: "CU33",
                    title: "CU33 - Reporte de Atenciones por Médico y Especialidad",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Filtrar por profesional médico y especialidad" },
                        { from: 1, to: 2, text: "2: GET /api/reportes/atenciones-medico" },
                        { from: 2, to: 3, text: "3: SELECT medico, esp, count(citas_atendidas)" },
                        { from: 3, to: 2, text: "4: Métricas de volumen de consulta por médico" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {atenciones_por_medico}" },
                        { from: 1, to: 0, text: "6: Mostrar reporte de productividad clínica" }
                    ]
                },
                {
                    cu: "CU34",
                    title: "CU34 - Reporte de Control de Asistencia",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Solicitar métricas de asistencia y ausentismo" },
                        { from: 1, to: 2, text: "2: GET /api/reportes/asistencia" },
                        { from: 2, to: 3, text: "3: SELECT asistencias vs ausencias vs cancelaciones" },
                        { from: 3, to: 2, text: "4: Porcentajes calculados de cumplimiento" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {tasa_asistencia, tasa_abandono}" },
                        { from: 1, to: 0, text: "6: Graficar tasas de efectividad de citas" }
                    ]
                },
                {
                    cu: "CU35",
                    title: "CU35 - Exportar Reportes Administrativos (PDF / CSV)",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Clic en Exportar PDF o CSV" },
                        { from: 1, to: 2, text: "2: POST /api/reportes/exportar {formato: 'pdf'}" },
                        { from: 2, to: 3, text: "3: SELECT datos completos para consolidación" },
                        { from: 2, to: 4, text: "4: registrar('P7_REPORTES', 'EXPORTAR')" },
                        { from: 2, to: 1, text: "5: HTTP 200 Descarga de archivo (MIME stream)" },
                        { from: 1, to: 0, text: "6: Archivo descargado en el navegador del usuario" }
                    ]
                },
                {
                    cu: "CU36",
                    title: "CU36 - Reporte de Padrón General de Pacientes",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Solicitar padrón general de pacientes registrados" },
                        { from: 1, to: 2, text: "2: GET /api/reportes/padron-pacientes" },
                        { from: 2, to: 3, text: "3: SELECT * FROM paciente JOIN persona" },
                        { from: 3, to: 2, text: "4: Listado total con CI, contacto y estado" },
                        { from: 2, to: 1, text: "5: HTTP 200 JSON {padron_pacientes}" },
                        { from: 1, to: 0, text: "6: Mostrar padrón filtrable y totalizadores" }
                    ]
                },
                {
                    cu: "CU43",
                    title: "CU43 - Reporte de Ingresos Financieros y Auditoría",
                    actor: "Administrador",
                    controller: "ReporteController",
                    db: "DB PostgreSQL",
                    extra: "AuditoriaService",
                    messages: [
                        { from: 0, to: 1, text: "1: Generar balance de recaudaciones por consultas" },
                        { from: 1, to: 2, text: "2: GET /api/reportes/ingresos-financieros" },
                        { from: 2, to: 3, text: "3: SELECT sum(monto) FROM pago WHERE estado='PAGADO'" },
                        { from: 3, to: 2, text: "4: Total ingresos por método (QR, Tarjeta, Efectivo)" },
                        { from: 2, to: 4, text: "5: registrar('P7_REPORTES', 'REPORTE_INGRESOS')" },
                        { from: 2, to: 1, text: "6: HTTP 200 JSON {balance_financiero}" },
                        { from: 1, to: 0, text: "7: Presentar KPIs de ingresos y desglose contable" }
                    ]
                }
            ]
        }
    ];

    var totalDiagrams = 0;

    // Procesar cada módulo y generar sus diagramas de secuencia
    for (var m = 0; m < modules.length; m++)
    {
        var modData = modules[m];
        Session.Output("\nCreando Paquete: " + modData.pkgName + "...");

        var modPkg = rootSeqPkg.Packages.AddNew(modData.pkgName, "");
        modPkg.Update();
        rootSeqPkg.Packages.Refresh();

        for (var d = 0; d < modData.diagrams.length; d++)
        {
            var dData = modData.diagrams[d];
            totalDiagrams++;

            Session.Output("  -> Creando Diagrama de Secuencia: " + dData.title);

            // 1. Crear subpaquete para encapsular el caso de uso y sus líneas de vida
            var cuPkg = modPkg.Packages.AddNew(dData.cu + " - " + dData.title, "");
            cuPkg.Update();
            modPkg.Packages.Refresh();

            // 2. Crear el Diagrama de Secuencia
            var seqDiagram = cuPkg.Diagrams.AddNew(dData.title, "Sequence");
            seqDiagram.Notes = "Diagrama de secuencia UML para el Caso de Uso " + dData.title + ".";
            seqDiagram.Update();
            cuPkg.Diagrams.Refresh();

            // 3. Crear las Líneas de Vida (Lifelines)
            var lifelinesDef = [
                { name: dData.actor, type: "Actor" },
                { name: ":UI Frontend Web", type: "Sequence" },
                { name: ":" + dData.controller, type: "Sequence" },
                { name: ":" + dData.db, type: "Sequence" },
                { name: ":" + dData.extra, type: "Sequence" }
            ];

            var lifelinesObj = [];
            var startX = 60;
            var gapX = 180;
            var width = 110;
            var top = -30;
            var bottom = -500;

            for (var l = 0; l < lifelinesDef.length; l++)
            {
                var lDef = lifelinesDef[l];
                var lElement = cuPkg.Elements.AddNew(lDef.name, lDef.type);
                lElement.Update();
                lifelinesObj.push(lElement);

                // Colocar la línea de vida en el diagrama
                var left = startX + (l * gapX);
                var right = left + width;

                var diagObj = seqDiagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
                diagObj.ElementID = lElement.ElementID;
                diagObj.Update();
            }
            cuPkg.Elements.Refresh();

            // 4. Crear los Mensajes de Secuencia entre las Líneas de Vida
            for (var msgIdx = 0; msgIdx < dData.messages.length; msgIdx++)
            {
                var mItem = dData.messages[msgIdx];
                var fromLifeline = lifelinesObj[mItem.from];
                var toLifeline = lifelinesObj[mItem.to];

                if (fromLifeline != null && toLifeline != null)
                {
                    var seqCon = fromLifeline.Connectors.AddNew(mItem.text, "Sequence");
                    seqCon.SupplierID = toLifeline.ElementID;
                    seqCon.SequenceNo = msgIdx + 1;
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
    Session.Prompt("¡Generación completada! Se crearon exitosamente los " + totalDiagrams + " Diagramas de Secuencia UML con sus líneas de vida y mensajes en Enterprise Architect.", 0);
}

// Ejecutar script principal
main();
