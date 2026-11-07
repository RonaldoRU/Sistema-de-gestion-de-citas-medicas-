# Diccionario y Modelo de Base de Datos Integral (23 Tablas)

**Sistema:** Plataforma Web de Gestión de Citas Médicas – Clínica Privada "Vida Salud"  
**Metodología:** PUDS (Proceso Unificado de Desarrollo de Software) / UML 2.5  
**Estructura de Base de Datos:** Relacional Normalizada (3FN) con Soporte a Herencia por Tabla Concreta (TPT)

---

## 1. Módulo P2: Usuarios y Roles RBAC (CU06–CU10)

### 1.1 Tabla: `rol`
Define los perfiles operativos que determinan los privilegios y accesos al sistema.

* **`idRol`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`nombre`**: `varchar(50)` — Clave Única (`UK`), `NOT NULL` (ej. `'ADMINISTRADOR'`, `'MEDICO'`, `'RECEPCIONISTA'`, `'PACIENTE'`).
* **`descripcion`**: `varchar(255)` — Detalle del alcance del rol en el sistema.

### 1.2 Tabla: `permiso`
Catálogo granular de acciones y privilegios sobre recursos específicos.

* **`idPermiso`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`nombre`**: `varchar(100)` — Clave Única (`UK`), `NOT NULL` (ej. `'CREAR_CITA'`, `'CANCELAR_CITA'`, `'APROBAR_REEMBOLSO'`).
* **`modulo`**: `varchar(50)` — `NOT NULL` (ej. `'SEGURIDAD'`, `'CITAS'`, `'PAGOS'`).
* **`rutaMenu`**: `varchar(150)` — Identificador de ruta o vista autorizada en el front-end.

### 1.3 Tabla Asociativa: `rol_permiso`
Resuelve la relación de muchos a muchos ($N:M$) entre roles y permisos.

* **`idRol`**: `int` — Clave Primaria y Foránea (`PK`, `FK`), referencia a `rol(idRol)`, `ON DELETE CASCADE`.
* **`idPermiso`**: `int` — Clave Primaria y Foránea (`PK`, `FK`), referencia a `permiso(idPermiso)`, `ON DELETE CASCADE`.
* **`fechaAsignacion`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.

### 1.4 Tabla: `usuario`
Cuenta de autenticación, control de accesos, credenciales y bloqueo de fuerza bruta.

* **`idUsuario`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idPersona`**: `int` — Clave Foránea y Única (`FK`, `UK`), referencia a `persona(idPersona)`.
* **`idRol`**: `int` — Clave Foránea (`FK`), referencia a `rol(idRol)`, `NOT NULL`.
* **`nombreUsuario`**: `varchar(50)` — Clave Única (`UK`), `NOT NULL`.
* **`contrasenaHash`**: `varchar(255)` — `NOT NULL` (algoritmo bcrypt/Argon2).
* **`estado`**: `varchar(20)` — `NOT NULL`, `DEFAULT 'ACTIVO'` (`'ACTIVO'`, `'INACTIVO'`, `'BLOQUEADO'`).
* **`intentosFallidos`**: `int` — `NOT NULL`, `DEFAULT 0`.
* **`bloqueadoHasta`**: `datetime` — `NULL` (marca de tiempo fin de bloqueo).
* **`ultimoAcceso`**: `datetime` — `NULL`.
* **`fechaCreacion`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.

---

## 2. Módulo P1: Seguridad y Autenticación (CU01–CU05)

### 2.1 Tabla: `sesion`
Trazabilidad de sesiones activas, tokens emitidos y control de concurrencia.

* **`idSesion`**: `varchar(128)` — Clave Primaria (`PK`), `NOT NULL` (UUID o firma hash del token).
* **`idUsuario`**: `int` — Clave Foránea (`FK`), referencia a `usuario(idUsuario)`, `NOT NULL`.
* **`fechaInicio`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.
* **`ultimaActividad`**: `datetime` — `NOT NULL`.
* **`fechaCierre`**: `datetime` — `NULL` (cuando se invoca logout explícito o caduca).
* **`activa`**: `boolean` — `NOT NULL`, `DEFAULT TRUE`.
* **`ip`**: `varchar(45)` — Dirección IP del cliente (`IPv4`/`IPv6`).

### 2.2 Tabla: `recuperacion_contrasena`
Tokens unívocos con tiempo de expiración para recuperación por correo electrónico.

* **`idRecuperacion`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idUsuario`**: `int` — Clave Foránea (`FK`), referencia a `usuario(idUsuario)`, `NOT NULL`.
* **`tokenHash`**: `varchar(255)` — Clave Única (`UK`), `NOT NULL`.
* **`fechaGeneracion`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.
* **`fechaExpiracion`**: `datetime` — `NOT NULL`.
* **`usado`**: `boolean` — `NOT NULL`, `DEFAULT FALSE`.

---

## 3. Módulo P4: Pacientes y Personas (CU13–CU18)

### 3.1 Tabla / Clase Base: `persona` (Superclase Abstracta)
Datos base de contacto e identidad de cualquier persona vinculada al sistema.

* **`idPersona`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`ci`**: `varchar(20)` — Clave Única (`UK`), `NOT NULL` (Cédula de identidad).
* **`nombres`**: `varchar(100)` — `NOT NULL`.
* **`apellidos`**: `varchar(100)` — `NOT NULL`.
* **`telefono`**: `varchar(20)` — `NULL`.
* **`email`**: `varchar(120)` — Clave Única (`UK`), `NOT NULL`.
* **`activo`**: `boolean` — `NOT NULL`, `DEFAULT TRUE` (baja lógica).
* **`fechaRegistro`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.

### 3.2 Tabla: `personal_administrativo` (Subclase de `persona`)
Personal de atención en recepción, facturación y operaciones.

* **`idPersona`**: `int` — Clave Primaria y Foránea (`PK`, `FK`), referencia a `persona(idPersona)`, `ON DELETE CASCADE`.
* **`cargo`**: `varchar(50)` — `NOT NULL` (ej. `'RECEPCIONISTA'`, `'CAJERO'`, `'ADMINISTRATIVO'`).

### 3.3 Tabla: `paciente` (Subclase de `persona`)
Expediente del solicitante de atención médica ambulatoria.

* **`idPersona`**: `int` — Clave Primaria y Foránea (`PK`, `FK`), referencia a `persona(idPersona)`, `ON DELETE CASCADE`.
* **`codigo`**: `varchar(20)` — Clave Única (`UK`), `NOT NULL` (ej. `'PAC-10023'`).
* **`sexo`**: `char(1)` — `NOT NULL` (`'M'`, `'F'`).
* **`fechaNacimiento`**: `date` — `NOT NULL`.
* **`direccion`**: `varchar(255)` — `NULL`.
* **`fechaRegistro`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.

### 3.4 Tabla: `informacion_medica`
Ficha basal de antecedentes clínicos asociada exclusivamente a un paciente ($1:0..1$).

* **`idInformacion`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idPaciente`**: `int` — Clave Foránea y Única (`FK`, `UK`), referencia a `paciente(idPersona)`.
* **`tipoSangre`**: `varchar(5)` — `NOT NULL` (`'A+'`, `'A-'`, `'B+'`, `'B-'`, `'AB+'`, `'AB-'`, `'O+'`, `'O-'`).
* **`alergias`**: `text` — `NULL`.
* **`enfermedadesCronicas`**: `text` — `NULL`.
* **`medicamentosHabituales`**: `text` — `NULL`.
* **`antecedentesRelevantes`**: `text` — `NULL`.
* **`observaciones`**: `text` — `NULL`.
* **`fechaActualizacion`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`.

### 3.5 Tabla: `contacto_emergencia`
Contactos de auxilio del paciente para eventualidades médicas ($1:N$).

* **`idContacto`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idPaciente`**: `int` — Clave Foránea (`FK`), referencia a `paciente(idPersona)`, `NOT NULL`.
* **`nombreCompleto`**: `varchar(150)` — `NOT NULL`.
* **`parentesco`**: `varchar(50)` — `NOT NULL`.
* **`telefono`**: `varchar(20)` — `NOT NULL`.

---

## 4. Módulo P5: Personal Médico y Horarios (CU19–CU23)

### 4.1 Tabla: `medico` (Subclase de `persona`)
Profesionales habilitados para impartir consultas y tratamientos.

* **`idPersona`**: `int` — Clave Primaria y Foránea (`PK`, `FK`), referencia a `persona(idPersona)`, `ON DELETE CASCADE`.
* **`codigo`**: `varchar(20)` — Clave Única (`UK`), `NOT NULL` (ej. `'MED-204'`).
* **`matricula`**: `varchar(50)` — Clave Única (`UK`), `NOT NULL` (registro colegio médico).

### 4.2 Tabla: `especialidad`
Ramas de la medicina ofertadas por el establecimiento clínico.

* **`idEspecialidad`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`nombre`**: `varchar(80)` — Clave Única (`UK`), `NOT NULL` (ej. `'Cardiología'`, `'Pediatría'`).
* **`descripcion`**: `varchar(255)` — `NULL`.
* **`activo`**: `boolean` — `NOT NULL`, `DEFAULT TRUE`.

### 4.3 Tabla Asociativa: `medico_especialidad`
Acreditación de médicos en una o múltiples especialidades ($N:M$).

* **`idMedico`**: `int` — Clave Primaria y Foránea (`PK`, `FK`), referencia a `medico(idPersona)`.
* **`idEspecialidad`**: `int` — Clave Primaria y Foránea (`PK`, `FK`), referencia a `especialidad(idEspecialidad)`.
* **`fechaAsignacion`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.

### 4.4 Tabla: `horario`
Definición de turnos semanales recurrentes por médico.

* **`idHorario`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idMedico`**: `int` — Clave Foránea (`FK`), referencia a `medico(idPersona)`, `NOT NULL`.
* **`diaSemana`**: `int` — `NOT NULL` (`1` = Lunes ... `7` = Domingo).
* **`horaInicio`**: `time` — `NOT NULL`.
* **`horaFin`**: `time` — `NOT NULL`.
* **`duracionBloqueMin`**: `int` — `NOT NULL`, `DEFAULT 30`.
* **`activo`**: `boolean` — `NOT NULL`, `DEFAULT TRUE`.

### 4.5 Tabla: `bloqueo_agenda`
Inhabilitación de turnos por causas programadas o imprevistos (individuales o globales).

* **`idBloqueo`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idMedico`**: `int` — Clave Foránea (`FK`), referencia a `medico(idPersona)`, `NULL` (si aplica a todos).
* **`fechaInicio`**: `date` — `NOT NULL`.
* **`fechaFin`**: `date` — `NOT NULL`.
* **`motivo`**: `varchar(255)` — `NOT NULL`.
* **`tipo`**: `varchar(50)` — `NOT NULL` (`'FERIADO'`, `'LICENCIA'`, `'BAJA_MEDICA'`).
* **`aplicaATodos`**: `boolean` — `NOT NULL`, `DEFAULT FALSE`.

---

## 5. Módulo P6: Citas Médicas y Concurrencia (CU24–CU33)

### 5.1 Tabla: `cita`
Registro nuclear de atención con máquina de estados y autoreferencia para reprogramación.

* **`idCita`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`codigo`**: `varchar(30)` — Clave Única (`UK`), `NOT NULL` (ej. `'CIT-2026-0091'`).
* **`idPaciente`**: `int` — Clave Foránea (`FK`), referencia a `paciente(idPersona)`, `NOT NULL`.
* **`idMedico`**: `int` — Clave Foránea (`FK`), referencia a `medico(idPersona)`, `NOT NULL`.
* **`idEspecialidad`**: `int` — Clave Foránea (`FK`), referencia a `especialidad(idEspecialidad)`, `NOT NULL`.
* **`idUsuarioRegistro`**: `int` — Clave Foránea (`FK`), referencia a `usuario(idUsuario)`, `NOT NULL`.
* **`idCitaOrigen`**: `int` — Clave Foránea (`FK`), referencia a `cita(idCita)`, `NULL` (autoreferencia por reprogramación).
* **`fecha`**: `date` — `NOT NULL`.
* **`horaInicio`**: `time` — `NOT NULL`.
* **`horaFin`**: `time` — `NOT NULL`.
* **`motivoConsulta`**: `varchar(255)` — `NOT NULL`.
* **`estado`**: `varchar(30)` — `NOT NULL` (`'PROGRAMADA'`, `'CONFIRMADA'`, `'ATENDIDA'`, `'CANCELADA'`, `'INASISTENCIA'`).
* **`origen`**: `varchar(20)` — `NOT NULL` (`'WEB'`, `'RECEPCION'`).
* **`motivoCancelacion`**: `varchar(255)` — `NULL`.
* **`observacionAtencion`**: `text` — `NULL`.
* **`fechaCreacion`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.
* **`fechaHoraAtencion`**: `datetime` — `NULL`.
* **`expiraEn`**: `datetime` — `NULL` (límite de bloqueo transaccional para pago web).

### 5.2 Tabla: `historial_estado_cita`
Bitácora de auditoría inmutable de transiciones de estado de cada cita ($1:N$).

* **`idHistorial`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idCita`**: `int` — Clave Foránea (`FK`), referencia a `cita(idCita)`, `NOT NULL`.
* **`idUsuario`**: `int` — Clave Foránea (`FK`), referencia a `usuario(idUsuario)`, `NOT NULL`.
* **`estadoAnterior`**: `varchar(30)` — `NULL`.
* **`estadoNuevo`**: `varchar(30)` — `NOT NULL`.
* **`fechaAnterior`**: `date` — `NULL`.
* **`horaAnterior`**: `time` — `NULL`.
* **`motivo`**: `varchar(255)` — `NULL`.
* **`fechaCambio`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.

### 5.3 Tabla: `notificacion`
Control de despacho de recordatorios automáticos por canales digitales (SMS, WhatsApp, Email).

* **`idNotificacion`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idCita`**: `int` — Clave Foránea (`FK`), referencia a `cita(idCita)`, `NOT NULL`.
* **`idUsuarioGestion`**: `int` — Clave Foránea (`FK`), referencia a `usuario(idUsuario)`, `NULL`.
* **`mensaje`**: `text` — `NOT NULL`.
* **`fechaProgramada`**: `datetime` — `NOT NULL`.
* **`fechaEnvio`**: `datetime` — `NULL`.
* **`estado`**: `varchar(20)` — `NOT NULL`, `DEFAULT 'PENDIENTE'` (`'PENDIENTE'`, `'ENVIADA'`, `'FALLIDA'`).
* **`intentos`**: `int` — `NOT NULL`, `DEFAULT 0`.

---

## 6. Módulo P3: Bitácora y Auditoría General (CU11–CU12)

### 6.1 Tabla: `bitacora`
Registro forense transversal de operaciones y eventos transaccionales del software.

* **`idBitacora`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idUsuario`**: `int` — Clave Foránea (`FK`), referencia a `usuario(idUsuario)`, `NULL` (en caso de accesos no autenticados).
* **`descripcion`**: `varchar(255)` — `NOT NULL`.
* **`fechaHora`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.
* **`modulo`**: `varchar(50)` — `NOT NULL`.
* **`tipoAccion`**: `varchar(50)` — `NOT NULL` (`'LOGIN'`, `'LOGOUT'`, `'BLOQUEO'`, `'INSERT'`, `'UPDATE'`, `'DELETE'`).
* **`tablaAfectada`**: `varchar(50)` — `NOT NULL`.
* **`idRegistroAfectado`**: `int` — `NULL`.
* **`detalle`**: `text` — `NULL` (payload / datos modificados en formato JSON).
* **`ip`**: `varchar(45)` — `NOT NULL`.
* **`navegador`**: `varchar(255)` — `NOT NULL`.

---

## 7. Módulo P8: Pagos, Facturación y Reembolsos (CU34–CU37 · CU41)

### 7.1 Tabla: `pago`
Transacción monetaria asociada a la cita médica.

* **`idPago`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idCita`**: `int` — Clave Foránea (`FK`), referencia a `cita(idCita)`, `NOT NULL`.
* **`idUsuarioRegistro`**: `int` — Clave Foránea (`FK`), referencia a `usuario(idUsuario)`, `NOT NULL`.
* **`monto`**: `decimal(10,2)` — `NOT NULL`.
* **`moneda`**: `varchar(5)` — `NOT NULL`, `DEFAULT 'BOB'` (`'BOB'`, `'USD'`).
* **`metodo`**: `varchar(30)` — `NOT NULL` (`'TARJETA'`, `'QR'`, `'EFECTIVO'`).
* **`estado`**: `varchar(20)` — `NOT NULL` (`'INICIADO'`, `'APROBADO'`, `'RECHAZADO'`, `'REEMBOLSADO'`).
* **`referenciaExterna`**: `varchar(100)` — Clave Única (`UK`), `NULL` (ID devuelto por Stripe/Libélula/QR).
* **`fechaHora`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.

### 7.2 Tabla: `comprobante_pago`
Documento legal tributario emitido tras cobro efectivo ($1:0..1$).

* **`idComprobante`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idPago`**: `int` — Clave Foránea y Única (`FK`, `UK`), referencia a `pago(idPago)`, `NOT NULL`.
* **`numero`**: `varchar(50)` — Clave Única (`UK`), `NOT NULL` (número de recibo/factura).
* **`fechaEmision`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.
* **`montoTotal`**: `decimal(10,2)` — `NOT NULL`.
* **`rutaArchivo`**: `varchar(255)` — `NOT NULL` (ruta/URL del comprobante PDF generado).

### 7.3 Tabla: `reembolso`
Gestión de extornos y devoluciones derivadas de citas anuladas ($1:N$).

* **`idReembolso`**: `int` — Clave Primaria (`PK`), `AUTO_INCREMENT`, `NOT NULL`.
* **`idPago`**: `int` — Clave Foránea (`FK`), referencia a `pago(idPago)`, `NOT NULL`.
* **`idUsuarioAutoriza`**: `int` — Clave Foránea (`FK`), referencia a `usuario(idUsuario)`, `NOT NULL`.
* **`monto`**: `decimal(10,2)` — `NOT NULL`.
* **`motivo`**: `varchar(255)` — `NOT NULL`.
* **`estado`**: `varchar(20)` — `NOT NULL`, `DEFAULT 'SOLICITADO'` (`'SOLICITADO'`, `'PROCESADO'`, `'RECHAZADO'`).
* **`fechaSolicitud`**: `datetime` — `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`.
* **`fechaProcesado`**: `datetime` — `NULL`.
* **`referenciaExterna`**: `varchar(100)` — `NULL` (comprobante de transferencia bancaria/pasarela).

---

## 8. Matriz Completa de Relaciones de Base de Datos

| # | Tabla Origen | Multiplicidad | Relación Semántica | Multiplicidad | Tabla Destino | Cardinalidad | Clave Foránea de Enlace |
|---|---|:---:|---|:---:|---|:---:|---|
| 1 | `persona` | 1 | Generaliza a | 1 | `paciente` | 1 : 1 | `paciente.idPersona = persona.idPersona` |
| 2 | `persona` | 1 | Generaliza a | 1 | `personal_administrativo` | 1 : 1 | `personal_administrativo.idPersona = persona.idPersona` |
| 3 | `persona` | 1 | Generaliza a | 1 | `medico` | 1 : 1 | `medico.idPersona = persona.idPersona` |
| 4 | `persona` | 1 | Posee cuenta | 0..1 | `usuario` | 1 : 0..1 | `usuario.idPersona = persona.idPersona` |
| 5 | `rol` | 1 | Asignado a | 0..* | `usuario` | 1 : N | `usuario.idRol = rol.idRol` |
| 6 | `rol` | 1 | Incluye | 0..* | `rol_permiso` | 1 : N | `rol_permiso.idRol = rol.idRol` |
| 7 | `permiso` | 1 | Concedido en | 0..* | `rol_permiso` | 1 : N | `rol_permiso.idPermiso = permiso.idPermiso` |
| 8 | `usuario` | 1 | Inicia | 0..* | `sesion` | 1 : N | `sesion.idUsuario = usuario.idUsuario` |
| 9 | `usuario` | 1 | Solicita | 0..* | `recuperacion_contrasena` | 1 : N | `recuperacion_contrasena.idUsuario = usuario.idUsuario` |
| 10 | `usuario` | 1 | Genera evento | 0..* | `bitacora` | 1 : N | `bitacora.idUsuario = usuario.idUsuario` |
| 11 | `usuario` | 1 | Registra | 0..* | `cita` | 1 : N | `cita.idUsuarioRegistro = usuario.idUsuario` |
| 12 | `usuario` | 1 | Cambia estado | 0..* | `historial_estado_cita` | 1 : N | `historial_estado_cita.idUsuario = usuario.idUsuario` |
| 13 | `usuario` | 0..1 | Monitorea | 0..* | `notificacion` | 1 : N | `notificacion.idUsuarioGestion = usuario.idUsuario` |
| 14 | `usuario` | 1 | Cobra | 0..* | `pago` | 1 : N | `pago.idUsuarioRegistro = usuario.idUsuario` |
| 15 | `usuario` | 1 | Aprueba | 0..* | `reembolso` | 1 : N | `reembolso.idUsuarioAutoriza = usuario.idUsuario` |
| 16 | `paciente` | 1 | Posee ficha | 0..1 | `informacion_medica` | 1 : 1 | `informacion_medica.idPaciente = paciente.idPersona` |
| 17 | `paciente` | 1 | Asigna | 0..* | `contacto_emergencia` | 1 : N | `contacto_emergencia.idPaciente = paciente.idPersona` |
| 18 | `paciente` | 1 | Solicita | 0..* | `cita` | 1 : N | `cita.idPaciente = paciente.idPersona` |
| 19 | `medico` | 1 | Configura | 0..* | `horario` | 1 : N | `horario.idMedico = medico.idPersona` |
| 20 | `medico` | 0..1 | Recibe | 0..* | `bloqueo_agenda` | 1 : N | `bloqueo_agenda.idMedico = medico.idPersona` |
| 21 | `medico` | 1 | Ejerce | 0..* | `medico_especialidad` | 1 : N | `medico_especialidad.idMedico = medico.idPersona` |
| 22 | `especialidad` | 1 | Contiene | 0..* | `medico_especialidad` | 1 : N | `medico_especialidad.idEspecialidad = especialidad.idEspecialidad` |
| 23 | `medico` | 1 | Atiende | 0..* | `cita` | 1 : N | `cita.idMedico = medico.idPersona` |
| 24 | `especialidad` | 1 | Clasifica | 0..* | `cita` | 1 : N | `cita.idEspecialidad = especialidad.idEspecialidad` |
| 25 | `cita` | 0..1 | Reprogramada desde | 0..1 | `cita` | 1 : 1 (Autoref) | `cita.idCitaOrigen = cita.idCita` |
| 26 | `cita` | 1 | Registra | 0..* | `historial_estado_cita` | 1 : N | `historial_estado_cita.idCita = cita.idCita` |
| 27 | `cita` | 1 | Origina | 0..* | `notificacion` | 1 : N | `notificacion.idCita = cita.idCita` |
| 28 | `cita` | 1 | Genera cobro | 0..* | `pago` | 1 : N | `pago.idCita = cita.idCita` |
| 29 | `pago` | 1 | Produce | 0..1 | `comprobante_pago` | 1 : 1 | `comprobante_pago.idPago = pago.idPago` |
| 30 | `pago` | 1 | Origina | 0..* | `reembolso` | 1 : N | `reembolso.idPago = pago.idPago` |
