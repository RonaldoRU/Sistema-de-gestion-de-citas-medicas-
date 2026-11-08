# Guía de Diagramas de Secuencia (CU01 - CU43) para Enterprise Architect

Este paquete contiene el script automatizado en **JScript** para generar los diagramas de secuencia de los **43 Casos de Uso** del sistema de la **Clínica Vida Salud** dentro de **Enterprise Architect (Sparx Systems EA)**.

---

## 1. Catálogo Completo de los 43 Casos de Uso

| N° | Código | Nombre del Caso de Uso | Paquete / Módulo |
|:---:|:---:|:---|:---|
| 1 | **CU01** | Iniciar Sesión en la Plataforma Web | Seguridad y Autenticación |
| 2 | **CU02** | Auto-Registro de Cuenta de Paciente Web | Seguridad y Autenticación |
| 3 | **CU03** | Cerrar Sesión y Revocar Sesión | Seguridad y Autenticación |
| 4 | **CU04** | Recuperar / Restablecer Contraseña Olvidada | Seguridad y Autenticación |
| 5 | **CU05** | Bloqueo Automático por Intentos Fallidos | Seguridad y Autenticación |
| 6 | **CU06** | Registrar Nuevo Usuario del Sistema | Administración de Usuarios y Roles (RBAC) |
| 7 | **CU07** | Consultar Catálogo y Perfil de Usuarios | Administración de Usuarios y Roles (RBAC) |
| 8 | **CU08** | Modificar Datos de Cuenta de Usuario | Administración de Usuarios y Roles (RBAC) |
| 9 | **CU09** | Cambiar Rol Operativo y Permisos (RBAC) | Administración de Usuarios y Roles (RBAC) |
| 10 | **CU10** | Suspender / Inactivar Cuenta de Usuario (Baja Lógica) | Administración de Usuarios y Roles (RBAC) |
| 11 | **CU11** | Registrar Acción Automática en Bitácora | Auditoría, Trazabilidad y Bitácora |
| 12 | **CU12** | Consultar y Filtrar Bitácora de Auditoría | Auditoría, Trazabilidad y Bitácora |
| 13 | **CU13** | Registrar Paciente Presencial (en Recepción) | Gestión de Pacientes |
| 14 | **CU14** | Registrar e Información Médica Básica | Gestión de Pacientes |
| 15 | **CU15** | Registrar y Gestionar Contacto de Emergencia | Gestión de Pacientes |
| 16 | **CU16** | Buscar y Modificar Datos de Paciente | Gestión de Pacientes |
| 17 | **CU17** | Consultar Historial Clínico y de Citas del Paciente | Gestión de Pacientes |
| 18 | **CU18** | Desactivar Registro de Paciente (Baja Lógica) | Gestión de Pacientes |
| 19 | **CU19** | Gestionar Catálogo de Especialidades Médicas | Gestión Médica y Horarios |
| 20 | **CU20** | Registrar y Administrar Personal Médico | Gestión Médica y Horarios |
| 21 | **CU21** | Configurar Horarios y Bloques de Disponibilidad | Gestión Médica y Horarios |
| 22 | **CU22** | Desactivar Registro de Médico (Baja Lógica) | Gestión Médica y Horarios |
| 23 | **CU23** | Bloquear Agenda Médica por Feriados / Licencias | Gestión Médica y Horarios |
| 24 | **CU24** | Consultar Disponibilidad Horaria (Web / Presencial) | Gestión de Citas Médicas |
| 25 | **CU25** | Solicitar y Reservar Ficha / Cita Médica Web | Gestión de Citas Médicas |
| 26 | **CU26** | Programar y Registrar Cita Médica en Recepción | Gestión de Citas Médicas |
| 27 | **CU27** | Prevenir Citas Duplicadas (Control Concurrencia) | Gestión de Citas Médicas |
| 28 | **CU28** | Reprogramar Cita Médica | Gestión de Citas Médicas |
| 29 | **CU29** | Cancelar Cita Médica con Justificación | Gestión de Citas Médicas |
| 30 | **CU30** | Emitir Recordatorio / Notificación de Cita | Gestión de Citas Médicas |
| 31 | **CU31** | Controlar Asistencia y Máquina de Estados | Gestión de Citas Médicas |
| 32 | **CU32** | Consultar Agenda Médica Diaria | Gestión de Citas Médicas |
| 33 | **CU33** | Registrar Atención Médica Concluida (Marcar Atendida) | Gestión de Citas Médicas |
| 34 | **CU34** | Procesar Pago en Línea de Ficha / Cita | Pasarela de Pagos y Transacciones |
| 35 | **CU35** | Confirmar Transacción y Generar Comprobante Digital | Pasarela de Pagos y Transacciones |
| 36 | **CU36** | Consultar Historial de Pagos y Transacciones | Pasarela de Pagos y Transacciones |
| 37 | **CU37** | Gestionar Reembolso / Anulación de Pago por Cancelación | Pasarela de Pagos y Transacciones |
| 38 | **CU38** | Generar Reporte de Citas por Período | Reportes Administrativos y Financieros |
| 39 | **CU39** | Generar Reporte de Atenciones por Médico y Especialidad | Reportes Administrativos y Financieros |
| 40 | **CU40** | Generar Reporte de Control de Asistencia e Inasistencias | Reportes Administrativos y Financieros |
| 41 | **CU41** | Generar Reporte de Ingresos por Pasarela de Pagos y Cajas | Reportes Administrativos y Financieros |
| 42 | **CU42** | Generar Reporte de Padrón General de Pacientes | Reportes Administrativos y Financieros |
| 43 | **CU43** | Exportar Reportes Administrativos (PDF / CSV) | Reportes Administrativos y Financieros |

---

## 2. Estructura de las Líneas de Vida en Cada Diagrama

Cada diagrama de secuencia modela el flujo real de la aplicación a través de 5 capas:

```
[ Actor ]  ───>  [ Boundary (UI/JS) ]  ───>  [ Control (API REST) ]  ───>  [ Entity / Service ]  ───>  [ PostgreSQL DB ]
```

1. **Actor:** Paciente, Recepcionista, Médico, Administrador o Servicio Programado (Cron).
2. **Boundary (`<<boundary>>`):** Interfaz Web (HTML5/CSS3/JavaScript), componentes modales y vistas.
3. **Control (`<<control>>`):** Controladores HTTP REST de Laravel / PHP y Middleware.
4. **Entity / Service (`<<entity>>`):** Servicios de Dominio, Generadores de Código/PDF y Máquina de Estados.
5. **Database (`<<database>>`):** Motor PostgreSQL (`Clinica_Vida_Salud`) y Procedimientos Almacenados / Vistas.

---

## 3. Instrucciones de Ejecución en Enterprise Architect

1. Abre tu proyecto en **Enterprise Architect** (`.qea`, `.eapx` o `.feap`).
2. En la ventana **Project Browser**, haz clic sobre el paquete donde deseas crear los diagramas (por ejemplo: `Model` o el paquete de tu sistema).
3. En la barra superior de EA, dirígete a:
   - **En EA v15 / v16 / v17:** Pestaña **Specialize** -> **Tools** -> **Scripting**.
   - **En EA v14 o inferior:** Menú **Tools** -> **Scripting**.
4. En el panel de **Scripting**:
   - En la carpeta **Scripts** (o el grupo de tu preferencia), haz clic derecho -> **New JScript**.
   - Asigna un nombre al script (por ejemplo: `Generar_43_Diagramas_Secuencia_VidaSalud`).
5. Abre el nuevo script en el editor de EA, borra el contenido por defecto y **pega todo el código de [Generar_43_Diagramas_Secuencia_EA.js](file:///c:/xampp/htdocs/Examen2/citamedicaclinicavidasalud/citamedicaclinicavidasalud/Docs/EnterpriseArchitect/Generar_43_Diagramas_Secuencia_EA.js)**.
6. Haz clic en el botón **Run** (ícono de triángulo verde / Play o presiona `F5`).
7. El script creará automáticamente el paquete raíz `Diagramas de Secuencia (CU01 - CU43) - Clínica Vida Salud`, organizado en los 8 submódulos, con los 43 diagramas, sus 5 lifelines y todas las llamadas secuenciales numeradas.
