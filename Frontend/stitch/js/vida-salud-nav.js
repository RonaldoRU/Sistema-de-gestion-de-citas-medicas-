/* =====================================================================
   Vida Salud — navegación compartida
   Un solo lugar define los paquetes (P1–P7) y los casos de uso que cuelgan
   de cada uno. Cada pantalla declara su CU activo con <body data-cu="CU05">.
   En Laravel esta estructura pasa a ser un partial Blade (@foreach).
   ===================================================================== */
(function () {
  'use strict';

  var NAV = {
    home: { label: 'Inicio', href: 'inicio.html', icon: 'home' },
    packages: [
      {
        id: 'P1',
        name: 'Seguridad y Autenticación',
        short: 'Seguridad',
        icon: 'shield',
        items: [
          { cu: 'CU01', label: 'Iniciar sesión', href: 'P1 Seguridad y Autenticación/cu01-iniciar-sesion.html', title: 'Iniciar Sesión en la Plataforma Web', ext: true },
          { cu: 'CU02', label: 'Cerrar sesión', action: 'logout', title: 'Cerrar Sesión y Revocar Sesión', danger: true },
          { cu: 'CU03', label: 'Recuperar contraseña', href: 'P1 Seguridad y Autenticación/cu03-recuperar-contrasena.html', title: 'Recuperar / Restablecer Contraseña Olvidada', ext: true },
          { cu: 'CU04', label: 'Bloqueo por intentos', href: 'P1 Seguridad y Autenticación/cu04-bloqueo-intentos.html', title: 'Bloqueo Automático por Intentos Fallidos' }
        ]
      },
      {
        id: 'P2',
        name: 'Administración de Usuarios y Permisos',
        short: 'Usuarios y permisos',
        icon: 'users',
        items: [
          { cu: 'CU05', label: 'Registrar usuario', href: 'P2 Administración de Usuarios y Permisos/cu05-registrar-usuario.html', title: 'Registrar Nuevo Usuario del Sistema' },
          { cu: 'CU06', label: 'Catálogo de usuarios', href: 'P2 Administración de Usuarios y Permisos/cu06-catalogo-usuarios.html', title: 'Consultar Catálogo y Perfil de Usuarios' },
          { cu: 'CU07', label: 'Modificar cuenta', href: 'P2 Administración de Usuarios y Permisos/cu07-modificar-cuenta.html', title: 'Modificar Datos de Cuenta de Usuario' },
          { cu: 'CU08', label: 'Roles y permisos (RBAC)', href: 'P2 Administración de Usuarios y Permisos/cu08-roles-permisos.html', title: 'Cambiar Rol Operativo y Permisos (RBAC)' },
          { cu: 'CU09', label: 'Suspender cuenta', href: 'P2 Administración de Usuarios y Permisos/cu09-suspender-cuenta.html', title: 'Suspender / Inactivar Cuenta de Usuario (Baja Lógica)' }
        ]
      },
      {
        id: 'P3',
        name: 'Auditoría, Trazabilidad y Bitácora',
        short: 'Auditoría',
        icon: 'book',
        items: [
          { cu: 'CU10', label: 'Registro automático', href: 'P3 Auditoría, Trazabilidad y Bitácora/cu10-registro-automatico.html', title: 'Registrar Acción Automática en Bitácora (Trigger / Middleware)' },
          { cu: 'CU11', label: 'Consultar bitácora', href: 'P3 Auditoría, Trazabilidad y Bitácora/cu11-bitacora.html', title: 'Consultar y Filtrar Bitácora de Auditoría' }
        ]
      },
      {
        id: 'P4',
        name: 'Gestión de Pacientes',
        short: 'Pacientes',
        icon: 'heart',
        items: [
          { cu: 'CU12', label: 'Registrar paciente', href: 'P4 Gestión de Pacientes/cu12-registrar-paciente.html', title: 'Registrar Paciente' },
          { cu: 'CU13', label: 'Información médica', href: 'P4 Gestión de Pacientes/cu13-informacion-medica.html', title: 'Registrar y Gestionar Información Médica Básica del Paciente' },
          { cu: 'CU14', label: 'Contacto de emergencia', href: 'P4 Gestión de Pacientes/cu14-contacto-emergencia.html', title: 'Registrar y Gestionar Contacto de Emergencia' },
          { cu: 'CU15', label: 'Buscar y modificar', href: 'P4 Gestión de Pacientes/cu15-buscar-paciente.html', title: 'Buscar y Modificar Datos de Paciente' },
          { cu: 'CU16', label: 'Historial de citas', href: 'P4 Gestión de Pacientes/cu16-historial-citas.html', title: 'Consultar Historial de Citas del Paciente' },
          { cu: 'CU17', label: 'Desactivar paciente', href: 'P4 Gestión de Pacientes/cu17-desactivar-paciente.html', title: 'Desactivar Registro de Paciente (Baja Lógica)' }
        ]
      },
      {
        id: 'P5',
        name: 'Gestión Médica y Horarios',
        short: 'Médicos y horarios',
        icon: 'stethoscope',
        items: [
          { cu: 'CU18', label: 'Especialidades', href: 'P5 Gestión Médica y Horarios/cu18-especialidades.html', title: 'Gestionar Catálogo de Especialidades Médicas' },
          { cu: 'CU19', label: 'Personal médico', href: 'P5 Gestión Médica y Horarios/cu19-personal-medico.html', title: 'Registrar y Administrar Personal Médico' },
          { cu: 'CU20', label: 'Horarios y bloques', href: 'P5 Gestión Médica y Horarios/cu20-horarios.html', title: 'Configurar Horarios y Bloques de Disponibilidad' },
          { cu: 'CU21', label: 'Desactivar médico', href: 'P5 Gestión Médica y Horarios/cu21-desactivar-medico.html', title: 'Desactivar Registro de Médico (Baja Lógica)' }
        ]
      },
      {
        id: 'P6',
        name: 'Gestión de Citas Médicas',
        short: 'Citas',
        icon: 'calendar',
        items: [
          { cu: 'CU22', label: 'Disponibilidad horaria', href: 'P6 Gestión de Citas Médicas/cu22-disponibilidad.html', title: 'Consultar Disponibilidad Horaria' },
          { cu: 'CU23', label: 'Bloquear agenda', href: 'P6 Gestión de Citas Médicas/cu23-bloquear-agenda.html', title: 'Bloquear Agenda Médica por Feriados / Licencias' },
          { cu: 'CU24', label: 'Programar cita', href: 'P6 Gestión de Citas Médicas/cu24-programar-cita.html', title: 'Programar y Registrar Cita Médica' },
          { cu: 'CU25', label: 'Control de concurrencia', href: 'P6 Gestión de Citas Médicas/cu25-concurrencia.html', title: 'Prevenir Citas Duplicadas (Control de Concurrencia)' },
          { cu: 'CU26', label: 'Reprogramar cita', href: 'P6 Gestión de Citas Médicas/cu26-reprogramar-cita.html', title: 'Reprogramar Cita Médica' },
          { cu: 'CU27', label: 'Cancelar cita', href: 'P6 Gestión de Citas Médicas/cu27-cancelar-cita.html', title: 'Cancelar Cita Médica con Justificación' },
          { cu: 'CU28', label: 'Recordatorios', href: 'P6 Gestión de Citas Médicas/cu28-recordatorios.html', title: 'Emitir Recordatorio / Notificación de Cita Programada' },
          { cu: 'CU29', label: 'Asistencia y estados', href: 'P6 Gestión de Citas Médicas/cu29-asistencia-estados.html', title: 'Controlar Asistencia y Máquina de Estados' },
          { cu: 'CU30', label: 'Agenda diaria', href: 'P6 Gestión de Citas Médicas/cu30-agenda-diaria.html', title: 'Consultar Agenda Médica Diaria' },
          { cu: 'CU31', label: 'Marcar atendida', href: 'P6 Gestión de Citas Médicas/cu31-marcar-atendida.html', title: 'Registrar Atención Médica Concluida (Marcar como Atendida)' }
        ]
      },
      {
        id: 'P7',
        name: 'Reportes Administrativos',
        short: 'Reportes',
        icon: 'chart',
        items: [
          { cu: 'CU32', label: 'Citas por período', href: 'P7 Reportes Administrativos/cu32-reporte-citas-periodo.html', title: 'Generar Reporte de Citas por Período' },
          { cu: 'CU33', label: 'Atenciones por médico', href: 'P7 Reportes Administrativos/cu33-reporte-atenciones.html', title: 'Generar Reporte de Atenciones por Médico y Especialidad' },
          { cu: 'CU34', label: 'Control de asistencia', href: 'P7 Reportes Administrativos/cu34-reporte-asistencia.html', title: 'Generar Reporte de Control de Asistencia' },
          { cu: 'CU35', label: 'Exportar PDF / CSV', href: 'P7 Reportes Administrativos/cu35-exportar-reportes.html', title: 'Exportar Reportes Administrativos (PDF / CSV)' },
          { cu: 'CU36', label: 'Padrón de pacientes', href: 'P7 Reportes Administrativos/cu36-reporte-padron.html', title: 'Generar Reporte de Padrón General de Pacientes Registrados' }
        ]
      }
    ]
  };

  window.VS_NAV = NAV;

  /* ---------- Sprite de iconos (trazo 1.8, 24x24) ---------- */
  var ICONS = {
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7 7 9 4-2 7-4.5 7-9V6z"/><path d="m9.5 12 1.8 1.8L15 10"/>',
    users: '<path d="M16 20v-1.2A3.8 3.8 0 0 0 12.2 15H7.8A3.8 3.8 0 0 0 4 18.8V20"/><circle cx="10" cy="8" r="3"/><path d="M20 20v-1.1a3.2 3.2 0 0 0-2.4-3.1M16.2 5.1a3 3 0 0 1 0 5.5"/>',
    book: '<path d="M8 4h8a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9 4.5h6v2.2H9zM10 12h6M10 16h4"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M5.5 12h3l1.5-2.5 2 5 1.5-2.5h4"/>',
    stethoscope: '<path d="M6 4v5a4 4 0 0 0 8 0V4"/><path d="M10 13v2a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="12" r="2"/><path d="M5 4h2M13 4h2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
    chart: '<path d="M4 20h16"/><path d="M6 16v-5M11 16V7M16 16v-3"/>',
    logout: '<path d="M10 7V5a2 2 0 0 1 2-2h6v18h-6a2 2 0 0 1-2-2v-2"/><path d="M15 12H4m0 0 3-3M4 12l3 3"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    'chevron-left': '<path d="m15 6-6 6 6 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16z"/><path d="m13 7 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
    ban: '<circle cx="12" cy="12" r="8"/><path d="m6.3 6.3 11.4 11.4"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5.5"/>',
    alert: '<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    'lock-open': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    download: '<path d="M12 4v11m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>',
    file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
    'file-text': '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/>',
    filter: '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 13a8 8 0 0 0 14.5 4"/><path d="M20 4v7h-7M4 20v-7h7"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    'user-plus': '<circle cx="10" cy="8" r="3.5"/><path d="M3 20a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    'arrow-right': '<path d="M4 12h16m0 0-6-6m6 6-6 6"/>',
    'arrow-left': '<path d="M20 12H4m0 0 6-6m-6 6 6 6"/>',
    printer: '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="m11 11 9-9M15 7l2 2M18 4l2 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    'id-card': '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16a3 3 0 0 1 6 0M14 10h4M14 14h4"/>',
    activity: '<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    git: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M6 8.5v7M8.5 6h5a3 3 0 0 1 3 3v6.5"/>',
    'map-pin': '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    'calendar-x': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m10 14 4 4m0-4-4 4"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    pulse: '<path d="M3 12h3l3-7 4 14 3-7h5"/>',
    pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><path d="m8.5 8.5 7 7"/>',
    droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    'file-csv': '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9 14h2M13 14h2M9 17h2M13 17h2"/>',
    'file-pdf': '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 17v-5h1.5a1.5 1.5 0 0 1 0 3H10"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    pin: '<path d="M12 17v4M8 7h8l-1 6h-6z"/><path d="M9 3h6v4H9z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    'log-in': '<path d="M14 7V5a2 2 0 0 0-2-2H6v18h6a2 2 0 0 0 2-2v-2"/><path d="M9 12h11m0 0-3-3m3 3-3 3"/>',
    'alert-octagon': '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16h.01"/>',
    hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>'
  };

  function injectSprite() {
    if (document.getElementById('vs-sprite')) return;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'vs-sprite');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    var html = '';
    Object.keys(ICONS).forEach(function (name) {
      html += '<symbol id="i-' + name + '" viewBox="0 0 24 24">' + ICONS[name] + '</symbol>';
    });
    svg.innerHTML = html;
    document.body.insertBefore(svg, document.body.firstChild);
  }

  function icon(name, cls) {
    return '<svg class="' + (cls || 'vs-i') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  /* ---------- Utilidades ---------- */
  var STORAGE_OPEN = 'vs-open-pkgs';

  function readOpen() {
    try {
      var raw = sessionStorage.getItem(STORAGE_OPEN);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeOpen(list) {
    try {
      sessionStorage.setItem(STORAGE_OPEN, JSON.stringify(list));
    } catch (e) {}
  }

  function findPackageByCu(cu) {
    for (var i = 0; i < NAV.packages.length; i++) {
      var pkg = NAV.packages[i];
      for (var j = 0; j < pkg.items.length; j++) {
        if (pkg.items[j].cu === cu) return { pkg: pkg, item: pkg.items[j] };
      }
    }
    return null;
  }

  window.VS_NAV.find = findPackageByCu;

  /* Las pantallas de un paquete viven un nivel más abajo que inicio.html. */
  function pagePrefix() {
    var path = (location.pathname || '').replace(/\\/g, '/');
    var marker = '/html/';
    var i = path.toLowerCase().lastIndexOf(marker);
    if (i < 0) return '';
    return path.slice(i + marker.length).indexOf('/') === -1 ? '' : '../';
  }

  /* ---------- Render del sidebar ---------- */
  function renderSidebar(sidebar) {
    var activeCu = (document.body.getAttribute('data-cu') || '').toUpperCase();
    var isHome = document.body.getAttribute('data-page') === 'inicio';
    var found = findPackageByCu(activeCu);
    var openList = readOpen();
    var openSet = {};
    if (openList) {
      openList.forEach(function (id) { openSet[id] = true; });
    }
    if (found) openSet[found.pkg.id] = true;

    var html = '';
    html += '<div class="vs-rail-scroll">';
    html += '  <div class="vs-brand">';
    html += '    <a class="vs-brand-row" href="' + pagePrefix() + NAV.home.href + '">';
    html += '      <span class="vs-mark" aria-hidden="true">VS</span>';
    html += '      <span class="vs-brand-text"><span class="vs-brand-name">Vida Salud</span><span class="vs-brand-sub">Gestión de citas médicas</span></span>';
    html += '    </a>';
    html += '    <button type="button" id="sidebar-close" class="vs-rail-close" aria-label="Cerrar menú">' + icon('close') + '</button>';
    html += '  </div>';
    html += '  <nav class="vs-nav" aria-label="Módulos del sistema">';
    html += '    <a href="' + pagePrefix() + NAV.home.href + '" class="vs-rail-link' + (isHome ? ' is-active' : '') + '" title="Inicio"' + (isHome ? ' aria-current="page"' : '') + '>' + icon('home', 'vs-i vs-rail-icon') + '<span class="vs-rail-label">Inicio</span></a>';
    html += '    <p class="vs-rail-section">Paquetes del sistema</p>';

    NAV.packages.forEach(function (pkg) {
      var hasActive = found && found.pkg.id === pkg.id;
      var isOpen = !!openSet[pkg.id];
      var listId = 'pkg-' + pkg.id.toLowerCase();
      html += '<section class="vs-pkg' + (isOpen ? ' is-open' : '') + (hasActive ? ' has-active' : '') + '" data-pkg="' + pkg.id + '">';
      html += '  <button type="button" class="vs-pkg__head" aria-expanded="' + (isOpen ? 'true' : 'false') + '" aria-controls="' + listId + '" title="' + pkg.id + ' · ' + pkg.name + '">';
      html += '    <span class="vs-pkg__tile">' + icon(pkg.icon) + '</span>';
      html += '    <span class="vs-pkg__name">' + pkg.name + '</span>';
      html += '    <span class="vs-pkg__count" aria-label="' + pkg.items.length + ' casos de uso">' + pkg.items.length + '</span>';
      html += icon('chevron', 'vs-i vs-pkg__chev');
      html += '  </button>';
      html += '  <div class="vs-pkg__body"><ul class="vs-pkg__list" id="' + listId + '">';
      pkg.items.forEach(function (it) {
        var isActive = it.cu === activeCu;
        var cls = 'vs-cu' + (isActive ? ' is-active' : '') + (it.danger ? ' vs-cu--danger' : '');
        var inner = '<span class="vs-cu__code">' + it.cu + '</span><span class="vs-cu__label">' + it.label + '</span>' + (it.ext ? icon('log-in', 'vs-i vs-cu__ext') : '');
        if (it.action === 'logout') {
          html += '<li><button type="button" class="' + cls + '" data-logout title="' + it.title + '">' + inner + '</button></li>';
        } else {
          html += '<li><a href="' + pagePrefix() + it.href + '" class="' + cls + '" title="' + it.title + '"' + (isActive ? ' aria-current="page"' : '') + '>' + inner + '</a></li>';
        }
      });
      html += '  </ul></div>';
      html += '</section>';
    });

    html += '  </nav>';
    html += '</div>';
    html += '<div class="vs-rail-foot">';
    html += '  <p class="vs-rail-meta">Atención en recepción<br><strong>Lun–Sáb · 08:00–18:00</strong></p>';
    html += '  <button type="button" class="vs-logout-btn" data-logout title="Cerrar sesión (CU02)">' + icon('logout', 'vs-i vs-rail-icon') + '<span class="vs-rail-label">Cerrar sesión</span></button>';
    html += '</div>';

    sidebar.innerHTML = html;

    /* Acordeón */
    sidebar.querySelectorAll('.vs-pkg__head').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pkg = btn.parentElement;
        if (sidebar.classList.contains('is-collapsed') && window.matchMedia('(min-width: 1024px)').matches) {
          sidebar.classList.remove('is-collapsed');
          try { sessionStorage.setItem('vs-sidebar-collapsed', '0'); } catch (e) {}
          pkg.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        } else {
          var open = pkg.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        var ids = [];
        sidebar.querySelectorAll('.vs-pkg.is-open').forEach(function (p) { ids.push(p.getAttribute('data-pkg')); });
        writeOpen(ids);
      });
    });

    /* Desplaza el CU activo a la vista */
    var active = sidebar.querySelector('.vs-cu.is-active');
    if (active && active.scrollIntoView) {
      try { active.scrollIntoView({ block: 'center' }); } catch (e) {}
    }

    /* Miga de pan del topbar */
    var crumb = document.querySelector('[data-nav-crumb]');
    if (crumb) {
      if (found) {
        crumb.innerHTML = icon(found.pkg.icon, 'vs-i vs-i--sm') + '<span class="vs-truncate">' + found.pkg.name + '</span>';
      } else if (isHome) {
        crumb.innerHTML = '<span class="vs-truncate">Panel general</span>';
      }
    }
  }

  /* ---------- Diálogo de cierre de sesión (CU02) y toast ---------- */
  function injectToast() {
    if (document.getElementById('vs-toast')) return;
    var toast = document.createElement('div');
    toast.id = 'vs-toast';
    toast.className = 'vs-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = '<span class="vs-toast__icon">' + icon('check') + '</span><div><div class="vs-toast__title" data-toast-title></div><div class="vs-toast__sub" data-toast-sub></div></div>';
    document.body.appendChild(toast);
  }

  function injectLogoutDialog() {
    if (!document.getElementById('vs-logout-dialog')) {
      var dlg = document.createElement('dialog');
      dlg.id = 'vs-logout-dialog';
      dlg.className = 'vs-modal';
      dlg.innerHTML =
        '<div class="vs-modal__head">' +
        '  <span class="vs-modal__icon vs-modal__icon--danger">' + icon('logout') + '</span>' +
        '  <div><h2 class="vs-modal__title">¿Cerrar la sesión?</h2>' +
        '  <p class="vs-modal__text">Se destruirá la sesión en el servidor (<span class="vs-code vs-code--plain">session_destroy()</span>) y el acceso a las rutas protegidas quedará revocado. El evento se registra en la bitácora.</p></div>' +
        '</div>' +
        '<div class="vs-modal__foot">' +
        '  <button type="button" class="vs-btn vs-btn--ghost" data-close-dialog>Seguir trabajando</button>' +
        '  <a href="' + pagePrefix() + 'P1 Seguridad y Autenticación/cu02-sesion-cerrada.html" class="vs-btn vs-btn--danger">' + icon('logout') + 'Cerrar sesión</a>' +
        '</div>';
      document.body.appendChild(dlg);
    }
  }

  /* ---------- Arranque ---------- */
  injectSprite();
  injectToast();
  var sidebar = document.getElementById('app-sidebar');
  if (sidebar) {
    renderSidebar(sidebar);
    injectLogoutDialog();
  }
})();
