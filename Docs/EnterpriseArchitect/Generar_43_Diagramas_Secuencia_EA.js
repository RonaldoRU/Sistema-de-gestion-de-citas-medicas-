!INC Local Scripts.EAConstants - JScript
/*
 * ==========================================================================================
 * SISTEMA CLÍNICA VIDA SALUD - AUTOMATIZACIÓN DE DIAGRAMAS DE SECUENCIA EN ENTERPRISE ARCHITECT
 * ==========================================================================================
 * Descripción: Script en JScript para Enterprise Architect (Sparx Systems EA v14/v15/v16/v17)
 * Genera automáticamente la estructura jerárquica de paquetes y los 43 Diagramas de Secuencia
 * con sus respectivas Líneas de Vida (Actor, Boundary, Control, Entity/Service, PostgreSQL DB)
 * y mensajes ordenados secuencialmente según la arquitectura web del proyecto.
 *
 * ORDEN DE LOS 43 CASOS DE USO (CU01 a CU43):
 *  CU01 Iniciar Sesión en la Plataforma Web
 *  CU02 Auto-Registro de Cuenta de Paciente Web
 *  CU03 Cerrar Sesión y Revocar Sesión
 *  CU04 Recuperar / Restablecer Contraseña Olvidada
 *  CU05 Bloqueo Automático por Intentos Fallidos
 *  CU06 Registrar Nuevo Usuario del Sistema
 *  CU07 Consultar Catálogo y Perfil de Usuarios
 *  CU08 Modificar Datos de Cuenta de Usuario
 *  CU09 Cambiar Rol Operativo y Permisos (RBAC)
 *  CU10 Suspender / Inactivar Cuenta de Usuario (Baja Lógica)
 *  CU11 Registrar Acción Automática en Bitácora
 *  CU12 Consultar y Filtrar Bitácora de Auditoría
 *  CU13 Registrar Paciente Presencial (en Recepción)
 *  CU14 Registrar e Información Médica Básica
 *  CU15 Registrar y Gestionar Contacto de Emergencia
 *  CU16 Buscar y Modificar Datos de Paciente
 *  CU17 Consultar Historial Clínico y de Citas del Paciente
 *  CU18 Desactivar Registro de Paciente (Baja Lógica)
 *  CU19 Gestionar Catálogo de Especialidades Médicas
 *  CU20 Registrar y Administrar Personal Médico
 *  CU21 Configurar Horarios y Bloques de Disponibilidad
 *  CU22 Desactivar Registro de Médico (Baja Lógica)
 *  CU23 Bloquear Agenda Médica por Feriados / Licencias
 *  CU24 Consultar Disponibilidad Horaria (Web / Presencial)
 *  CU25 Solicitar y Reservar Ficha / Cita Médica Web
 *  CU26 Programar y Registrar Cita Médica en Recepción
 *  CU27 Prevenir Citas Duplicadas (Control Concurrencia)
 *  CU28 Reprogramar Cita Médica
 *  CU29 Cancelar Cita Médica con Justificación
 *  CU30 Emitir Recordatorio / Notificación de Cita
 *  CU31 Controlar Asistencia y Máquina de Estados
 *  CU32 Consultar Agenda Médica Diaria
 *  CU33 Registrar Atención Médica Concluida (Marcar Atendida)
 *  CU34 Procesar Pago en Línea de Ficha / Cita
 *  CU35 Confirmar Transacción y Generar Comprobante Digital
 *  CU36 Consultar Historial de Pagos y Transacciones
 *  CU37 Gestionar Reembolso / Anulación de Pago por Cancelación
 *  CU38 Generar Reporte de Citas por Período
 *  CU39 Generar Reporte de Atenciones por Médico y Especialidad
 *  CU40 Generar Reporte de Control de Asistencia e Inasistencias
 *  CU41 Generar Reporte de Ingresos por Pasarela de Pagos y Cajas
 *  CU42 Generar Reporte de Padrón General de Pacientes
 *  CU43 Exportar Reportes Administrativos (PDF / CSV)
 *
 * MODO DE USO:
 * 1. Abre Enterprise Architect con tu proyecto (.qea, .eapx o .feap).
 * 2. En el Project Browser, selecciona el paquete donde deseas crear los diagramas.
 * 3. Ve a Specialize / Tools -> Scripting -> Scripts.
 * 4. Crea un nuevo script JScript (ej. "Generar_43_Diagramas_Secuencia_VidaSalud").
 * 5. Pega todo este código y haz clic en "Run" (F5 o botón Play).
 * ==========================================================================================
 */

// Utilidad de registro en consola (compatible con EA Session y WScript)
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

// Catálogo estructurado de los 43 Casos de Uso
var USE_CASES_DATA = [
    // ----------------------------------------------------------------------------------------
    // PAQUETE 1: SEGURIDAD, AUTENTICACIÓN Y ACCESO WEB (CU01 - CU05)
    // ----------------------------------------------------------------------------------------
    {
        id: "CU01",
        name: "CU01 Iniciar Sesión en la Plataforma Web",
        pkg: "Seguridad y Autenticación",
        actor: "Usuario Web",
        boundary: "UI: LoginForm & AuthView",
        controller: "Ctrl: AuthController",
        service: "Svc: Password & SessionManager",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: ingresarCredenciales(email, password)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/auth/login", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: verifyCredentials(email, password)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: SELECT * FROM usuario WHERE email = :email", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return datosUsuario, passwordHash, id_rol", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: createSession(id_usuario, rol)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { token, redirect: /dashboard }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderDashboard(vistaPrincipal)", isReturn: true }
        ]
    },
    {
        id: "CU02",
        name: "CU02 Auto-Registro de Cuenta de Paciente Web",
        pkg: "Seguridad y Autenticación",
        actor: "Paciente Web",
        boundary: "UI: PatientRegisterForm",
        controller: "Ctrl: PatientRegistrationController",
        service: "Svc: Validation & PasswordHashService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: completarFormularioRegistro(ci, nombres, email, pass)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/auth/register-patient", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: validateUniqueCIAndEmail(PatientDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_registrar_paciente_usuario(ci, nombres, email, hash)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return id_paciente, id_usuario, codigo_paciente", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return RegistroExitosoDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 201 Created { id_paciente, tokenAutoLogin }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: displayWelcomeAndRedirect()", isReturn: true }
        ]
    },
    {
        id: "CU03",
        name: "CU03 Cerrar Sesión y Revocar Sesión",
        pkg: "Seguridad y Autenticación",
        actor: "Usuario Autenticado",
        boundary: "UI: HeaderNav & LogoutModal",
        controller: "Ctrl: AuthController",
        service: "Svc: SessionManager & TokenService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: clickCerrarSesion()", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/auth/logout", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: revokeSession(tokenSesion)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_cerrar_sesion(p_session_id)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return sesionInactivada", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: destroyServerSession()", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { revoked: true }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: clearLocalStorageAndRedirectLogin()", isReturn: true }
        ]
    },
    {
        id: "CU04",
        name: "CU04 Recuperar / Restablecer Contraseña Olvidada",
        pkg: "Seguridad y Autenticación",
        actor: "Usuario Web",
        boundary: "UI: ForgotPasswordForm",
        controller: "Ctrl: PasswordResetController",
        service: "Svc: TokenGenerator & MailService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: solicitarCodigoRecuperacion(email)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/auth/forgot-password", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: generateResetToken(email)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_guardar_token_recuperacion(email, token, expira)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return tokenGuardado", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: sendResetEmail(email, token)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { message: 'Código enviado' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: displayPromptCodigoYNuevaPassword()", isReturn: true }
        ]
    },
    {
        id: "CU05",
        name: "CU05 Bloqueo Automático por Intentos Fallidos",
        pkg: "Seguridad y Autenticación",
        actor: "Usuario Web",
        boundary: "UI: LoginForm & LockoutBanner",
        controller: "Ctrl: AuthController",
        service: "Svc: LockoutService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: ingresarCredencialesErroneas(email, wrongPass)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/auth/login", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: registerFailedAttempt(email)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_incrementar_intentos_fallidos(email)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return intentos = 3 (BLOQUEO_TEMPORAL)", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: applyLockoutPolicy(email, 60s)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 423 Locked { error: 'Bloqueado por 60s' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: startLockoutTimer(60s)", isReturn: true }
        ]
    },

    // ----------------------------------------------------------------------------------------
    // PAQUETE 2: ADMINISTRACIÓN DE USUARIOS Y ROLES (RBAC) (CU06 - CU10)
    // ----------------------------------------------------------------------------------------
    {
        id: "CU06",
        name: "CU06 Registrar Nuevo Usuario del Sistema",
        pkg: "Administración de Usuarios y Roles (RBAC)",
        actor: "Administrador",
        boundary: "UI: UserCreateForm",
        controller: "Ctrl: UserController",
        service: "Svc: UserProvisioningService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: llenarDatosNuevoUsuario(ci, nombres, rol, email)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/admin/usuarios", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: createUser(UserDTO, roleId)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_crear_usuario(ci, nombres, rol, email, hash)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return id_usuario, estado: ACTIVO", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return UsuarioCreadoDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 201 Created { id_usuario, message: 'Creado' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: updateUsersTableAndNotify()", isReturn: true }
        ]
    },
    {
        id: "CU07",
        name: "CU07 Consultar Catálogo y Perfil de Usuarios",
        pkg: "Administración de Usuarios y Roles (RBAC)",
        actor: "Administrador",
        boundary: "UI: UserCatalogGrid",
        controller: "Ctrl: UserController",
        service: "Svc: UserCatalogService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: aplicarFiltros(rol, estado, busqueda)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/admin/usuarios?rol=X&estado=Y", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: listUsers(FilterCriteriaDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_consultar_usuarios(rol, estado, query, limit)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return listaUsuarios, totalRegistros", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: formatToDataTableJson(usuarios)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { data: [...usuarios], total: N }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderUserGrid(usuarios)", isReturn: true }
        ]
    },
    {
        id: "CU08",
        name: "CU08 Modificar Datos de Cuenta de Usuario",
        pkg: "Administración de Usuarios y Roles (RBAC)",
        actor: "Administrador",
        boundary: "UI: UserEditModal",
        controller: "Ctrl: UserController",
        service: "Svc: UserValidationService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: guardarCambiosUsuario(id_usuario, datosEditados)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: PUT /api/v1/admin/usuarios/{id}", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: validateAndUpdateUser(id, UserUpdateDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_actualizar_usuario(id, nombres, email, tel)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return filasAfectadas, usuarioActualizado", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return UsuarioActualizadoDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { success: true, user: {...} }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: displaySuccessAlertAndRefreshRow()", isReturn: true }
        ]
    },
    {
        id: "CU09",
        name: "CU09 Cambiar Rol Operativo y Permisos (RBAC)",
        pkg: "Administración de Usuarios y Roles (RBAC)",
        actor: "Administrador",
        boundary: "UI: RoleChangeModal",
        controller: "Ctrl: RoleManagementController",
        service: "Svc: RBACSecurityService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: seleccionarNuevoRol(id_usuario, nuevoRolId)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: PATCH /api/v1/admin/usuarios/{id}/rol", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: changeUserRole(id_usuario, nuevoRolId)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_cambiar_rol_usuario(id_usuario, nuevoRolId)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return rolAsignado, fechaModif", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: invalidateUserPermissionsCache(id_usuario)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { success: true, rol: nuevoRol }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: showRoleBadgeUpdated()", isReturn: true }
        ]
    },
    {
        id: "CU10",
        name: "CU10 Suspender / Inactivar Cuenta de Usuario (Baja Lógica)",
        pkg: "Administración de Usuarios y Roles (RBAC)",
        actor: "Administrador",
        boundary: "UI: UserStatusToggleModal",
        controller: "Ctrl: UserController",
        service: "Svc: UserLifecycleService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: confirmarBajaUsuario(id_usuario, motivo)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: DELETE /api/v1/admin/usuarios/{id}", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: inactivateUser(id_usuario)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_inactivar_usuario(id_usuario)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return estado: INACTIVO", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: revokeAllUserSessions(id_usuario)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { status: 'INACTIVO', sessionsRevoked: true }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: updateRowBadgeInactivo()", isReturn: true }
        ]
    },

    // ----------------------------------------------------------------------------------------
    // PAQUETE 3: AUDITORÍA, TRAZABILIDAD Y BITÁCORA (CU11 - CU12)
    // ----------------------------------------------------------------------------------------
    {
        id: "CU11",
        name: "CU11 Registrar Acción Automática en Bitácora",
        pkg: "Auditoría, Trazabilidad y Bitácora",
        actor: "Sistema / Middleware",
        boundary: "UI: ApplicationEventBus",
        controller: "Ctrl: AuditMiddleware",
        service: "Svc: AuditLoggerService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: emitOperationEvent(user, action, table, data)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: interceptRequest(HttpRequest)", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: recordAuditEntry(AuditEntryDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: fn_insertar_bitacora(id_user, mod, acc, tab, ip)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return id_bitacora, timestamp_utc", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return auditCommitted", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: continuePipeline()", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: notifyEventLogged()", isReturn: true }
        ]
    },
    {
        id: "CU12",
        name: "CU12 Consultar y Filtrar Bitácora de Auditoría",
        pkg: "Auditoría, Trazabilidad y Bitácora",
        actor: "Administrador",
        boundary: "UI: AuditLogView",
        controller: "Ctrl: AuditController",
        service: "Svc: AuditQueryService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: seleccionarFiltrosAuditoria(modulo, rangoFechas)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/admin/bitacora?modulo=X&inicio=Y", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: queryAuditLogs(AuditFilterDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_consultar_bitacora(modulo, accion, ini, fin)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return registrosBitacora", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: formatAuditRecords(registros)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { audit_logs: [...] }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderAuditTableWithDetails()", isReturn: true }
        ]
    },

    // ----------------------------------------------------------------------------------------
    // PAQUETE 4: GESTIÓN DE PACIENTES Y EXPEDIENTE CLÍNICO (CU13 - CU18)
    // ----------------------------------------------------------------------------------------
    {
        id: "CU13",
        name: "CU13 Registrar Paciente Presencial (en Recepción)",
        pkg: "Gestión de Pacientes",
        actor: "Recepcionista",
        boundary: "UI: ReceptionPatientForm",
        controller: "Ctrl: PatientController",
        service: "Svc: PatientRegistrationService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: ingresarDatosPaciente(ci, nombres, apellidos, tel)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/pacientes/presencial", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: registerPatient(PatientDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_registrar_paciente_presencial(ci, nom, tel, dir)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return id_paciente, codigo_paciente", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return PacienteCreadoDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 201 Created { id_paciente, codigo: 'PAC-0145' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: displayCreatedSuccessAndPrintCarnet()", isReturn: true }
        ]
    },
    {
        id: "CU14",
        name: "CU14 Registrar e Información Médica Básica",
        pkg: "Gestión de Pacientes",
        actor: "Recepcionista / Médico",
        boundary: "UI: MedicalInfoModal",
        controller: "Ctrl: PatientMedicalInfoController",
        service: "Svc: MedicalRecordService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: ingresarFichaMedica(tipoSangre, alergias, patologias)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/pacientes/{id}/info-medica", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: saveMedicalInfo(id_paciente, MedicalInfoDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_actualizar_informacion_medica(id_pac, tipo, alergias)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return infoMedicaActualizada", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return MedicalInfoDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { success: true, infoMedica }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: showMedicalAlertsBadges()", isReturn: true }
        ]
    },
    {
        id: "CU15",
        name: "CU15 Registrar y Gestionar Contacto de Emergencia",
        pkg: "Gestión de Pacientes",
        actor: "Recepcionista / Paciente",
        boundary: "UI: EmergencyContactForm",
        controller: "Ctrl: PatientContactController",
        service: "Svc: EmergencyContactService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: ingresarContactoEmergencia(nombre, parentesco, tel)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/pacientes/{id}/contactos", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: saveContact(id_paciente, ContactDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_guardar_contacto_emergencia(id_pac, nom, par, tel)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return id_contacto, contactoGuardado", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return ContactoDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 201 Created { id_contacto, nombre, tel }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: appendContactToEmergencyList()", isReturn: true }
        ]
    },
    {
        id: "CU16",
        name: "CU16 Buscar y Modificar Datos de Paciente",
        pkg: "Gestión de Pacientes",
        actor: "Recepcionista",
        boundary: "UI: PatientDirectorySearch",
        controller: "Ctrl: PatientController",
        service: "Svc: PatientManagementService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: buscarPacientePorCIoNombre(criterio)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/pacientes?search=criterio", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: searchAndModifyPatient(criterio, updateDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_modificar_datos_paciente(id, nom, tel, dir)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return pacienteActualizado", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return PacienteDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { paciente: {...} }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: displayPatientProfileUpdated()", isReturn: true }
        ]
    },
    {
        id: "CU17",
        name: "CU17 Consultar Historial Clínico y de Citas del Paciente",
        pkg: "Gestión de Pacientes",
        actor: "Médico / Recepcionista",
        boundary: "UI: ClinicalHistoryTimelineView",
        controller: "Ctrl: PatientHistoryController",
        service: "Svc: ClinicalHistoryService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: solicitarHistorialClinico(id_paciente)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/pacientes/{id}/historial", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: compilePatientClinicalHistory(id_paciente)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_consultar_historial_paciente(id_paciente)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return historialCitas, diagnosticos, recetas", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: formatTimelineChronological(historial)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { timeline: [...] }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderInteractiveTimeline()", isReturn: true }
        ]
    },
    {
        id: "CU18",
        name: "CU18 Desactivar Registro de Paciente (Baja Lógica)",
        pkg: "Gestión de Pacientes",
        actor: "Administrador / Recepcionista",
        boundary: "UI: InactivatePatientModal",
        controller: "Ctrl: PatientController",
        service: "Svc: PatientLifecycleService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: solicitarBajaPaciente(id_paciente, motivo)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: DELETE /api/v1/pacientes/{id}", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: verifyNoPendingAppointments(id_paciente)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_inactivar_paciente(id_paciente)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return estado: INACTIVO, fecha_baja", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return PacienteInactivadoDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { success: true, estado: 'INACTIVO' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: updatePatientTableStatus()", isReturn: true }
        ]
    },

    // ----------------------------------------------------------------------------------------
    // PAQUETE 5: GESTIÓN MÉDICA, ESPECIALIDADES Y HORARIOS (CU19 - CU23)
    // ----------------------------------------------------------------------------------------
    {
        id: "CU19",
        name: "CU19 Gestionar Catálogo de Especialidades Médicas",
        pkg: "Gestión Médica y Horarios",
        actor: "Administrador",
        boundary: "UI: SpecialtyCatalogModal",
        controller: "Ctrl: SpecialtyController",
        service: "Svc: SpecialtyCatalogService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: guardarEspecialidad(nombre, descripcion, precio)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/especialidades", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: storeOrUpdateSpecialty(SpecialtyDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_guardar_especialidad(id, nombre, desc, precio)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return especialidadGuardada", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return SpecialtyDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 201 Created { id_especialidad, nombre }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: updateSpecialtyCatalogGrid()", isReturn: true }
        ]
    },
    {
        id: "CU20",
        name: "CU20 Registrar y Administrar Personal Médico",
        pkg: "Gestión Médica y Horarios",
        actor: "Administrador",
        boundary: "UI: DoctorRegistrationForm",
        controller: "Ctrl: DoctorController",
        service: "Svc: DoctorManagementService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: registrarMedico(ci, nombres, matricula, especialidades)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/medicos", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: createDoctorWithSpecialties(DoctorDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_crear_medico(ci, matricula, email, especialidades)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return id_medico, codigo_medico", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return DoctorSummaryDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 201 Created { id_medico, matricula, status: 'ACTIVO' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: appendDoctorToDirectory()", isReturn: true }
        ]
    },
    {
        id: "CU21",
        name: "CU21 Configurar Horarios y Bloques de Disponibilidad",
        pkg: "Gestión Médica y Horarios",
        actor: "Administrador / Médico",
        boundary: "UI: DoctorScheduleGrid",
        controller: "Ctrl: DoctorScheduleController",
        service: "Svc: BlockGeneratorService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: definirHorario(id_medico, dia, horaInicio, horaFin)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/medicos/{id}/horarios", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: generate30MinBlocks(ScheduleDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_configurar_horario_medico(id_med, dia, ini, fin)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return bloquesGenerados = 8", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return ScheduleConfirmationDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { slotsCreated: 8, scheduleStatus: 'OK' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderVisualScheduleWeek()", isReturn: true }
        ]
    },
    {
        id: "CU22",
        name: "CU22 Desactivar Registro de Médico (Baja Lógica)",
        pkg: "Gestión Médica y Horarios",
        actor: "Administrador",
        boundary: "UI: InactivateDoctorModal",
        controller: "Ctrl: DoctorController",
        service: "Svc: DoctorLifecycleService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: confirmarBajaMedico(id_medico)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: DELETE /api/v1/medicos/{id}", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: checkPendingAppointments(id_medico)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_inactivar_medico(id_medico)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return medicoInactivado, turnosDeshabilitados", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return MedicoBajaDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { success: true, estado: 'INACTIVO' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: displayDoctorInactivatedAlert()", isReturn: true }
        ]
    },
    {
        id: "CU23",
        name: "CU23 Bloquear Agenda Médica por Feriados / Licencias",
        pkg: "Gestión Médica y Horarios",
        actor: "Administrador / Médico",
        boundary: "UI: AgendaBlockModal",
        controller: "Ctrl: AgendaBlockController",
        service: "Svc: SlotLockService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: registrarBloqueo(id_medico, tipo, fechaIni, fechaFin)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/agenda/bloqueos", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: lockSlotsInRange(AgendaBlockDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_registrar_bloqueo_agenda(id_med, tipo, ini, fin)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return bloqueoId, bloquesInhabilitados", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return AgendaBlockResultDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 201 Created { id_bloqueo, affectedSlots: 16 }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: paintBlockedSlotsCalendar()", isReturn: true }
        ]
    },

    // ----------------------------------------------------------------------------------------
    // PAQUETE 6: GESTIÓN DE CITAS Y RESERVAS WEB (FICHA MÉDICA) (CU24 - CU33)
    // ----------------------------------------------------------------------------------------
    {
        id: "CU24",
        name: "CU24 Consultar Disponibilidad Horaria (Web / Presencial)",
        pkg: "Gestión de Citas Médicas",
        actor: "Paciente / Recepcionista",
        boundary: "UI: AvailabilityView",
        controller: "Ctrl: AvailabilityController",
        service: "Svc: SlotCalculatorService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: consultarDisponibilidad(especialidad, medico, fecha)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/citas/disponibilidad?esp=1&med=7&fecha=...", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: calculateFreeSlots(espId, medId, fecha)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_consultar_bloques_disponibles(espId, medId, fecha)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return bloquesLibres, bloquesOcupados", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: filterOutPastAndOccupiedSlots(bloques)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { slots: [08:00, 08:30, 09:00...] }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderAvailableSlotsButtons()", isReturn: true }
        ]
    },
    {
        id: "CU25",
        name: "CU25 Solicitar y Reservar Ficha / Cita Médica Web",
        pkg: "Gestión de Citas Médicas",
        actor: "Paciente Web",
        boundary: "UI: WebAppointmentWizard",
        controller: "Ctrl: WebAppointmentController",
        service: "Svc: ReservationPreHoldService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: seleccionarSlotYMotivo(slotId, fecha, hora, motivo)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/citas/reservar-web", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: holdSlotForCheckout(patientId, slotData)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_pre_reservar_cita(pacId, medId, fecha, hora, motivo)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return id_cita, tokenReserva, expiraEn10Min", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return PreReservationDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { id_cita, tokenReserva, checkoutUrl }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: redirectToPaymentGateway()", isReturn: true }
        ]
    },
    {
        id: "CU26",
        name: "CU26 Programar y Registrar Cita Médica en Recepción",
        pkg: "Gestión de Citas Médicas",
        actor: "Recepcionista",
        boundary: "UI: ReceptionBookingForm",
        controller: "Ctrl: ReceptionAppointmentController",
        service: "Svc: DirectBookingService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: registrarCitaPresencial(pacienteId, medicoId, fecha, hora)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/citas/recepcion", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: createConfirmedAppointment(BookingDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_registrar_cita_presencial(pacId, medId, fecha, hora)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return id_cita, codigo_cita: 'CM-0295'", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return AppointmentReceiptDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 201 Created { id_cita, codigo: 'CM-0295' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: printAppointmentTicket()", isReturn: true }
        ]
    },
    {
        id: "CU27",
        name: "CU27 Prevenir Citas Duplicadas (Control Concurrencia)",
        pkg: "Gestión de Citas Médicas",
        actor: "Paciente Simultáneo",
        boundary: "UI: BookingSlotGrid",
        controller: "Ctrl: WebAppointmentController",
        service: "Svc: ConcurrencyLockManager",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: intentarReservarMismoSlot(slotId, fecha, hora)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/citas/reservar-web", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: acquireSlotLock(medicoId, fecha, hora)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: fn_validar_bloque_unico_medico() (Index Lock)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: 409 Conflict: DuplicatedKeyException", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: handleSlotConflictException()", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 409 Conflict { error: 'Horario ya reservado' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: displaySlotOccupiedAndRefreshGrid()", isReturn: true }
        ]
    },
    {
        id: "CU28",
        name: "CU28 Reprogramar Cita Médica",
        pkg: "Gestión de Citas Médicas",
        actor: "Recepcionista / Paciente",
        boundary: "UI: RescheduleModal",
        controller: "Ctrl: AppointmentManagementController",
        service: "Svc: AppointmentRescheduleService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: seleccionarNuevaFechaYHora(id_cita, nuevaFecha, hora)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: PUT /api/v1/citas/{id}/reprogramar", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: rescheduleAppointment(id_cita, newSlotData)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_reprogramar_cita(id_cita, nuevaFecha, nuevaHora)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return citaReprogramada, historialRegistrado", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return RescheduleSuccessDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { success: true, nuevaFecha, nuevaHora }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: showRescheduledAlertAndRefresh()", isReturn: true }
        ]
    },
    {
        id: "CU29",
        name: "CU29 Cancelar Cita Médica con Justificación",
        pkg: "Gestión de Citas Médicas",
        actor: "Paciente / Recepcionista",
        boundary: "UI: CancelAppointmentModal",
        controller: "Ctrl: AppointmentManagementController",
        service: "Svc: AppointmentCancellationService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: ingresarMotivoCancelacion(id_cita, motivo)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/citas/{id}/cancelar", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: cancelAppointmentWithReason(id_cita, motivo)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_cancelar_cita(id_cita, motivo, userId)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return estado: 'CANCELADA', slotLiberado", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return CancellationConfirmedDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { success: true, estado: 'CANCELADA' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderCancelledBadgeAndReleaseSlot()", isReturn: true }
        ]
    },
    {
        id: "CU30",
        name: "CU30 Emitir Recordatorio / Notificación de Cita",
        pkg: "Gestión de Citas Médicas",
        actor: "Sistema Cron Job",
        boundary: "UI: NotificationDispatcher",
        controller: "Ctrl: NotificationCronService",
        service: "Svc: EmailSmsNotificationService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: triggerDailyReminders()", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: executeScheduledNotificationJob()", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: findUpcomingAppointmentsIn24h()", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_generar_recordatorios_diarios()", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return citasRecordatorioPendientes", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: sendEmailAndSmsAlerts(citas)", isReturn: true },
            { seq: 7, from: 2, to: 4, text: "7: sp_actualizar_estado_notificacion(id, 'ENVIADO')", isReturn: false },
            { seq: 8, from: 2, to: 0, text: "8: logNotificationExecutionCompleted()", isReturn: true }
        ]
    },
    {
        id: "CU31",
        name: "CU31 Controlar Asistencia y Máquina de Estados",
        pkg: "Gestión de Citas Médicas",
        actor: "Recepcionista / Médico",
        boundary: "UI: AttendanceStatusControls",
        controller: "Ctrl: AppointmentStateController",
        service: "Svc: AppointmentStateMachineService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: cambiarEstadoAsistencia(id_cita, CONFIRMADA/ATENDIDA)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: PATCH /api/v1/citas/{id}/estado", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: transitionState(id_cita, targetState)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_cambiar_estado_cita(id_cita, targetState, userId)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return estadoActualizado, timestampCambio", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return StateTransitionDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { id_cita, estado: 'CONFIRMADA' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: updateStatusBadgeOnLiveBoard()", isReturn: true }
        ]
    },
    {
        id: "CU32",
        name: "CU32 Consultar Agenda Médica Diaria",
        pkg: "Gestión de Citas Médicas",
        actor: "Médico",
        boundary: "UI: DailyDoctorAgendaView",
        controller: "Ctrl: DoctorAgendaController",
        service: "Svc: DoctorAgendaQueryService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: consultarPlanillaDiaria(id_medico, fecha)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/medicos/{id}/agenda?fecha=2026-11-08", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: getDoctorAppointmentsForDay(id_medico, fecha)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_consultar_agenda_diaria_medico(id_medico, fecha)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return listaPacientesCitasTurnos", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: formatDailyRoster(lista)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { agenda: [...] }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderDoctorDailyRoster()", isReturn: true }
        ]
    },
    {
        id: "CU33",
        name: "CU33 Registrar Atención Médica Concluida (Marcar Atendida)",
        pkg: "Gestión de Citas Médicas",
        actor: "Médico",
        boundary: "UI: ConsultationFichaModal",
        controller: "Ctrl: DoctorConsultationController",
        service: "Svc: MedicalEncounterService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: ingresarDiagnosticoYConcluir(id_cita, notasClinicas)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/citas/{id}/concluir-atencion", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: completeConsultation(id_cita, ClinicalNotesDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_concluir_atencion_medica(id_cita, notasClinicas)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return estado: 'ATENDIDA', consultaGuardada", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return ConsultationSuccessDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { success: true, estado: 'ATENDIDA' }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: showConsultationCompletedSuccess()", isReturn: true }
        ]
    },

    // ----------------------------------------------------------------------------------------
    // PAQUETE 7: PASARELA DE PAGOS Y TRANSACCIONES EN LÍNEA (CU34 - CU37)
    // ----------------------------------------------------------------------------------------
    {
        id: "CU34",
        name: "CU34 Procesar Pago en Línea de Ficha / Cita",
        pkg: "Pasarela de Pagos y Transacciones",
        actor: "Paciente Web",
        boundary: "UI: PaymentCheckoutModal",
        controller: "Ctrl: PaymentController",
        service: "Svc: PaymentGatewayStrategy (QR / Tarjeta)",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: seleccionarMetodoPago(id_cita, metodo: QR/CARD)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/pagos/checkout", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: processPaymentCharge(PaymentDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_iniciar_transaccion_pago(id_cita, monto, metodo)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return id_pago, qrCodeBase64, externalTxId", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return CheckoutPayloadDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { qrCode, transaccionId, expiraEn }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderQRCodeForScanning()", isReturn: true }
        ]
    },
    {
        id: "CU35",
        name: "CU35 Confirmar Transacción y Generar Comprobante Digital",
        pkg: "Pasarela de Pagos y Transacciones",
        actor: "Pasarela de Pago / Webhook",
        boundary: "UI: PaymentReceiptView",
        controller: "Ctrl: PaymentWebhookController",
        service: "Svc: InvoicePDFGeneratorService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: callbackPagoCompletado(externalTxId, SUCCESS)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/pagos/webhook", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: verifyAndConfirmPayment(webhookPayload)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_confirmar_pago_cita(id_cita, txId, monto)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return pagoConfirmado, citaPAGADA", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: generateDigitalInvoicePDF(id_pago)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { invoiceUrl, pdfGenerated: true }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: displayPaymentSuccessAndDownloadPDF()", isReturn: true }
        ]
    },
    {
        id: "CU36",
        name: "CU36 Consultar Historial de Pagos y Transacciones",
        pkg: "Pasarela de Pagos y Transacciones",
        actor: "Paciente / Administrador",
        boundary: "UI: PaymentHistoryView",
        controller: "Ctrl: PaymentHistoryController",
        service: "Svc: PaymentQueryService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: consultarMisPagos(id_paciente, rangoFechas)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/pacientes/{id}/pagos", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: retrievePaymentHistory(id_paciente)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_consultar_pagos_paciente(id_paciente)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return transacciones, montos, comprobantes", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: formatPaymentRecords(transacciones)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { transacciones: [...] }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderPaymentHistoryTableWithPDFButtons()", isReturn: true }
        ]
    },
    {
        id: "CU37",
        name: "CU37 Gestionar Reembolso / Anulación de Pago por Cancelación",
        pkg: "Pasarela de Pagos y Transacciones",
        actor: "Administrador / Paciente",
        boundary: "UI: RefundRequestModal",
        controller: "Ctrl: RefundController",
        service: "Svc: PaymentGatewayRefundService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: solicitarReembolso(id_cita, motivo)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/pagos/{id}/reembolso", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: executeGatewayRefund(id_cita, motivo)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_registrar_reembolso_pago(id_cita, monto, motivo)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return id_reembolso, estado: 'REEMBOLSADO'", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: return RefundConfirmedDTO", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { success: true, id_reembolso }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: displayRefundConfirmationNotice()", isReturn: true }
        ]
    },

    // ----------------------------------------------------------------------------------------
    // PAQUETE 8: REPORTES ADMINISTRATIVOS Y FINANCIEROS (CU38 - CU43)
    // ----------------------------------------------------------------------------------------
    {
        id: "CU38",
        name: "CU38 Generar Reporte de Citas por Período",
        pkg: "Reportes Administrativos y Financieros",
        actor: "Administrador",
        boundary: "UI: AppointmentsReportFilter",
        controller: "Ctrl: ReportController",
        service: "Svc: AppointmentsAnalyticsService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: solicitarReporteCitas(fechaIni, fechaFin, estado)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/reportes/citas-periodo", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: aggregateAppointmentsByPeriod(FilterDTO)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_reporte_citas_por_periodo(ini, fin, estado)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return resumenCitasAgrupadas", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: calculateMetricsAndPercentages(resumen)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { metricas, data: [...] }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderAppointmentsReportChartAndTable()", isReturn: true }
        ]
    },
    {
        id: "CU39",
        name: "CU39 Generar Reporte de Atenciones por Médico y Especialidad",
        pkg: "Reportes Administrativos y Financieros",
        actor: "Administrador",
        boundary: "UI: DoctorProductivityReportView",
        controller: "Ctrl: ReportController",
        service: "Svc: DoctorProductivityService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: solicitarProductividadMedica(mes, anio)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/reportes/atenciones-medico", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: calculateDoctorAttentions(mes, anio)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_reporte_atenciones_medico_especialidad(ini, fin)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return atencionesPorEspecialidadYMedico", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: computeProductivityRankings(atenciones)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { rankings: [...] }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderProductivityBarChart()", isReturn: true }
        ]
    },
    {
        id: "CU40",
        name: "CU40 Generar Reporte de Control de Asistencia e Inasistencias",
        pkg: "Reportes Administrativos y Financieros",
        actor: "Administrador",
        boundary: "UI: AttendanceReportFilter",
        controller: "Ctrl: ReportController",
        service: "Svc: AttendanceAnalyticsService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: solicitarTasaAsistencia(rangoFechas)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/reportes/control-asistencia", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: calculateAttendanceRates(rango)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_reporte_control_asistencia(ini, fin)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return atendidas, inasistencias, canceladas", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: computeAbsenteeismRatio(datos)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { tasaEfectividad, ratioAusentismo }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderAttendanceDonutChart()", isReturn: true }
        ]
    },
    {
        id: "CU41",
        name: "CU41 Generar Reporte de Ingresos por Pasarela de Pagos y Cajas",
        pkg: "Reportes Administrativos y Financieros",
        actor: "Administrador",
        boundary: "UI: FinancialRevenueReportView",
        controller: "Ctrl: ReportController",
        service: "Svc: FinancialAuditService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: solicitarReporteIngresos(fechaIni, fechaFin)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/reportes/ingresos-financieros", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: consolidateRevenueStreams(fechaIni, fechaFin)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_reporte_ingresos_financieros(ini, fin)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return recaudacionWeb, recaudacionCaja, totalBs", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: formatFinancialSummary(totales)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { totalBs, desgloseCanales: [...] }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderFinancialRevenueDashboard()", isReturn: true }
        ]
    },
    {
        id: "CU42",
        name: "CU42 Generar Reporte de Padrón General de Pacientes",
        pkg: "Reportes Administrativos y Financieros",
        actor: "Administrador",
        boundary: "UI: PatientDirectoryReportView",
        controller: "Ctrl: ReportController",
        service: "Svc: DemographicAnalyticsService",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: solicitarPadronPacientes(estado, sexo)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: GET /api/v1/reportes/padron-pacientes", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: generatePatientCensus(estado, sexo)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_reporte_padron_pacientes(estado, sexo, ini, fin)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return pacientesRegistrados, totalesGrupoEtario", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: compileCensusTable(pacientes)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK { padronPacientes: [...] }", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: renderPatientCensusGrid()", isReturn: true }
        ]
    },
    {
        id: "CU43",
        name: "CU43 Exportar Reportes Administrativos (PDF / CSV)",
        pkg: "Reportes Administrativos y Financieros",
        actor: "Administrador",
        boundary: "UI: ExportActionsToolbar",
        controller: "Ctrl: ReportExportController",
        service: "Svc: DocumentExportEngine (PDF / CSV)",
        db: "DB: PostgreSQL Clinica_Vida_Salud",
        messages: [
            { seq: 1, from: 0, to: 1, text: "1: solicitarExportacion(tipoReporte, formato: PDF/CSV)", isReturn: false },
            { seq: 2, from: 1, to: 2, text: "2: POST /api/v1/reportes/exportar", isReturn: false },
            { seq: 3, from: 2, to: 3, text: "3: generateExportDocument(tipo, formato, filtros)", isReturn: false },
            { seq: 4, from: 3, to: 4, text: "4: sp_obtener_datos_exportacion_reporte(tipo, params)", isReturn: false },
            { seq: 5, from: 4, to: 3, text: "5: return datasetCompleto", isReturn: true },
            { seq: 6, from: 3, to: 2, text: "6: renderDocumentFileStream(dataset, formato)", isReturn: true },
            { seq: 7, from: 2, to: 1, text: "7: 200 OK (Content-Type: application/pdf o text/csv)", isReturn: true },
            { seq: 8, from: 1, to: 0, text: "8: triggerBrowserFileDownload(reporte_20261108.pdf)", isReturn: true }
        ]
    }
];

// Función principal de ejecución
function main() {
    Log("========================================================================");
    Log(" INICIANDO GENERACIÓN DE 43 DIAGRAMAS DE SECUENCIA (CU01 - CU43)");
    Log(" CLÍNICA VIDA SALUD - ENTERPRISE ARCHITECT AUTOMATION");
    Log("========================================================================");

    var eaRepo = null;
    if (typeof Repository !== "undefined") {
        eaRepo = Repository;
    } else {
        try {
            var eaApp = new ActiveXObject("EA.App");
            eaRepo = eaApp.Repository;
        } catch (e) {
            Log("[ERROR] No se pudo obtener la instancia del Repositorio de Enterprise Architect: " + e.message);
            return;
        }
    }

    if (!eaRepo) {
        Log("[ERROR] El objeto Repository no está disponible.");
        return;
    }

    // Obtener paquete base seleccionado
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

    // Crear paquete raíz de los diagramas de secuencia
    var rootPkgName = "Diagramas de Secuencia (CU01 - CU43) - Clínica Vida Salud";
    var rootPackage = null;

    for (var i = 0; i < targetPackage.Packages.Count; i++) {
        var existingPkg = targetPackage.Packages.GetAt(i);
        if (existingPkg.Name == rootPkgName) {
            rootPackage = existingPkg;
            break;
        }
    }

    if (!rootPackage) {
        rootPackage = targetPackage.Packages.AddNew(rootPkgName, "");
        rootPackage.Update();
        targetPackage.Packages.Refresh();
        Log("[CREADO] Paquete raíz: " + rootPkgName);
    } else {
        Log("[ENCONTRADO] Paquete raíz existente: " + rootPkgName);
    }

    // Mapa para almacenar sub-paquetes por módulo
    var subPackageMap = {};

    function getOrCreateSubPackage(pkgName) {
        if (subPackageMap[pkgName]) {
            return subPackageMap[pkgName];
        }
        for (var p = 0; p < rootPackage.Packages.Count; p++) {
            var subP = rootPackage.Packages.GetAt(p);
            if (subP.Name == pkgName) {
                subPackageMap[pkgName] = subP;
                return subP;
            }
        }
        var newSubP = rootPackage.Packages.AddNew(pkgName, "");
        newSubP.Update();
        rootPackage.Packages.Refresh();
        subPackageMap[pkgName] = newSubP;
        return newSubP;
    }

    var totalGenerados = 0;

    // Iterar y generar cada uno de los 43 diagramas de secuencia
    for (var u = 0; u < USE_CASES_DATA.length; u++) {
        var uc = USE_CASES_DATA[u];
        var modulePackage = getOrCreateSubPackage(uc.pkg);

        Log("-> Procesando [" + uc.id + "] " + uc.name + " (" + uc.pkg + ")...");

        // 1. Crear el diagrama de secuencia
        var diagram = modulePackage.Diagrams.AddNew(uc.name, "Sequence");
        diagram.Notes = "Diagrama de Secuencia del Caso de Uso " + uc.id + ": " + uc.name + ".\n" +
                        "Sistema de Gestión de Citas Médicas Clínica Vida Salud.";
        diagram.Update();

        // 2. Crear las 5 Líneas de Vida (Lifelines)
        // Lifeline 0: Actor
        var actorEl = modulePackage.Elements.AddNew(uc.actor, "Actor");
        actorEl.Notes = "Actor que interactúa en " + uc.id;
        actorEl.Update();

        // Lifeline 1: Boundary (Interfaz Web)
        var bndEl = modulePackage.Elements.AddNew(uc.boundary, "Sequence");
        bndEl.Stereotype = "boundary";
        bndEl.Notes = "Capa de Presentación Web (HTML5/JS)";
        bndEl.Update();

        // Lifeline 2: Control (Controlador REST API Laravel)
        var ctrlEl = modulePackage.Elements.AddNew(uc.controller, "Sequence");
        ctrlEl.Stereotype = "control";
        ctrlEl.Notes = "Controlador HTTP / API REST Backend";
        ctrlEl.Update();

        // Lifeline 3: Entity / Service (Servicio de Dominio / Negocio)
        var svcEl = modulePackage.Elements.AddNew(uc.service, "Sequence");
        svcEl.Stereotype = "entity";
        svcEl.Notes = "Lógica de Negocio y Servicios de Dominio";
        svcEl.Update();

        // Lifeline 4: Database (PostgreSQL)
        var dbEl = modulePackage.Elements.AddNew(uc.db, "Sequence");
        dbEl.Stereotype = "database";
        dbEl.Notes = "Motor de Base de Datos PostgreSQL (Clinica_Vida_Salud)";
        dbEl.Update();

        var lifelines = [actorEl, bndEl, ctrlEl, svcEl, dbEl];

        // 3. Posicionamiento horizontal de las líneas de vida en el diagrama
        // Coordenadas fijas para un espaciado uniforme y legible
        var colWidth = 110;
        var colGap = 45;
        var startX = 60;
        var topY = -30;
        var bottomY = -480;

        for (var l = 0; l < lifelines.length; l++) {
            var left = startX + l * (colWidth + colGap);
            var right = left + colWidth;
            var posStr = "l=" + left + ";r=" + right + ";t=" + topY + ";b=" + bottomY + ";";
            
            var diagObj = diagram.DiagramObjects.AddNew(posStr, "");
            diagObj.ElementID = lifelines[l].ElementID;
            diagObj.Update();
        }

        // 4. Agregar los mensajes de secuencia (Conectores)
        for (var m = 0; m < uc.messages.length; m++) {
            var msg = uc.messages[m];
            var sourceEl = lifelines[msg.from];
            var targetEl = lifelines[msg.to];

            var con = sourceEl.Connectors.AddNew(msg.text, "Sequence");
            con.SupplierID = targetEl.ElementID; // Destino
            con.ClientID = sourceEl.ElementID;   // Origen
            con.SequenceNo = msg.seq;

            if (msg.isReturn) {
                con.Stereotype = "return";
                con.Subtype = "Return";
                con.Direction = "Source -> Destination";
            } else {
                con.Subtype = "Synchronous";
                con.Direction = "Source -> Destination";
            }

            con.Update();
            sourceEl.Connectors.Refresh();
        }

        // Guardar y refrescar diagrama
        diagram.Update();
        try {
            eaRepo.ReloadDiagram(diagram.DiagramID);
        } catch (eReload) {}
        modulePackage.Diagrams.Refresh();
        modulePackage.Elements.Refresh();
        totalGenerados++;
    }

    rootPackage.Packages.Refresh();
    targetPackage.Packages.Refresh();
    eaRepo.RefreshModelView(targetPackage.PackageID);
    try {
        eaRepo.ShowInProjectView(rootPackage);
    } catch (eShow) {}

    Log("========================================================================");
    Log(" ¡PROCESO COMPLETADO CON ÉXITO!");
    Log(" Total de diagramas generados: " + totalGenerados + " de 43 casos de uso.");
    Log(" Los diagramas se encuentran en el paquete: '" + rootPkgName + "'.");
    Log("========================================================================");
}

// Ejecutar main
main();
