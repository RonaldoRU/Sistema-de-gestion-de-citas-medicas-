# ESTÁNDAR DE MAPEO FUNCIONAL POR CAPAS (METODOLOGÍA PUDS - CU01 A CU43)

## 1. ESTRUCTURA Y METODOLOGÍA DEL MAPEO FUNCIONAL (4 CAPAS)

Cada Caso de Uso del sistema de la **Clínica Vida Salud** se descompone en 4 dimensiones de arquitectura:

* **Capa 1: Interfaz / Frontend (UI/JS):** Funciones de renderizado HTML5/CSS3, manipulación de vistas, captura de eventos de usuario y peticiones asíncronas AJAX/Fetch.
* **Capa 2: Lógica de Negocio / Backend (PHP PDO):** Métodos en controladores, servicios de aplicación, DTOs, algoritmos de orquestación y cifrado de datos.
* **Capa 3: Persistencia / Base de Datos (PostgreSQL):** Consultas SQL, funciones almacenadas (PL/pgSQL), transacciones ACID e índices parciales de concurrencia.
* **Capa 4: Reglas de Negocio y Excepciones:** Validaciones de límites, integridad referencial, borrado lógico (*Soft Delete*) y capturas de error.

---

## 2. DESGLOSE COMPLETO DE CASOS DE USO (CU01 A CU43)

### PAQUETE 1: SEGURIDAD, AUTENTICACIÓN Y ACCESO WEB

#### **CU01: Iniciar Sesión en la Plataforma Web**
* **1. Interfaz / Frontend (UI/JS):** `renderLoginForm()`, `onLoginSubmit(event)`, `validateInputFields()`, `showAuthError(message)`.
* **2. Lógica / Backend (PHP PDO):** `AuthController::login()`, `PasswordService::verify(password, hash)`, `SessionManager::createSession(userId, roleId)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_obtener_usuario_por_email(p_email)`, `sp_actualizar_ultimo_acceso(p_id_usuario)`.
* **4. Reglas y Excepciones:** Verificar estado 'ACTIVO'; incrementar contador de fallos; invocar bloqueo al 3er intento erróneo.

#### **CU02: Auto-Registro de Cuenta de Paciente Web**
* **1. Interfaz / Frontend (UI/JS):** `renderPatientRegistrationForm()`, `onCIBlurCheck()`, `onEmailBlurCheck()`, `submitRegistrationData()`.
* **2. Lógica / Backend (PHP PDO):** `PatientRegistrationController::register(PatientDTO)`, `ValidationService::validateUniqueCIAndEmail()`, `PasswordService::hash(password)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_registrar_paciente_usuario(ci, nombres, apellidos, email, hash, fecha_nac, sexo, tel)`.
* **4. Reglas y Excepciones:** Asignación automática del rol 'Paciente'; comprobación estricta de unicidad en CI y Correo.

#### **CU03: Cerrar Sesión y Revocar Sesión**
* **1. Interfaz / Frontend (UI/JS):** `renderLogoutButton()`, `onLogoutClick()`, `confirmLogoutModal()`.
* **2. Lógica / Backend (PHP PDO):** `AuthController::logout()`, `SessionManager::destroySession()`, `TokenManager::revokeTokens()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_cerrar_sesion(p_session_id)`.
* **4. Reglas y Excepciones:** Destrucción de variables `$_SESSION` en servidor; invalidación de tokens activos.

#### **CU04: Recuperar / Restablecer Contraseña Olvidada**
* **1. Interfaz / Frontend (UI/JS):** `renderForgotPasswordForm()`, `onSendCodeClick()`, `renderResetPasswordForm()`, `onResetPasswordSubmit()`.
* **2. Lógica / Backend (PHP PDO):** `PasswordResetController::sendResetCode()`, `TokenGenerator::generate6DigitCode()`, `PasswordResetController::resetPassword()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_guardar_token_recuperacion()`, `sp_actualizar_password()`.
* **4. Reglas y Excepciones:** Código temporal válido por 15 minutos; expiración inmediata tras el primer uso.

#### **CU05: Bloqueo Automático por Intentos Fallidos**
* **1. Interfaz / Frontend (UI/JS):** `displayLockoutMessage(remainingSeconds)`, `startLockoutTimer()`.
* **2. Lógica / Backend (PHP PDO):** `LockoutService::registerFailedAttempt(userId)`, `LockoutService::isLocked(userId)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_incrementar_intentos_fallidos()`, `sp_bloquear_usuario_temporal()`.
* **4. Reglas y Excepciones:** Bloqueo al 3er fallo consecutivo; inhabilitación temporal por 1 minuto.

---

### PAQUETE 2: ADMINISTRACIÓN DE USUARIOS Y ROLES (RBAC)

#### **CU06: Registrar Nuevo Usuario del Sistema**
* **1. Interfaz / Frontend (UI/JS):** `renderUserCreateForm()`, `loadRolesDropdown()`, `onUserSubmit()`.
* **2. Lógica / Backend (PHP PDO):** `UserController::create(UserDTO)`, `RoleService::assignRole(userId, roleId)`, `PasswordService::hash(password)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_crear_usuario(ci, nombres, apellidos, email, id_rol, hash_password)`.
* **4. Reglas y Excepciones:** Exclusivo para rol Administrador; verificación previa de unicidad de CI y correo.

#### **CU07: Consultar Catálogo y Perfil de Usuarios**
* **1. Interfaz / Frontend (UI/JS):** `renderUserGrid()`, `applyRoleFilter(roleId)`, `applyStatusFilter(status)`, `searchUserByName(query)`.
* **2. Lógica / Backend (PHP PDO):** `UserController::listUsers(filterDTO)`, `UserTransformer::toDataTableJson()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_consultar_usuarios(p_rol, p_estado, p_busqueda, p_limit, p_offset)`.
* **4. Reglas y Excepciones:** Paginación en servidor; filtrado dinámico por roles operativos.

#### **CU08: Modificar Datos de Cuenta de Usuario**
* **1. Interfaz / Frontend (UI/JS):** `renderUserEditForm(userId)`, `populateUserData(data)`, `onUserUpdateSubmit()`.
* **2. Lógica / Backend (PHP PDO):** `UserController::update(userId, UserUpdateDTO)`, `ValidationService::validateEmailUniquenessOnUpdate()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_actualizar_usuario(p_id_usuario, p_nombres, p_apellidos, p_email, p_telefono)`.
* **4. Reglas y Excepciones:** Validación de correo único si se modifica la dirección de e-mail.

#### **CU09: Cambiar Rol Operativo y Permisos (RBAC)**
* **1. Interfaz / Frontend (UI/JS):** `renderRoleChangeModal(userId)`, `selectRole(roleId)`, `confirmRoleChange()`.
* **2. Lógica / Backend (PHP PDO):** `RoleManagementController::updateUserRole()`, `PermissionService::clearUserPermissionCache()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_cambiar_rol_usuario(p_id_usuario, p_nuevo_id_rol)`.
* **4. Reglas y Excepciones:** Regla de autoprotección: el Administrador activo no puede despojarse de su propio rol de Administrador.

#### **CU10: Suspender / Inactivar Cuenta de Usuario (Baja Lógica)**
* **1. Interfaz / Frontend (UI/JS):** `renderInactivateUserModal()`, `confirmInactivation()`.
* **2. Lógica / Backend (PHP PDO):** `UserController::inactivate(userId)`, `SessionManager::terminateAllUserSessions(userId)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_inactivar_usuario(p_id_usuario)`.
* **4. Reglas y Excepciones:** Aplicación de borrado lógico (`estado = 'INACTIVO'`); revocación inmediata de sesiones activas.

---

### PAQUETE 3: AUDITORÍA, TRAZABILIDAD Y BITÁCORA

#### **CU11: Registrar Acción Automática en Bitácora**
* **1. Interfaz / Frontend (UI/JS):** Ejecución transparente desatendida en background.
* **2. Lógica / Backend (PHP PDO):** `AuditMiddleware::handle(request, next)`, `AuditLogger::logAction(userId, module, action, detail)`.
* **3. Persistencia / BD (PostgreSQL):** `fn_insertar_bitacora(p_id_usuario, p_modulo, p_accion, p_tabla, p_id_reg, p_detalle, p_ip)`.
* **4. Reglas y Excepciones:** Inmutabilidad del registro; captura automática de marca de tiempo, IP y datos transaccionados.

#### **CU12: Consultar y Filtrar Bitácora de Auditoría**
* **1. Interfaz / Frontend (UI/JS):** `renderAuditGrid()`, `applyModuleFilter(module)`, `applyDateRangeFilter(startDate, endDate)`.
* **2. Lógica / Backend (PHP PDO):** `AuditController::index(AuditFilterDTO)`, `AuditExporter::formatForDisplay()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_consultar_bitacora(p_id_usuario, p_modulo, p_accion, p_fecha_inicio, p_fecha_fin)`.
* **4. Reglas y Excepciones:** Acceso exclusivo para el Administrador; ordenamiento cronológico descendente.

---

### PAQUETE 4: GESTIÓN DE PACIENTES Y EXPEDIENTE CLÍNICO

#### **CU13: Registrar Paciente Presencial (en Recepción)**
* **1. Interfaz / Frontend (UI/JS):** `renderReceptionPatientForm()`, `onCIPatientCheck()`, `submitReceptionPatient()`.
* **2. Lógica / Backend (PHP PDO):** `PatientController::registerPresencial(PatientDTO)`, `ValidationService::validateCI()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_registrar_paciente_presencial(ci, nombres, apellidos, fecha_nac, sexo, telefono, direccion)`.
* **4. Reglas y Excepciones:** Validación de CI único; generación de código correlativo de paciente (`PAC-XXXX`).

#### **CU14: Registrar e Información Médica Básica del Paciente**
* **1. Interfaz / Frontend (UI/JS):** `renderMedicalInfoTab(patientId)`, `loadMedicalInfoData()`, `saveMedicalInfoSubmit()`.
* **2. Lógica / Backend (PHP PDO):** `PatientMedicalInfoController::update(patientId, MedicalInfoDTO)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_actualizar_informacion_medica(p_id_paciente, p_tipo_sangre, p_alergias, p_patologias, p_medicacion)`.
* **4. Reglas y Excepciones:** Relación de composición 1 a 1 con Paciente; editable por Recepción y Cuerpo Médico.

#### **CU15: Registrar y Gestionar Contacto de Emergencia**
* **1. Interfaz / Frontend (UI/JS):** `renderEmergencyContactForm()`, `addContactRow()`, `saveEmergencyContacts()`.
* **2. Lógica / Backend (PHP PDO):** `PatientContactController::saveContacts(patientId, array ContactsDTO)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_guardar_contacto_emergencia(p_id_paciente, p_nombre_completo, p_parentesco, p_telefono)`.
* **4. Reglas y Excepciones:** Permite múltiples contactos responsables; obligatoriedad en parentesco y teléfono.

#### **CU16: Buscar y Modificar Datos de Paciente**
* **1. Interfaz / Frontend (UI/JS):** `renderPatientSearch()`, `executePatientSearch(query)`, `openPatientEditModal(patientId)`.
* **2. Lógica / Backend (PHP PDO):** `PatientController::update(patientId, PatientUpdateDTO)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_modificar_datos_paciente(p_id_paciente, p_nombres, p_apellidos, p_telefono, p_direccion)`.
* **4. Reglas y Excepciones:** Búsqueda ágil por CI o Apellidos; actualización de domicilio y teléfono.

#### **CU17: Consultar Historial Clínico y de Citas del Paciente**
* **1. Interfaz / Frontend (UI/JS):** `renderPatientHistoryTimeline(patientId)`, `filterHistoryByStatus(status)`.
* **2. Lógica / Backend (PHP PDO):** `PatientHistoryController::getHistory(patientId)`, `HistoryTransformer::toTimelineJson()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_consultar_historial_paciente(p_id_paciente)`.
* **4. Reglas y Excepciones:** Despliegue cronológico de citas pasadas, diagnósticos y observaciones de atención.

#### **CU18: Desactivar Registro de Paciente (Baja Lógica)**
* **1. Interfaz / Frontend (UI/JS):** `renderInactivatePatientModal()`, `confirmPatientInactivation()`.
* **2. Lógica / Backend (PHP PDO):** `PatientController::inactivate(patientId)`, `AppointmentService::checkPendingAppointments(patientId)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_inactivar_paciente(p_id_paciente)`.
* **4. Reglas y Excepciones:** Bloqueo de inactividad si registra citas futuras en estado 'PROGRAMADA' o 'CONFIRMADA'.

---

### PAQUETE 5: GESTIÓN MÉDICA, ESPECIALIDADES Y HORARIOS

#### **CU19: Gestionar Catálogo de Especialidades Médicas**
* **1. Interfaz / Frontend (UI/JS):** `renderSpecialtiesGrid()`, `openSpecialtyModal()`, `submitSpecialty()`.
* **2. Lógica / Backend (PHP PDO):** `SpecialtyController::storeOrUpdate(SpecialtyDTO)`, `ValidationService::validateUniqueSpecialtyName()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_guardar_especialidad(p_id_especialidad, p_nombre, p_descripcion)`.
* **4. Reglas y Excepciones:** Nombre de especialidad único en la base de datos; inactivación lógica.

#### **CU20: Registrar y Administrar Personal Médico**
* **1. Interfaz / Frontend (UI/JS):** `renderDoctorForm()`, `loadSpecialtiesCheckboxGroup()`, `submitDoctor()`.
* **2. Lógica / Backend (PHP PDO):** `DoctorController::create(DoctorDTO)`, `DoctorSpecialtyService::syncSpecialties(doctorId, array specialtyIds)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_crear_medico(ci, nombres, apellidos, matricula, email, array_especialidades)`.
* **4. Reglas y Excepciones:** Matrícula profesional única; vinculación a una o más especialidades.

#### **CU21: Configurar Horarios y Bloques de Disponibilidad**
* **1. Interfaz / Frontend (UI/JS):** `renderScheduleConfigurator(doctorId)`, `selectDayOfWeek(day)`, `selectTimeRange(start, end)`, `generateBlocks()`.
* **2. Lógica / Backend (PHP PDO):** `DoctorScheduleController::saveSchedule(ScheduleDTO)`, `BlockGeneratorService::generate30MinBlocks()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_configurar_horario_medico(p_id_medico, p_dia_semana, p_hora_inicio, p_hora_fin, p_duracion_bloque)`.
* **4. Reglas y Excepciones:** Fragmentación automática en bloques de 30 minutos; validación de `hora_inicio < hora_fin`.

#### **CU22: Desactivar Registro de Médico (Baja Lógica)**
* **1. Interfaz / Frontend (UI/JS):** `renderInactivateDoctorModal()`, `confirmDoctorInactivation()`.
* **2. Lógica / Backend (PHP PDO):** `DoctorController::inactivate(doctorId)`, `AppointmentService::checkDoctorPendingAppointments(doctorId)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_inactivar_medico(p_id_medico)`.
* **4. Reglas y Excepciones:** Requiere la reprogramación o reasignación previa de citas agendadas antes de la baja.

#### **CU23: Bloquear Agenda Médica por Feriados / Licencias**
* **1. Interfaz / Frontend (UI/JS):** `renderAgendaBlockModal()`, `selectBlockType(FERIADO, LICENCIA)`, `selectDateRange(start, end)`.
* **2. Lógica / Backend (PHP PDO):** `AgendaBlockController::createBlock(AgendaBlockDTO)`, `SlotService::disableBlocksInRange()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_registrar_bloqueo_agenda(p_id_medico, p_fecha_inicio, p_fecha_fin, p_motivo, p_tipo, p_aplica_todos)`.
* **4. Reglas y Excepciones:** Inhabilitación automática de reservas en las fechas especificadas; alerta sobre citas colisionadas.

---

### PAQUETE 6: GESTIÓN DE CITAS Y RESERVAS WEB (FICHA MÉDICA)

#### **CU24: Consultar Disponibilidad Horaria (Web / Presencial)**
* **1. Interfaz / Frontend (UI/JS):** `renderSpecialtySelect()`, `renderDoctorSelect()`, `renderDatePicker()`, `loadAvailableTimeSlots(doctorId, date)`.
* **2. Lógica / Backend (PHP PDO):** `AvailabilityController::getAvailableSlots(doctorId, date)`, `SlotCalculatorService::filterFreeSlots()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_consultar_bloques_disponibles(p_id_especialidad, p_id_medico, p_fecha)`.
* **4. Reglas y Excepciones:** Exclusión de bloques ocupados, feriados/licencias y horarios pasados.

#### **CU25: Solicitar y Reservar Ficha / Cita Médica Web**
* **1. Interfaz / Frontend (UI/JS):** `renderTimeSlotsGrid()`, `selectSlot(slotId)`, `enterReason()`, `proceedToCheckout()`.
* **2. Lógica / Backend (PHP PDO):** `WebAppointmentController::holdSlot(patientId, slotId)`, `AppointmentReservationService::createPreReservation()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_pre_reservar_cita(p_id_paciente, p_id_medico, p_fecha, p_hora, p_motivo)`.
* **4. Reglas y Excepciones:** Apartado temporal del cupo por 10 minutos; generación del código correlativo `CM-XXXX`.

#### **CU26: Programar y Registrar Cita Médica en Recepción**
* **1. Interfaz / Frontend (UI/JS):** `renderReceptionAppointmentForm()`, `selectPatient()`, `selectSlot()`, `confirmPresencialBooking()`.
* **2. Lógica / Backend (PHP PDO):** `ReceptionAppointmentController::store(PresencialAppointmentDTO)`, `ConcurrencyService::lockSlot()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_registrar_cita_presencial(p_id_paciente, p_id_medico, p_fecha, p_hora, p_motivo)`.
* **4. Reglas y Excepciones:** Registro presencial directo por Recepcionista; estado 'PROGRAMADA'; impresión de comprobante.

#### **CU27: Prevenir Citas Duplicadas (Control de Concurrencia Transaccional)**
* **1. Interfaz / Frontend (UI/JS):** `displaySlotOccupiedAlert()`.
* **2. Lógica / Backend (PHP PDO):** `ConcurrencyService::executeWithLock(closure)`, `DatabaseTransactionManager::wrap()`.
* **3. Persistencia / BD (PostgreSQL):** `fn_validar_bloque_unico_medico()`, `UNIQUE INDEX cita_medico_bloque_idx ON cita(id_medico, fecha, hora_inicio) WHERE estado != 'CANCELADA'`.
* **4. Reglas y Excepciones:** Garantía de aislamiento transaccional a nivel de base de datos contra reservas simultáneas.

#### **CU28: Reprogramar Cita Médica**
* **1. Interfaz / Frontend (UI/JS):** `renderRescheduleModal(appointmentId)`, `selectNewDate()`, `selectNewSlot()`, `confirmReschedule()`.
* **2. Lógica / Backend (PHP PDO):** `AppointmentManagementController::reschedule(appointmentId, newSlotId)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_reprogramar_cita(p_id_cita, p_nueva_fecha, p_nueva_hora, p_id_usuario_accion)`.
* **4. Reglas y Excepciones:** Actualización de fecha/hora, liberación del cupo anterior y registro en `historial_estado_cita`.

#### **CU29: Cancelar Cita Médica con Justificación**
* **1. Interfaz / Frontend (UI/JS):** `renderCancellationModal(appointmentId)`, `enterCancellationReason()`, `confirmCancellation()`.
* **2. Lógica / Backend (PHP PDO):** `AppointmentManagementController::cancel(appointmentId, reason)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_cancelar_cita(p_id_cita, p_motivo_cancelacion, p_id_usuario_accion)`.
* **4. Reglas y Excepciones:** Justificación obligatoria; actualización a 'CANCELADA'; liberación inmediata del bloque.

#### **CU30: Emitir Recordatorio / Notificación de Cita Programada**
* **1. Interfaz / Frontend (UI/JS):** `renderNotificationList()`, `markNotificationAsSent(id)`.
* **2. Lógica / Backend (PHP PDO):** `NotificationCronService::generateDailyReminders()`, `NotificationSender::sendEmailReminder()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_generar_recordatorios_diarios()`, `sp_actualizar_estado_notificacion(id, estado)`.
* **4. Reglas y Excepciones:** Evaluación automática de citas a 24-48 horas; control en la tabla `notificacion`.

#### **CU31: Controlar Asistencia y Máquina de Estados**
* **1. Interfaz / Frontend (UI/JS):** `renderAttendanceStatusButtons()`, `updateStatusUI(newStatus)`.
* **2. Lógica / Backend (PHP PDO):** `AppointmentStateController::transitionTo(appointmentId, targetState)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_cambiar_estado_cita(p_id_cita, p_nuevo_estado, p_id_usuario_accion)`.
* **4. Reglas y Excepciones:** Transiciones válidas: `PROGRAMADA` -> `CONFIRMADA` -> `ATENDIDA` / `INASISTENCIA` / `CANCELADA`.

#### **CU32: Consultar Agenda Médica Diaria**
* **1. Interfaz / Frontend (UI/JS):** `renderDailyAgendaView()`, `selectDoctorAgenda()`, `selectDateAgenda()`, `filterByStatus()`.
* **2. Lógica / Backend (PHP PDO):** `DoctorAgendaController::getDailyAgenda(doctorId, date)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_consultar_agenda_diaria_medico(p_id_medico, p_fecha)`.
* **4. Reglas y Excepciones:** Despliegue de la planilla diaria de atenciones ordenada cronológicamente.

#### **CU33: Registrar Atención Médica Concluida (Marcar Atendida)**
* **1. Interfaz / Frontend (UI/JS):** `renderConsultationForm(appointmentId)`, `enterClinicalNotes()`, `markAsAttendedSubmit()`.
* **2. Lógica / Backend (PHP PDO):** `DoctorConsultationController::completeConsultation(appointmentId, ClinicalNotesDTO)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_concluir_atencion_medica(p_id_cita, p_observaciones_clinicas)`.
* **4. Reglas y Excepciones:** Actualización a 'ATENDIDA'; grabado de marca de tiempo y diagnóstico del profesional.

---

### PAQUETE 7: PASARELA DE PAGOS Y TRANSACCIONES EN LÍNEA

#### **CU34: Procesar Pago en Línea de Ficha / Cita (Pasarela)**
* **1. Interfaz / Frontend (UI/JS):** `renderPaymentGatewayModal(amount)`, `tokenizeCardDetails()`, `renderQRCode(qrData)`, `pollPaymentStatus()`.
* **2. Lógica / Backend (PHP PDO):** `PaymentController::processCheckout(CheckoutDTO)`, `PaymentGatewayStrategy::charge()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_iniciar_transaccion_pago(p_id_cita, p_monto, p_metodo_pago, p_pasarela)`.
* **4. Reglas y Excepciones:** Conexión segura con pasarela (Stripe / QR); verificación de fondos y respuesta con token de transacción.

#### **CU35: Confirmar Transacción y Generar Comprobante Digital**
* **1. Interfaz / Frontend (UI/JS):** `displayPaymentSuccessScreen()`, `downloadReceiptPDFButton()`.
* **2. Lógica / Backend (PHP PDO):** `PaymentWebhookController::handleCallback(payload)`, `InvoiceService::generatePDFReceipt(paymentId)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_confirmar_pago_cita(p_id_cita, p_transaccion_pasarela_id, p_monto_recibido)`.
* **4. Reglas y Excepciones:** Recepción asíncrona mediante Webhook; confirmación de la cita ('PROGRAMADA' - PAGADA); emisión de factura PDF.

#### **CU36: Consultar Historial de Pagos y Transacciones del Paciente**
* **1. Interfaz / Frontend (UI/JS):** `renderPaymentHistoryGrid()`, `filterPaymentsByDate()`, `downloadReceipt(paymentId)`.
* **2. Lógica / Backend (PHP PDO):** `PaymentHistoryController::getPatientPayments(patientId)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_consultar_pagos_paciente(p_id_paciente)`.
* **4. Reglas y Excepciones:** Consulta de cobranzas realizadas con botón de re-descarga del comprobante en PDF.

#### **CU37: Gestionar Reembolso / Anulación de Pago por Cancelación**
* **1. Interfaz / Frontend (UI/JS):** `renderRefundRequestModal()`, `submitRefundRequest()`.
* **2. Lógica / Backend (PHP PDO):** `RefundController::processRefund(appointmentId)`, `PaymentGatewayStrategy::refund(transactionId)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_registrar_reembolso_pago(p_id_cita, p_monto_reembolsado, p_motivo)`.
* **4. Reglas y Excepciones:** Evaluación de política de cancelación (ej. 24h previas); orden de extorno en la pasarela externa.

---

### PAQUETE 8: REPORTES ADMINISTRATIVOS Y FINANCIEROS

#### **CU38: Generar Reporte de Citas por Período**
* **1. Interfaz / Frontend (UI/JS):** `renderAppointmentsReportFilter()`, `generateReportClick()`.
* **2. Lógica / Backend (PHP PDO):** `ReportController::appointmentsByPeriod(ReportFilterDTO)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_reporte_citas_por_periodo(p_fecha_inicio, p_fecha_fin, p_id_medico, p_id_especialidad, p_estado)`.
* **4. Reglas y Excepciones:** Agregación estadística agrupada por rangos de fecha y filtros.

#### **CU39: Generar Reporte de Atenciones por Médico y Especialidad**
* **1. Interfaz / Frontend (UI/JS):** `renderDoctorProductivityFilter()`, `generateProductivityReportClick()`.
* **2. Lógica / Backend (PHP PDO):** `ReportController::attentionsByDoctor(ReportFilterDTO)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_reporte_atenciones_medico_especialidad(p_fecha_inicio, p_fecha_fin)`.
* **4. Reglas y Excepciones:** Conteo de citas en estado 'ATENDIDA'; cálculo de tasa de participación por área.

#### **CU40: Generar Reporte de Control de Asistencia e Inasistencias**
* **1. Interfaz / Frontend (UI/JS):** `renderAttendanceReportFilter()`, `generateAttendanceReportClick()`.
* **2. Lógica / Backend (PHP PDO):** `ReportController::attendanceControl(ReportFilterDTO)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_reporte_control_asistencia(p_fecha_inicio, p_fecha_fin)`.
* **4. Reglas y Excepciones:** Relación porcentual de efectividad (Atendidas) vs. ausentismo (Inasistencias) y anulaciones.

#### **CU41: Generar Reporte de Ingresos por Pasarela de Pagos y Cajas**
* **1. Interfaz / Frontend (UI/JS):** `renderRevenueReportFilter()`, `generateRevenueReportClick()`.
* **2. Lógica / Backend (PHP PDO):** `ReportController::revenueBreakdown(ReportFilterDTO)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_reporte_ingresos_financieros(p_fecha_inicio, p_fecha_fin)`.
* **4. Reglas y Excepciones:** Desglose financiero entre cobranzas digitales en la pasarela web y pagos en caja presencial.

#### **CU42: Generar Reporte de Padrón General de Pacientes Registrados**
* **1. Interfaz / Frontend (UI/JS):** `renderPatientsReportFilter()`, `generatePatientsReportClick()`.
* **2. Lógica / Backend (PHP PDO):** `ReportController::patientsDirectory(ReportFilterDTO)`.
* **3. Persistencia / BD (PostgreSQL):** `sp_reporte_padron_pacientes(p_estado, p_sexo, p_fecha_inicio, p_fecha_fin)`.
* **4. Reglas y Excepciones:** Padrón general consolidado con información demográfica y de contacto.

#### **CU43: Exportar Reportes Administrativos (PDF / CSV)**
* **1. Interfaz / Frontend (UI/JS):** `exportToPDFButton()`, `exportToCSVButton()`.
* **2. Lógica / Backend (PHP PDO):** `ReportExportController::export(reportType, format, filterDTO)`, `PDFGenerator::build()`, `CSVGenerator::build()`.
* **3. Persistencia / BD (PostgreSQL):** `sp_obtener_datos_exportacion_reporte(p_tipo_reporte, p_parametros_json)`.
* **4. Reglas y Excepciones:** Generación de archivos descargables formateados PDF o CSV.
