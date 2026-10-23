1.4 ALCANCE
El sistema web para la gestión de citas médicas de la Clínica "Vida Salud" abordará diversas áreas funcionales para cubrir de manera integral las necesidades operativas y administrativas de la institución. La solución se implementará como una aplicación web desarrollada con PHP y PostgreSQL, delimitando su operación al personal administrativo (administradores y recepcionistas) y al personal médico.
A continuación, se detallan los requisitos funcionales organizados por módulos:
1.4.1 Módulo de Usuarios y Seguridad
● Gestión de cuentas de usuario: Registro, modificación, activación y desactivación de usuarios del sistema con sus datos esenciales (nombre completo, correo electrónico, nombre de usuario y rol asignado).
● Control de acceso por roles (RBAC): Administración y asignación de roles predefinidos (Administrador, Recepcionista y Médico), asegurando que las opciones de menú y navegación se desplieguen estrictamente según los privilegios autorizados.
● Autenticación y manejo de sesiones: Inicio y cierre de sesión seguro mediante el mecanismo nativo de sesiones de PHP, impidiendo el acceso directo a páginas internas cuando no exista una sesión activa válida.
● Cifrado de credenciales: Almacenamiento seguro de contraseñas en PostgreSQL aplicando funciones criptográficas de hash (password_hash() y password_verify()) para garantizar la confidencialidad de las cuentas.
1.4.2 Módulo de Pacientes
● Ficha y registro de pacientes: Captura de datos personales y demográficos del paciente (código identificador único, número de carnet de identidad/CI, nombres, apellidos, sexo, fecha de nacimiento, teléfono, correo electrónico y dirección).
● Validación de unicidad de identidad: Control en el servidor y restricciones en la base de datos para impedir el registro de pacientes duplicados bajo un mismo documento de identidad (CI único).
● Búsqueda y actualización: Mecanismos de consulta de pacientes con filtros por CI, nombre o apellido, permitiendo la modificación oportuna de sus datos de contacto y residencia.
● Consulta de historial de atenciones: Visualización cronológica del historial de citas del paciente, permitiendo revisar fecha, hora, médico asignado, especialidad, motivo de consulta y estado registrado.
● Desactivación lógica: Implementación de baja lógica (estado activo/inactivo) para retirar pacientes del flujo operativo sin eliminar físicamente sus tuplas de la base de datos, garantizando la conservación de su historial y la integridad referencial.
1.4.3 Módulo de Gestión Médica y Horarios
● Catálogo de especialidades médicas: Registro, modificación, consulta y activación/desactivación de las especialidades atendidas por la clínica (medicina general, pediatría, ginecología, odontología, entre otras), impidiendo la duplicidad de nombres normalizados.
● Administración de personal médico: Registro y edición de médicos incluyendo código, número de matrícula o registro profesional, nombres, apellidos, teléfono, correo electrónico, estado y asignación de una o múltiples especialidades.
● Configuración de horarios de disponibilidad: Definición de la jornada de atención de cada médico por día de la semana, configurando hora de inicio, hora de fin y duración de los intervalos de atención (bloques regulares de 30 minutos).
● Validación de franjas horarias: Reglas automáticas en el servidor para evitar horarios ilógicos (hora de inicio posterior a la final) o la superposición de horarios de atención para un mismo profesional.
● Desactivación lógica de médicos: Mecanismo para inhabilitar a médicos inactivos impidiendo que se les programen nuevas citas, manteniendo accesibles sus citas históricas.
1.4.4 Módulo de Gestión de Citas Médicas
● Consulta de disponibilidad horaria: Motor de búsqueda en tiempo real que filtra por especialidad, profesional médico y fecha seleccionada, desplegando únicamente los bloques de horario verdaderamente disponibles y bloqueando fechas pasadas.
● Programación y registro de citas: Creación de la cita médica asociando al paciente, médico, especialidad, fecha, horario asignado y motivo breve de consulta, con asignación automática de un código correlativo único (ej. CM-0001) y fecha de creación.
● Prevención de citas duplicadas (Control de concurrencia): Validación en servidor y restricciones en la base de datos relacional para impedir que un médico tenga dos citas superpuestas o incompatibles en el mismo intervalo de tiempo.
● Reprogramación de citas: Cambio de fecha y hora para citas en estado programado, verificando la disponibilidad del médico en la nueva fecha y evitando conflictos de agenda sin perder la trazabilidad de la cita original.
● Cancelación justificada: Cambio de estado a cancelado registrando el motivo de la anulación, liberando inmediatamente el cupo horario en la agenda y conservando el registro histórico para auditoría.
● Control de asistencia y seguimiento de estados: Gestión de las transiciones de estado de la cita médica (Programada, Confirmada, Atendida, Cancelada e Inasistencia), controlando las acciones válidas por cada estado e impidiendo transiciones indebidas.
● Consulta de agenda médica diaria: Interfaz para que el personal médico y de recepción visualice la lista de citas programadas para una fecha determinada, permitiendo al médico registrar la atención realizada.
1.4.5 Módulo de Reportes
● Reporte de citas por período: Consolidado de citas médicas dentro de una fecha específica o rango de fechas seleccionado.
● Reporte de atenciones por médico: Resumen de la carga horaria y cantidad de consultas atendidas por cada profesional.
● Reporte de demanda por especialidad: Estadísticas de atenciones para identificar las áreas clínicas con mayor volumen de pacientes.
● Reporte de control de asistencia: Cuantificación de citas atendidas, citas canceladas e inasistencias registradas dentro de un período determinado.
● Reporte de pacientes registrados: Listado general del padrón de pacientes con sus datos de contacto y estado operativo.
● Exportación de datos: Funcionalidad para exportar los resúmenes y consultas a formatos externos como PDF o CSV para respaldo gerencial.
1.4.6 Módulo de Bitácora y Auditoría
● Registro de eventos del sistema: Registro automático de las operaciones críticas realizadas en la aplicación (inicios de sesión, creación de usuarios, programación, reprogramación, cancelación de citas y desactivaciones de registros).
● Trazabilidad: Almacenamiento de la fecha, hora exacta, usuario responsable, tipo de acción y tabla afectada para garantizar la auditoría y control interno de la información.
IDENTIFICAR CASOS DE USO (CATÁLOGO GENERAL DEL SISTEMA)
● CU01: Iniciar Sesión en la Plataforma Web
● CU02: Cerrar Sesión y Revocar Sesión
● CU03: Recuperar / Restablecer Contraseña Olvidada
● CU04: Bloqueo Automático por Intentos Fallidos
● CU05: Registrar Nuevo Usuario del Sistema
● CU06: Consultar Catálogo y Perfil de Usuarios
● CU07: Modificar Datos de Cuenta de Usuario
● CU08: Cambiar Rol Operativo y Permisos (RBAC)
● CU09: Suspender / Inactivar Cuenta de Usuario (Baja Lógica)
● CU10: Registrar Acción Automática en Bitácora (Trigger / Middleware)
● CU11: Consultar y Filtrar Bitácora de Auditoría
● CU12: Registrar Paciente
● CU13: Buscar y Modificar Datos de Paciente
● CU14: Consultar Historial del Paciente
● CU15: Desactivar Registro de Paciente (Baja Lógica)
● CU16: Gestionar Catálogo de Especialidades Médicas
● CU17: Registrar y Administrar Personal Médico
● CU18: Configurar Horarios y Bloques de Disponibilidad
● CU19: Desactivar Registro de Médico (Baja Lógica)
● CU20: Consultar Disponibilidad Horaria
● CU21: Programar y Registrar Cita Médica
● CU22: Prevenir Citas Duplicadas (Control de Concurrencia)
● CU23: Reprogramar Cita Médica
● CU24: Cancelar Cita Médica con Justificación
● CU25: Controlar Asistencia y Máquina de Estados
● CU26: Consultar Agenda Médica Diaria
● CU27: Generar Reporte de Citas por Período
● CU28: Generar Reporte de Atenciones por Médico y Especialidad
● CU29: Generar Reporte de Control de Asistencia
● CU30: Exportar Reportes Administrativos (PDF / CSV)
4.3 DETALLAR CADA CASO DE USO DEL CICLO 1 Cuadro 1: CU01 - Iniciar Sesión en la Plataforma Web
Elemento
Descripción Técnica
Nombre del Caso de Uso
CU01: Iniciar Sesión en la Plataforma Web.
Actores Principales
Administrador, Recepcionista, Médico.
Actor Secundario
Sistema / Seguridad.
Propósito
Autenticar las credenciales del personal para conceder acceso seguro a la plataforma web según su rol.
Precondiciones
El usuario debe estar registrado previamente y su cuenta debe estar en estado Activo.
Flujo Normal
1. El usuario accede a la vista de inicio de sesión.
2. El sistema solicita el correo electrónico/nombre de usuario y la contraseña.
3. El usuario ingresa las credenciales y presiona “Iniciar sesión”.
4. El Backend en PHP captura la contraseña y verifica el hash almacenado en PostgreSQL mediante password_verify().
5. Al coincidir las credenciales, el sistema valida la cuenta y genera las variables de sesión ($_SESSION).
6. El sistema redirige al panel principal correspondiente según el rol (Administrador, Recepcionista o Médico).
7. El sistema dispara el registro del evento de ingreso en la bitácora de auditoría (CU10).
Flujos Alternativos
1. A1. Credenciales Inválidas: Si la contraseña o el correo son incorrectos, el sistema deniega el acceso, muestra un mensaje de error y suma un intento fallido.
2. A2. Bloqueo por Intentos Fallidos (CU04): Al acumular 3 intentos fallidos consecutivos, el sistema bloquea temporalmente la cuenta.
3. A3. Cuenta Suspendida: Si la cuenta está en estado inactivo, el sistema impide el ingreso notificando que consulte con el Administrador.
Postcondiciones
Se establece una sesión HTTP segura y activa en el navegador web del usuario.
Cuadro 2: CU02 - Cerrar Sesión y Revocar Sesión Elemento Descripción Técnica
Nombre del Caso de Uso
CU02: Cerrar Sesión y Revocar Sesión.
Actores Principales
Administrador, Recepcionista, Médico.
Actor Secundario
Sistema / Seguridad.
Propósito
Destruir la sesión activa en el servidor para evitar accesos no autorizados en equipos compartidos.
Precondiciones
El usuario debe poseer una sesión válida iniciada en el navegador.
Flujo Normal
1. El usuario selecciona la opción “Cerrar Sesión” en la barra de navegación.
2. El servidor PHP ejecuta session_unset() y session_destroy(), revocando los datos de $_SESSION.
3. El sistema registra el evento de salida en la bitácora (CU10).
4. El sistema redirige automáticamente al formulario de inicio de sesión.
Flujos Alternativos
1. A1. Expiración Automática por Inactividad: Si transcurre el tiempo límite sin actividad, el sistema destruye la sesión y redirige al login.
Postcondiciones
El acceso a las rutas protegidas del sistema queda completamente bloqueado.
Cuadro 3: CU03 - Recuperar / Restablecer Contraseña Olvidada Elemento Descripción Técnica
Nombre del Caso de Uso
CU03: Recuperar / Restablecer Contraseña Olvidada.
Actores Principales
Administrador, Recepcionista, Médico.
Actor Secundario
Sistema / Seguridad.
Propósito
Permitir que un usuario restablezca su contraseña tras olvidar sus credenciales de acceso.
Precondiciones
La cuenta debe existir y estar registrada en el sistema.
Flujo Normal
1. El usuario presiona el enlace “¿Olvidaste tu contraseña?” en el login.
2. El sistema solicita la Cédula de Identidad (CI) o correo electrónico asociado.
3. El usuario ingresa la información y envía la solicitud.
4. El sistema valida la existencia de la cuenta y genera un código de verificación temporal.
5. El usuario ingresa el código de verificación e introduce una nueva contraseña.
6. El sistema aplica el hash seguro password_hash() a la nueva contraseña y actualiza PostgreSQL.
Flujos Alternativos
1. A1. Usuario no Encontrado: Si el CI/correo no coincide con ningún registro, el sistema finaliza el flujo sin revelar datos de la base de datos.
Postcondiciones
La contraseña queda actualizada de forma segura en la base de datos.
Cuadro 4: CU04 - Bloqueo Automático por Intentos Fallidos Elemento Descripción Técnica
Nombre del Caso de Uso
CU04: Bloqueo Automático por Intentos Fallidos.
Actor Principal
Sistema / Actor Automático (Backend PHP).
Actor Secundario
Administrador.
Propósito
Mitigar ataques de fuerza bruta restringiendo temporalmente el acceso tras múltiples intentos fallidos de autenticación.
Precondiciones
Un usuario o atacante intenta iniciar sesión en la plataforma (CU01).
Flujo Normal
1. El sistema contabiliza cada intento fallido de contraseña en el servidor.
2. Al llegar a 3 intentos fallidos consecutivos, el sistema cambia temporalmente el estado de la cuenta a “Bloqueado”.
3. El sistema despliega un mensaje notificando: “Cuenta bloqueada por 1 minuto debido a 3 intentos fallidos”.
4. El sistema registra la alerta de seguridad en la bitácora de auditoría (CU10).
Flujos Alternativos
1. A1. Éxito antes del Límite: Si las credenciales son correctas antes del tercer intento, el contador se reinicia a cero.
Postcondiciones
La cuenta permanece inhabilitada para el inicio de sesión hasta cumplir el tiempo de restricción.
Cuadro 5: CU05 - Registrar Nuevo Usuario del Sistema Elemento Descripción Técnica
Nombre del Caso de Uso
CU05: Registrar Nuevo Usuario del Sistema.
Actor Principal
Administrador.
Actor Secundario
Sistema / Seguridad.
Propósito
Registrar al personal de la clínica asignándoles sus credenciales iniciales y su rol operativo.
Precondiciones
El Administrador debe tener una sesión activa con permisos sobre el módulo de usuarios.
Flujo Normal
1. El Administrador accede a “Gestión de Usuarios” y presiona “Crear Usuario”.
2. El sistema muestra el formulario solicitando: Cédula de Identidad (CI), Nombre Completo, Correo electrónico, Teléfono, Rol (Administrador, Recepcionista, Médico) y Contraseña asignada.
3. El Administrador ingresa los datos y confirma el registro.
4. El sistema valida que el CI y correo no existan previamente en PostgreSQL, aplica password_hash() a la clave e inserta el usuario en estado Activo.
El sistema notifica la creación exitosa y registra el evento en la bitácora (CU10).
Flujos Alternativos
1. A1. CI o Correo Duplicado: Si el dato ya existe, el sistema rechaza el guardado y emite un mensaje de alerta.
Postcondiciones
El usuario queda habilitado para iniciar sesión en el sistema con su rol correspondiente.
Cuadro 6: CU06 - Consultar Catálogo y Perfil de Usuarios Elemento Descripción Técnica
Nombre del Caso de Uso
CU06: Consultar Catálogo y Perfil de Usuarios.
Actor Principal
Administrador.
Propósito
Visualizar la lista general de usuarios registrados, auditar sus datos de contacto y consultar sus roles asociados.
Precondiciones
Sesión activa con rol de Administrador.
Flujo Normal
1. El Administrador ingresa al módulo de “Gestión de Usuarios”.
2. El sistema realiza una consulta SELECT a PostgreSQL y despliega la tabla con: CI, Nombre, Correo, Teléfono, Rol y Estado.
3. El Administrador puede aplicar filtros por rol (Administrador, Recepcionista, Médico) o buscar por CI/Nombre.
Postcondiciones
Se presenta en pantalla la lista actualizada del personal.
Cuadro 7: CU07 - Modificar Datos de Cuenta de Usuario Elemento Descripción Técnica
Nombre del Caso de Uso
CU07: Modificar Datos de Cuenta de Usuario.
Actores Principales
Administrador, Usuario (propia cuenta).
Propósito
Permitir la actualización de los datos personales (nombre, teléfono, correo) o cambio de clave del usuario.
Precondiciones
El usuario debe tener sesión activa en la plataforma.
Flujo Normal
1. El usuario accede a “Editar Perfil” o el Administrador selecciona un usuario del catálogo.
2. El sistema despliega el formulario con los datos editables actuales.
3. El usuario modifica los campos deseados y presiona “Guardar Cambios”.
4. El servidor valida la información, actualiza PostgreSQL y emite un mensaje de é
Postcondiciones
Los datos del usuario quedan actualizados en la base de datos.
Cuadro 8: CU08 - Cambiar Rol Operativo y Permisos (RBAC) Elemento Descripción Técnica
Nombre del Caso de Uso
CU08: Cambiar Rol Operativo y Permisos (RBAC).
Actor Principal
Administrador (Superusuario).
Actor Secundario
Sistema / Seguridad.
Propósito
Asignar o modificar el rol de un usuario para reestructurar sus privilegios de acceso a los menús de la clínica.
Precondiciones
Sesión activa de Administrador. El usuario a cambiar debe estar registrado.
Flujo Normal
1. El Administrador accede a la “Matriz de Permisos / Gestión de Roles”.
2. Selecciona un usuario y elige el nuevo Rol (Administrador, Recepcionista, Médico).
3. El Administrador confirma el cambio.
4. El servidor PHP actualiza la clave foránea del rol en PostgreSQL y reconfigura los accesos.
5. El sistema registra el evento de seguridad en la bitácora (CU10).
Postcondiciones
Los nuevos permisos del usuario entran en vigencia inmediatamente en su próxima navegación.
Cuadro 9: CU09 - Suspender / Inactivar Cuenta de Usuario (Baja Lógica) Elemento Descripción Técnica
Nombre del Caso de Uso
CU09: Suspender / Inactivar Cuenta de Usuario (Baja Lógica).
Actor Principal
Administrador.
Actor Secundario
Sistema / Seguridad.
Propósito
Desactivar el acceso de un colaborador a la plataforma mediante borrado lógico (Soft Delete), preservando su historial de auditoría e integridad referencial.
Precondiciones
Sesión activa de Administrador. El usuario a inactivar no debe ser el propio Administrador en uso.
Flujo Normal
1. El Administrador ubica al usuario en el catálogo y selecciona “Inactivar Cuenta”.
2. El sistema solicita confirmación de seguridad.
3. El Administrador confirma la acción.
4. El sistema ejecuta una actualización en PostgreSQL cambiando el campo estado = “Inactivo”.

Postcondiciones
El usuario queda inhabilitado para ingresar al sistema sin borrar sus registros históricos.
Cuadro 10: CU10 - Registrar Acción Automática en Bitácora (Trigger / Middleware) Elemento Descripción Técnica
Nombre del Caso de Uso
CU10: Registrar Acción Automática en Bitácora (Trigger / Middleware).
Actor Principal
Sistema / Middleware (Actor Automático).
Propósito
Registrar automáticamente en PostgreSQL cada operación crítica para garantizar la auditoría y trazabilidad del software.
Precondiciones
Un usuario ejecuta una acción transaccional (Iniciar sesión, crear usuario, modificar datos, cambiar rol).
Flujo Normal
1. Un usuario ejecuta exitosamente un caso de uso dentro de la plataforma.
2. El Middleware en PHP o Trigger en PostgreSQL intercepta la operación[7].
3. El sistema extrae de forma transparente el id_usuario, la marca de tiempo exacta (fecha y hora), la tabla afectada y el tipo_accion (Crear, Modificar, Eliminar, Login).
4. El sistema inserta silenciosamente la tupla en la tabla bitacora.
Postcondiciones
El evento queda almacenado de forma inmutable en el historial de seguridad de la clínica.
Cuadro 11: CU11 - Consultar y Filtrar Bitácora de Auditoría Elemento Descripción Técnica
Nombre del Caso de Uso
CU11: Consultar y Filtrar Bitácora de Auditoría.
Actor Principal
Administrador.
Propósito
Auditar las operaciones realizadas por los empleados y rastrear modificaciones en el sistema.
Precondiciones
Sesión activa de Administrador. Existen registros previos en la tabla bitácora.
Flujo Normal
1. El Administrador ingresa al módulo “Bitácora de Auditoría”.
2. El sistema consulta las entradas y las despliega en una tabla ordenada de forma cronológica inversa.
3. La tabla expone: Fecha/Hora, Usuario responsable, Módulo, Tipo de Acción y Detalle de la operación.
4. El Administrador aplica filtros por Usuario, Módulo, Acción o rango de fechas (Desde / Hasta).
5. El sistema refresca la pantalla mostrando únicamente los registros coincidentes.
Postcondiciones
Se presenta en pantalla la vista consolidada de auditoría para control interno.
