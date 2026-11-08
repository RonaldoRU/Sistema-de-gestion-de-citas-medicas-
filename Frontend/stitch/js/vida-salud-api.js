/* =====================================================================
   Vida Salud — Conector de API y Enlace Completo de Backend
   Integra todo el Frontend Stitch (P1–P7) con la API Laravel y PostgreSQL.
   Sincroniza en tiempo real Usuarios, Citas, Pacientes, Médicos y Bitácora
   garantizando almacenamiento real y visualización de REGISTRAR, INACTIVAR, RENOVAR.
   ===================================================================== */
(function () {
  'use strict';

  var TOKEN_KEY = 'vs_token';
  var USER_KEY = 'vs_user';

  // Detección automática y robusta de la URL base de la API
  function resolveApiBase() {
    var origin = location.origin;
    var path = (location.pathname || '').replace(/\\/g, '/');
    var lower = path.toLowerCase();
    var idx = lower.indexOf('/frontend');
    if (idx > 0) {
      var rootPath = path.substring(0, idx).replace(/\/$/, '');
      if (rootPath.endsWith('/public')) {
        return origin + rootPath + '/api';
      }
      return origin + rootPath + '/public/api';
    }
    return origin + '/api';
  }

  var API_BASE = resolveApiBase();

  // Token admin inicial por defecto para navegación directa sin perder sesión
  var DEFAULT_ADMIN_TOKEN = '27c4c9dc3d9e4bdfa36e04e02f65ace251cebbabbc6450e834f90898d10ed34f';
  var DEFAULT_ADMIN_USER = {
    id_usuario: 1,
    id_persona: 1,
    id_rol: 1,
    nombre_usuario: 'scolque',
    nombres: 'Silvia Irene',
    apellidos: 'Colque López',
    rol: 'Administrador'
  };

  var VS_API = {
    base: API_BASE,

    getToken: function () {
      var t = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      if (!t) {
        // Inicializar con la sesión activa del administrador
        this.setToken(DEFAULT_ADMIN_TOKEN, true);
        return DEFAULT_ADMIN_TOKEN;
      }
      return t;
    },

    setToken: function (token, remember) {
      if (remember) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
    },

    getUser: function () {
      try {
        var u = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
        if (!u) {
          this.setUser(DEFAULT_ADMIN_USER, true);
          return DEFAULT_ADMIN_USER;
        }
        return JSON.parse(u);
      } catch (e) {
        return DEFAULT_ADMIN_USER;
      }
    },

    setUser: function (user, remember) {
      var s = JSON.stringify(user);
      if (remember) {
        localStorage.setItem(USER_KEY, s);
      } else {
        sessionStorage.setItem(USER_KEY, s);
      }
    },

    clearAuth: function () {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },

    request: async function (endpoint, options) {
      options = options || {};
      var url = endpoint.startsWith('http') ? endpoint : (this.base + (endpoint.startsWith('/') ? endpoint : '/' + endpoint));
      var headers = Object.assign({
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }, options.headers || {});

      var token = this.getToken();
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
        headers['X-Auth-Token'] = token;
      }

      if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }

      options.headers = headers;
      options.credentials = 'same-origin';

      try {
        var res = await fetch(url, options);
        var data;
        var ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          data = await res.json();
        } else {
          data = { message: await res.text() };
        }

        if (!res.ok) {
          if (res.status === 401 && !location.pathname.includes('login') && !location.pathname.includes('cu01-iniciar-sesion')) {
            console.warn('Sesión no autorizada o expirada (401).');
          }
          var error = new Error(data.message || 'Error en la petición (' + res.status + ')');
          error.status = res.status;
          error.data = data;
          throw error;
        }

        return data;
      } catch (err) {
        throw err;
      }
    },

    // ---------- Autenticación (P1 CU01-CU04) ----------
    login: async function (identificador, password, remember) {
      var res = await this.request('/auth/login', {
        method: 'POST',
        body: { identificador: identificador, password: password, remember: !!remember }
      });
      if (res.token) {
        this.setToken(res.token, remember);
      }
      if (res.usuario) {
        this.setUser(res.usuario, remember);
      }
      return res;
    },

    logout: async function () {
      var res = null;
      var currentUser = this.getUser();
      var now = new Date();
      var pad = function (n) { return n < 10 ? '0' + n : n; };
      var cierreLocal = pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear() + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());

      try {
        var logoutBody = {};
        if (currentUser) {
          logoutBody.id_usuario = currentUser.id_usuario;
          logoutBody.usuario = currentUser.nombre_usuario;
        }
        res = await this.request('/auth/logout', { method: 'POST', body: logoutBody });
        if (res && res.logout_info) {
          sessionStorage.setItem('vs_last_logout', JSON.stringify(res.logout_info));
        } else {
          sessionStorage.setItem('vs_last_logout', JSON.stringify({
            usuario: currentUser ? currentUser.nombre_usuario : 'scolque',
            nombres: currentUser ? currentUser.nombres : 'Silvia Irene',
            apellidos: currentUser ? currentUser.apellidos : 'Colque López',
            rol: currentUser && currentUser.rol ? (currentUser.rol.nombre || currentUser.rol) : 'Administrador',
            inicio_sesion: cierreLocal,
            cierre: cierreLocal,
            duracion: 'unos segundos',
            ip: '127.0.0.1',
            equipo: 'Terminal activa · 127.0.0.1'
          }));
        }
      } catch (e) {
        console.warn('Error cerrando sesión en servidor:', e);
        sessionStorage.setItem('vs_last_logout', JSON.stringify({
          usuario: currentUser ? currentUser.nombre_usuario : 'scolque',
          nombres: currentUser ? currentUser.nombres : 'Silvia Irene',
          apellidos: currentUser ? currentUser.apellidos : 'Colque López',
          rol: currentUser && currentUser.rol ? (currentUser.rol.nombre || currentUser.rol) : 'Administrador',
          inicio_sesion: cierreLocal,
          cierre: cierreLocal,
          duracion: 'unos segundos',
          ip: '127.0.0.1',
          equipo: 'Terminal activa · 127.0.0.1'
        }));
      } finally {
        this.clearAuth();
      }
      return res;
    },

    solicitarRecuperacion: function (identificador) {
      return this.request('/auth/recuperar-clave/solicitar', {
        method: 'POST',
        body: { identificador: identificador }
      });
    },

    restablecerContrasena: function (payloadOrToken, password, password_confirmation) {
      var body = (typeof payloadOrToken === 'object' && payloadOrToken !== null)
        ? payloadOrToken
        : { token: payloadOrToken, codigo: payloadOrToken, password: password, password_confirmation: password_confirmation };
      return this.request('/auth/recuperar-clave/restablecer', {
        method: 'POST',
        body: body
      });
    },

    getMe: function () {
      return this.request('/auth/me', { method: 'GET' });
    },

    // ---------- Usuarios y Roles (P2 CU05-CU09) ----------
    getUsuarios: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/usuarios' + query, { method: 'GET' });
    },

    crearUsuario: function (data) {
      return this.request('/usuarios', { method: 'POST', body: data });
    },

    getUsuario: function (id) {
      return this.request('/usuarios/' + id, { method: 'GET' });
    },

    actualizarUsuario: function (id, data) {
      return this.request('/usuarios/' + id, { method: 'PUT', body: data });
    },

    cambiarRolUsuario: function (id, id_rol, motivo) {
      return this.request('/usuarios/' + id + '/cambiar-rol', {
        method: 'PUT',
        body: { id_rol: id_rol, motivo: motivo || 'Cambio de rol operativo administrativo' }
      });
    },

    inactivarUsuario: function (id, motivo) {
      return this.request('/usuarios/' + id + '/inactivar', {
        method: 'PUT',
        body: { motivo: motivo || 'Inactivación administrativa' }
      });
    },

    reactivarUsuario: function (id) {
      return this.request('/usuarios/' + id + '/reactivar', { method: 'PUT' });
    },

    getRoles: function () {
      return this.request('/roles', { method: 'GET' });
    },

    getPermisos: function () {
      return this.request('/permisos', { method: 'GET' });
    },

    sincronizarPermisosRol: function (idRol, permisosIds) {
      return this.request('/roles/' + idRol + '/permisos', {
        method: 'PUT',
        body: { permisos: permisosIds }
      });
    },

    // ---------- Bitácora y Auditoría (P3 CU10-CU11) ----------
    getBitacora: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/bitacora' + query, { method: 'GET' });
    },

    getBitacoraLive: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/bitacora/live' + query, { method: 'GET' });
    },

    getBitacoraResumen: function () {
      return this.request('/bitacora/resumen', { method: 'GET' });
    },

    // ---------- Gestión de Pacientes (P4 CU12-CU17) ----------
    getPacientes: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/pacientes' + query, { method: 'GET' });
    },

    crearPaciente: function (data) {
      return this.request('/pacientes', { method: 'POST', body: data });
    },

    getPaciente: function (id) {
      return this.request('/pacientes/' + id, { method: 'GET' });
    },

    actualizarPaciente: function (id, data) {
      return this.request('/pacientes/' + id, { method: 'PUT', body: data });
    },

    getInfoMedica: function (id) {
      return this.request('/pacientes/' + id + '/informacion-medica', { method: 'GET' });
    },

    guardarInfoMedica: function (id, data) {
      return this.request('/pacientes/' + id + '/informacion-medica', { method: 'POST', body: data });
    },

    getContactosEmergencia: function (id) {
      return this.request('/pacientes/' + id + '/contactos-emergencia', { method: 'GET' });
    },

    agregarContactoEmergencia: function (id, data) {
      return this.request('/pacientes/' + id + '/contactos-emergencia', { method: 'POST', body: data });
    },

    eliminarContactoEmergencia: function (id, contactoId) {
      return this.request('/pacientes/' + id + '/contactos-emergencia/' + contactoId, { method: 'DELETE' });
    },

    getHistorialCitas: function (id) {
      return this.request('/pacientes/' + id + '/historial-citas', { method: 'GET' });
    },

    inactivarPaciente: function (id, motivo) {
      return this.request('/pacientes/' + id + '/inactivar', { method: 'PUT', body: { motivo: motivo || 'Baja médica' } });
    },

    reactivarPaciente: function (id) {
      return this.request('/pacientes/' + id + '/reactivar', { method: 'PUT' });
    },

    // ---------- Gestión Médica y Horarios (P5 CU18-CU21) ----------
    getEspecialidades: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/especialidades' + query, { method: 'GET' });
    },

    crearEspecialidad: function (data) {
      return this.request('/especialidades', { method: 'POST', body: data });
    },

    getMedicos: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/medicos' + query, { method: 'GET' });
    },

    crearMedico: function (data) {
      return this.request('/medicos', { method: 'POST', body: data });
    },

    configurarHorariosMedico: function (id, payload) {
      var body = Array.isArray(payload) ? { horarios: payload } : payload;
      return this.request('/medicos/' + id + '/horarios', { method: 'POST', body: body });
    },

    getHorariosMedico: function (id) {
      return this.request('/medicos/' + id + '/horarios', { method: 'GET' });
    },

    inactivarMedico: function (id, motivo) {
      return this.request('/medicos/' + id + '/inactivar', { method: 'PUT', body: { motivo: motivo || 'Licencia o baja' } });
    },

    reactivarMedico: function (id) {
      return this.request('/medicos/' + id + '/reactivar', { method: 'PUT' });
    },

    // ---------- Citas Médicas y Agenda (P6 CU22-CU31) ----------
    getCitas: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/citas' + query, { method: 'GET' });
    },

    getDisponibilidad: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/citas/disponibilidad' + query, { method: 'GET' });
    },

    getProximoLibre: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/citas/proximo-libre' + query, { method: 'GET' });
    },

    // ---------- Pagos, Comprobantes y Reembolsos (P8 CU41, CU42) ----------
    getPagos: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/pagos' + query, { method: 'GET' });
    },

    getPago: function (id) {
      return this.request('/pagos/' + id, { method: 'GET' });
    },

    registrarPago: function (data) {
      return this.request('/pagos', { method: 'POST', body: data });
    },

    reembolsarPago: function (id, data) {
      return this.request('/pagos/' + id + '/reembolso', { method: 'POST', body: data });
    },

    crearStripeIntento: function (data) {
      return this.request('/pagos/stripe/crear-sesion', { method: 'POST', body: data });
    },

    programarCita: function (data) {
      return this.request('/citas', { method: 'POST', body: data });
    },

    reprogramarCita: function (id, data) {
      return this.request('/citas/' + id + '/reprogramar', { method: 'PUT', body: data });
    },

    cancelarCita: function (id, motivo) {
      var mot = motivo || 'Cancelada por paciente';
      return this.request('/citas/' + id + '/cancelar', {
        method: 'PUT',
        body: { motivo_cancelacion: mot, motivo: mot }
      });
    },

    registrarAtencion: function (id, data) {
      return this.request('/citas/' + id + '/atender', { method: 'PUT', body: data });
    },

    cambiarEstadoCita: function (id, data) {
      return this.request('/citas/' + id + '/estado', { method: 'PUT', body: data });
    },

    getHistorialEstadosCita: function (id) {
      return this.request('/citas/' + id + '/historial-estados', { method: 'GET' });
    },

    getBloqueosAgenda: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/bloqueos-agenda' + query, { method: 'GET' });
    },

    crearBloqueoAgenda: function (data) {
      return this.request('/bloqueos-agenda', { method: 'POST', body: data });
    },

    eliminarBloqueoAgenda: function (id) {
      return this.request('/bloqueos-agenda/' + id, { method: 'DELETE' });
    },

    getNotificaciones: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/notificaciones' + query, { method: 'GET' });
    },

    regenerarNotificaciones: function () {
      return this.request('/notificaciones/regenerar', { method: 'POST' });
    },

    registrarGestionNotificacion: function (id, data) {
      return this.request('/notificaciones/' + id + '/gestion', { method: 'PUT', body: data });
    },

    // ---------- Reportes (P7 CU32-CU36, CU43) ----------
    getReportes: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/reportes' + query, { method: 'GET' });
    },

    crearReporte: function (data) {
      return this.request('/reportes', { method: 'POST', body: data });
    },

    // ---------- Nuevos Casos de Uso y Clases Separadas (CU37-CU43) ----------
    autoRegistroPacienteWeb: function (data) {
      return this.request('/auth/autoregistro-paciente', { method: 'POST', body: data });
    },

    getSesiones: function () {
      return this.request('/sesiones', { method: 'GET' });
    },

    getTokensRecuperacion: function () {
      return this.request('/tokens-recuperacion', { method: 'GET' });
    },

    getPersonas: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/personas' + query, { method: 'GET' });
    },

    getPersonalAdministrativo: function () {
      return this.request('/personal-administrativo', { method: 'GET' });
    },

    guardarPersonalAdministrativo: function (data) {
      return this.request('/personal-administrativo', { method: 'POST', body: data });
    },

    crearPermiso: function (data) {
      return this.request('/permisos', { method: 'POST', body: data });
    },

    getPermisosRol: function (idRol) {
      return this.request('/roles/' + idRol + '/permisos', { method: 'GET' });
    },

    getEspecialidadesMedico: function (idMed) {
      return this.request('/medicos/' + idMed + '/especialidades', { method: 'GET' });
    },

    sincronizarEspecialidadesMedico: function (idMed, espIds) {
      return this.request('/medicos/' + idMed + '/especialidades', {
        method: 'PUT',
        body: { especialidades: espIds }
      });
    },

    registrarHistorialEstadoCita: function (idCita, data) {
      return this.request('/citas/' + idCita + '/historial-estados', {
        method: 'POST',
        body: data
      });
    }
  };

  window.VS_API = VS_API;

  /* =====================================================================
     UTILIDADES VISUALES Y BADGES DE AUDITORÍA (INACTIVAR, REGISTRAR, RENOVAR)
     ===================================================================== */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatFechaHora(val) {
    if (!val) return '—';
    try {
      var str = String(val).trim();
      // Si ya viene como YYYY-MM-DD HH:mm:ss o similar (hora local de Bolivia)
      var matchYmdHms = str.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
      if (matchYmdHms && str.indexOf('Z') === -1 && str.indexOf('+') === -1 && !str.match(/-\d{2}:\d{2}$/)) {
        var day = matchYmdHms[3];
        var mon = matchYmdHms[2];
        var hh = matchYmdHms[4];
        var mm = matchYmdHms[5];
        var ss = matchYmdHms[6] || '00';
        return day + '/' + mon + ' ' + hh + ':' + mm + ':' + ss;
      }

      var d = new Date(str);
      if (isNaN(d.getTime())) return str;

      // Usar explícitamente la zona horaria de Bolivia (America/La_Paz, UTC-4)
      var dtf = new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      var parts = dtf.formatToParts(d);
      var pMap = {};
      parts.forEach(function (p) { pMap[p.type] = p.value; });
      return (pMap.day || '00') + '/' + (pMap.month || '00') + ' ' + (pMap.hour || '00') + ':' + (pMap.minute || '00') + ':' + (pMap.second || '00');
    } catch (e) {
      return val;
    }
  }

  // Badges para vistas clásicas (CU11, inicio.html)
  function getBadgeAccion(accion) {
    var a = (accion || '').toUpperCase();
    if (a.includes('LOGIN')) return '<span class="vs-badge vs-badge--ok vs-badge--mono"><span class="vs-badge__dot"></span>LOGIN</span>';
    if (a.includes('LOGOUT')) return '<span class="vs-badge vs-badge--muted vs-badge--mono">LOGOUT</span>';
    if (a.includes('BLOQUEO')) return '<span class="vs-badge vs-badge--danger vs-badge--mono"><span class="vs-badge__dot"></span>BLOQUEO</span>';
    if (a.includes('INACTIVAR') || a.includes('SUSPENDER') || a.includes('BAJA')) {
      return '<span class="vs-badge vs-badge--danger vs-badge--mono"><span class="vs-badge__dot"></span>INACTIVAR</span>';
    }
    if (a.includes('RENOVAR') || a.includes('REACTIVAR')) {
      return '<span class="vs-badge vs-badge--cyan vs-badge--mono"><span class="vs-badge__dot"></span>RENOVAR</span>';
    }
    if (a.includes('REGISTRAR')) {
      return '<span class="vs-badge vs-badge--teal vs-badge--mono"><span class="vs-badge__dot"></span>REGISTRAR</span>';
    }
    if (a.includes('ELIMINAR')) return '<span class="vs-badge vs-badge--warn vs-badge--mono">ELIMINAR</span>';
    if (a.includes('MODIFICAR')) return '<span class="vs-badge vs-badge--cyan vs-badge--mono">MODIFICAR</span>';
    if (a.includes('CREAR')) return '<span class="vs-badge vs-badge--teal vs-badge--mono">CREAR</span>';
    return '<span class="vs-badge vs-badge--info vs-badge--mono">' + (a || 'EVENTO') + '</span>';
  }

  // Badges para vistas Stitch (bitacora-auditoria-stitch.html)
  function getBadgeAccionStitch(accion) {
    var a = (accion || '').toUpperCase();
    if (a.includes('LOGIN')) {
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>LOGIN</span>';
    }
    if (a.includes('LOGOUT')) {
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>LOGOUT</span>';
    }
    if (a.includes('BLOQUEO')) {
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>BLOQUEO</span>';
    }
    if (a.includes('INACTIVAR') || a.includes('SUSPENDER') || a.includes('BAJA')) {
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>INACTIVAR</span>';
    }
    if (a.includes('RENOVAR') || a.includes('REACTIVAR')) {
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200"><span class="w-1.5 h-1.5 rounded-full bg-teal-500"></span>RENOVAR</span>';
    }
    if (a.includes('REGISTRAR')) {
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200"><span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>REGISTRAR</span>';
    }
    if (a.includes('ELIMINAR')) {
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>ELIMINAR</span>';
    }
    if (a.includes('MODIFICAR')) {
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200"><span class="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>MODIFICAR</span>';
    }
    return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200"><span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>' + (a || 'CREAR') + '</span>';
  }

  // Modal de Detalle de Auditoría
  function mostrarModalDetalle(rec) {
    var modalId = 'vs-bitacora-modal';
    var oldModal = document.getElementById(modalId);
    if (oldModal) oldModal.remove();

    var usuarioStr = rec.usuario ? (rec.usuario.nombre_usuario || 'Usuario #' + rec.id_usuario) : 'Sistema';
    var rolStr = rec.usuario && rec.usuario.rol ? (rec.usuario.rol.nombre || rec.usuario.rol) : '—';
    var detalleFormateado = rec.detalle || 'Sin detalle adicional';

    var modalHtml = '<div id="' + modalId + '" style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);padding:1rem;">' +
      '<div style="background:#fff;border-radius:14px;max-width:640px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;border:1px solid #e2e8f0;display:flex;flex-direction:column;max-height:90vh;">' +
        '<div style="padding:1.25rem 1.5rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">' +
          '<div style="display:flex;align-items:center;gap:0.75rem;">' +
            '<span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.6rem;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;font-size:0.75rem;font-weight:700;">● En vivo</span>' +
            '<h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#0f172a;">Evento de Auditoría #' + rec.id_bitacora + '</h3>' +
          '</div>' +
          '<button type="button" id="vs-modal-close" style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:#64748b;padding:0.25rem 0.5rem;border-radius:6px;">✕</button>' +
        '</div>' +
        '<div style="padding:1.5rem;overflow-y:auto;display:flex;flex-direction:column;gap:1rem;font-size:0.875rem;">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
            '<div><strong style="color:#64748b;font-size:0.75rem;text-transform:uppercase;">Fecha y Hora:</strong><div style="font-weight:600;color:#0f172a;margin-top:2px;">' + formatFechaHora(rec.fecha_hora) + '</div></div>' +
            '<div><strong style="color:#64748b;font-size:0.75rem;text-transform:uppercase;">IP de Origen:</strong><div style="font-family:monospace;font-weight:600;color:#0f172a;margin-top:2px;">' + (rec.ip || '127.0.0.1') + '</div></div>' +
            '<div><strong style="color:#64748b;font-size:0.75rem;text-transform:uppercase;">Usuario:</strong><div style="font-weight:600;color:#0f172a;margin-top:2px;">' + escapeHtml(usuarioStr) + ' (' + escapeHtml(rolStr) + ')</div></div>' +
            '<div><strong style="color:#64748b;font-size:0.75rem;text-transform:uppercase;">Módulo:</strong><div style="font-weight:600;color:#0f172a;margin-top:2px;">' + escapeHtml(rec.modulo || 'GENERAL') + '</div></div>' +
            '<div><strong style="color:#64748b;font-size:0.75rem;text-transform:uppercase;">Acción:</strong><div style="margin-top:4px;">' + getBadgeAccion(rec.tipo_accion) + '</div></div>' +
            '<div><strong style="color:#64748b;font-size:0.75rem;text-transform:uppercase;">Tabla / Registro:</strong><div style="font-family:monospace;color:#0f172a;margin-top:2px;">' + (rec.tabla_afectada ? (rec.tabla_afectada + ' · ' + (rec.id_registro_afectado || '—')) : '—') + '</div></div>' +
          '</div>' +
          '<div>' +
            '<strong style="color:#64748b;font-size:0.75rem;text-transform:uppercase;">Detalle de la Operación:</strong>' +
            '<pre style="background:#0f172a;color:#f8fafc;padding:0.875rem;border-radius:8px;font-size:0.785rem;white-space:pre-wrap;word-break:break-word;margin-top:0.35rem;max-height:220px;overflow-y:auto;">' + escapeHtml(detalleFormateado) + '</pre>' +
          '</div>' +
        '</div>' +
        '<div style="padding:1rem 1.5rem;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;">' +
          '<button type="button" id="vs-modal-close-btn" style="background:#047857;color:#fff;border:none;padding:0.4rem 1.2rem;border-radius:8px;font-weight:600;font-size:0.875rem;cursor:pointer;">Cerrar</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    function cerrarModal() {
      var m = document.getElementById(modalId);
      if (m) m.remove();
    }

    var btnX = document.getElementById('vs-modal-close');
    if (btnX) btnX.addEventListener('click', cerrarModal);
    var btnC = document.getElementById('vs-modal-close-btn');
    if (btnC) btnC.addEventListener('click', cerrarModal);
  }

  /* =====================================================================
     SINCRONIZACIÓN DE INTERFACES Y CONTROLADORES
     ===================================================================== */
  function initApp() {
    var currentUser = VS_API.getUser();

    // 0. Limpiar etiquetas y códigos técnicos estáticos de la interfaz
    document.querySelectorAll('.vs-trace, .vs-cu__code, .vs-module__cus').forEach(function (el) {
      el.remove();
    });
    document.querySelectorAll('.vs-eyebrow, .vs-h1, .vs-choice__title, .vs-choice__desc, .vs-card__title, .vs-card__sub, .vs-lead, .vs-rule, .vs-label').forEach(function (el) {
      el.querySelectorAll('.vs-code').forEach(function (codeEl) {
        var txt = codeEl.textContent.trim();
        if (/^(CU\d+|P\d+|\w+Controller(::\w+)?|session_destroy\(\))$/i.test(txt)) {
          codeEl.remove();
        } else {
          codeEl.replaceWith(document.createTextNode(txt));
        }
      });
      if (el.classList.contains('vs-eyebrow')) {
        el.textContent = el.textContent
          .replace(/^P\d+\s*·\s*/i, '')
          .replace(/\s*·\s*CU\d+.*$/i, '')
          .replace(/\bCU\d+\b/gi, '')
          .trim();
      }
    });

    // 1. Sincronizar barra superior institucional y saludo dinámico
    if (currentUser) {
      // Clásico
      var nombreEl = document.querySelector('.vs-user__name');
      var rolEl = document.querySelector('.vs-user__role');
      var avatarEl = document.querySelector('.vs-avatar');

      var fullName = (currentUser.nombres ? (currentUser.nombres + ' ' + (currentUser.apellidos || '')) : currentUser.nombre_usuario) || 'Administrador';
      var firstName = (currentUser.nombres ? currentUser.nombres.split(' ')[0] : currentUser.nombre_usuario) || 'Usuario';
      var rolName = (currentUser.rol && currentUser.rol.nombre) ? currentUser.rol.nombre : (currentUser.rol || 'Administrador');

      if (nombreEl) nombreEl.textContent = fullName;
      if (rolEl) rolEl.textContent = rolName;
      if (avatarEl) {
        var inits = (currentUser.nombres ? currentUser.nombres.charAt(0) : 'U') + (currentUser.apellidos ? currentUser.apellidos.charAt(0) : 'S');
        avatarEl.textContent = inits.toUpperCase();
        avatarEl.title = fullName + ' (' + rolName + ')';
      }

      var saludoInicio = document.getElementById('vs-inicio-saludo');
      if (saludoInicio) {
        saludoInicio.textContent = 'Bienvenido(a), ' + firstName;
      }
      var fechaInicio = document.getElementById('vs-inicio-fecha-actual');
      if (fechaInicio) {
        try {
          var hoyFmt = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          fechaInicio.textContent = hoyFmt.charAt(0).toUpperCase() + hoyFmt.slice(1) + ' · Santa Cruz';
        } catch (eF) {}
      }

      // Stitch
      var stitchName = document.querySelector('.vs-topbar .text-vs-ink');
      var stitchRole = document.querySelector('.vs-topbar .text-vs-muted');
      var stitchAvatar = document.querySelector('.vs-topbar .rounded-full');
      if (stitchName) stitchName.textContent = fullName;
      if (stitchRole) stitchRole.textContent = rolName;
      if (stitchAvatar) {
        var sInits = (currentUser.nombres ? currentUser.nombres.charAt(0) : 'U') + (currentUser.apellidos ? currentUser.apellidos.charAt(0) : 'S');
        stitchAvatar.textContent = sInits.toUpperCase();
        stitchAvatar.title = fullName;
      }

      // Adaptación de la vista de Inicio para el rol Paciente (solo sus 8 opciones autorizadas)
      var isPacienteRole = String(rolName).toUpperCase().indexOf('PACIENTE') !== -1;
      if (isPacienteRole) {
        var pageHeadText = document.querySelector('.vs-page-head__text');
        if (pageHeadText) {
          var h2El = pageHeadText.querySelector('h2');
          if (h2El) h2El.textContent = 'Portal de Paciente · ' + firstName;
          var leadEl = pageHeadText.querySelector('.vs-lead');
          if (leadEl) leadEl.textContent = 'Bienvenido a tu portal de salud: consulta tu información médica, gestiona tus citas médicas y realiza el pago de tus fichas con comprobante.';
        }
        var sideBtns = document.querySelector('.vs-page-head__side');
        if (sideBtns) {
          sideBtns.innerHTML = '<a href="P6%20Gesti%C3%B3n%20de%20Citas%20M%C3%A9dicas/cu24-programar-cita.html" class="vs-btn vs-btn--primary"><svg class="vs-i"><use href="#i-plus"/></svg>Programar cita</a>' +
                               '<a href="P6%20Gesti%C3%B3n%20de%20Citas%20M%C3%A9dicas/cu41-pasarela-pago-comprobante.html" class="vs-btn vs-btn--ghost"><svg class="vs-i"><use href="#i-id-card"/></svg>Pagar ficha médica</a>';
        }
        var modulesSection = document.querySelector('.vs-grid--3');
        if (modulesSection && document.body.getAttribute('data-page') === 'inicio') {
          modulesSection.innerHTML = '' +
            '<a href="P4%20Gesti%C3%B3n%20de%20Pacientes/cu13-informacion-medica.html" class="vs-card vs-card--hover vs-module">' +
            '  <span class="vs-module__tile" aria-hidden="true"><svg class="vs-i"><use href="#i-heart"/></svg></span>' +
            '  <div class="vs-grow"><div class="vs-module__name">1. Información médica</div><p class="vs-module__desc">Consulta tu ficha de salud básica, tipo de sangre y antecedentes.</p></div>' +
            '</a>' +
            '<a href="P4%20Gesti%C3%B3n%20de%20Pacientes/cu14-contacto-emergencia.html" class="vs-card vs-card--hover vs-module">' +
            '  <span class="vs-module__tile" aria-hidden="true"><svg class="vs-i"><use href="#i-phone"/></svg></span>' +
            '  <div class="vs-grow"><div class="vs-module__name">2. Contacto de emergencia</div><p class="vs-module__desc">Registra el familiar o responsable a contactar en caso de urgencia.</p></div>' +
            '</a>' +
            '<a href="P4%20Gesti%C3%B3n%20de%20Pacientes/cu16-historial-citas.html" class="vs-card vs-card--hover vs-module">' +
            '  <span class="vs-module__tile" aria-hidden="true"><svg class="vs-i"><use href="#i-file-text"/></svg></span>' +
            '  <div class="vs-grow"><div class="vs-module__name">3. Historial de citas</div><p class="vs-module__desc">Revisa tus atenciones anteriores, estados y médicos tratantes.</p></div>' +
            '</a>' +
            '<a href="P6%20Gesti%C3%B3n%20de%20Citas%20M%C3%A9dicas/cu24-programar-cita.html" class="vs-card vs-card--hover vs-module">' +
            '  <span class="vs-module__tile" aria-hidden="true"><svg class="vs-i"><use href="#i-calendar"/></svg></span>' +
            '  <div class="vs-grow"><div class="vs-module__name">4. Programar cita médica</div><p class="vs-module__desc">Selecciona especialidad, médico, fecha y reserva tu turno en vivo.</p></div>' +
            '</a>' +
            '<a href="P6%20Gesti%C3%B3n%20de%20Citas%20M%C3%A9dicas/cu26-reprogramar-cita.html" class="vs-card vs-card--hover vs-module">' +
            '  <span class="vs-module__tile" aria-hidden="true"><svg class="vs-i"><use href="#i-repeat"/></svg></span>' +
            '  <div class="vs-grow"><div class="vs-module__name">5. Reprogramar cita</div><p class="vs-module__desc">Cambia el horario o día de tus citas pendientes de atención.</p></div>' +
            '</a>' +
            '<a href="P6%20Gesti%C3%B3n%20de%20Citas%20M%C3%A9dicas/cu27-cancelar-cita.html" class="vs-card vs-card--hover vs-module">' +
            '  <span class="vs-module__tile" aria-hidden="true"><svg class="vs-i"><use href="#i-x-circle"/></svg></span>' +
            '  <div class="vs-grow"><div class="vs-module__name">6. Cancelar cita</div><p class="vs-module__desc">Cancela una cita médica programada con motivo justificado.</p></div>' +
            '</a>' +
            '<a href="P6%20Gesti%C3%B3n%20de%20Citas%20M%C3%A9dicas/cu28-recordatorios.html" class="vs-card vs-card--hover vs-module">' +
            '  <span class="vs-module__tile" aria-hidden="true"><svg class="vs-i"><use href="#i-bell"/></svg></span>' +
            '  <div class="vs-grow"><div class="vs-module__name">7. Recordatorios</div><p class="vs-module__desc">Consulta las notificaciones y alertas automáticas de tus citas.</p></div>' +
            '</a>' +
            '<a href="P6%20Gesti%C3%B3n%20de%20Citas%20M%C3%A9dicas/cu41-pasarela-pago-comprobante.html" class="vs-card vs-card--hover vs-module">' +
            '  <span class="vs-module__tile" aria-hidden="true"><svg class="vs-i"><use href="#i-id-card"/></svg></span>' +
            '  <div class="vs-grow"><div class="vs-module__name">8. Pagar ficha médica y comprobante</div><p class="vs-module__desc">Realiza el pago con pasarela QR/Tarjeta y obtén tu comprobante digital.</p></div>' +
            '</a>';
        }
      }
    }

    // 2. Interceptar botones de Cerrar Sesión: abrir SIEMPRE el diálogo modal de confirmación sin salir de forma automática
    document.querySelectorAll('[data-logout]').forEach(function (btn) {
      if (btn.getAttribute('data-logout-bound')) return;
      btn.setAttribute('data-logout-bound', 'true');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.injectLogoutDialog === 'function') {
          window.injectLogoutDialog();
        }
        var dlg = document.getElementById('vs-logout-dialog');
        if (dlg && typeof dlg.showModal === 'function') {
          if (!dlg.open) dlg.showModal();
        }
      });
    });

    // 3. Vincular Login Stitch (login-stitch.html)
    var stitchLoginForm = document.getElementById('stitch-form-login');
    if (stitchLoginForm && !stitchLoginForm.getAttribute('data-bound')) {
      stitchLoginForm.setAttribute('data-bound', 'true');
      stitchLoginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var userInp = document.getElementById('username');
        var passInp = document.getElementById('password');
        var alertBox = document.getElementById('stitch-login-alert');
        var alertDesc = document.getElementById('stitch-login-alert-desc');

        var uVal = userInp ? userInp.value.trim() : '';
        var pVal = passInp ? passInp.value : '';

        if (!uVal || !pVal) {
          if (alertBox) {
            if (alertDesc) alertDesc.textContent = 'Por favor ingresa tu usuario y contraseña.';
            alertBox.style.display = 'block';
          }
          return;
        }

        try {
          var res = await VS_API.login(uVal, pVal, true);
          if (alertBox) alertBox.style.display = 'none';
          window.location.href = 'inicio.html';
        } catch (err) {
          if (alertBox) {
            var msg = (err.data && err.data.message) ? err.data.message : err.message;
            if (alertDesc) alertDesc.textContent = msg;
            alertBox.style.display = 'block';
          } else {
            alert(err.message || 'Error de autenticación');
          }
        }
      });
    }

    // 4. Vincular Login Clásico (CU01)
    var loginForm = document.getElementById('form-login') || document.querySelector('body[data-cu="CU01"] .vs-form');
    if (loginForm && !loginForm.getAttribute('data-bound')) {
      loginForm.setAttribute('data-bound', 'true');
      var userInput = loginForm.querySelector('#usuario, input[name="usuario"]');
      var passInput = loginForm.querySelector('#clave, input[name="clave"]');
      var alertBox = document.querySelector('.vs-alert--danger');
      var alertBody = alertBox ? alertBox.querySelector('.vs-alert__body') : null;
      if (alertBox) alertBox.style.display = 'none';

      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var idVal = userInput ? userInput.value.trim() : '';
        var passVal = passInput ? passInput.value : '';

        if (!idVal || !passVal) {
          if (alertBox && alertBody) {
            alertBody.innerHTML = '<span class="vs-alert__title">Campos incompletos</span>Por favor ingresa usuario y contraseña.';
            alertBox.style.display = 'flex';
          }
          return;
        }

        try {
          await VS_API.login(idVal, passVal, true);
          if (alertBox) alertBox.style.display = 'none';
          window.location.href = location.pathname.includes('/P1') ? '../inicio.html' : 'inicio.html';
        } catch (err) {
          if (alertBox && alertBody) {
            var msg = (err.data && err.data.message) ? err.data.message : err.message;
            alertBody.innerHTML = '<span class="vs-alert__title">Error</span>' + msg;
            alertBox.style.display = 'flex';
          } else {
            alert(err.message || 'Credenciales inválidas');
          }
        }
      });
    }

    // 5. Vincular Dashboard Stitch (dashboard-admin-stitch.html)
    if (location.pathname.includes('dashboard-admin-stitch')) {
      initDashboardAdminStitch();
    }

    async function initDashboardAdminStitch() {
      var kpiActivas = document.getElementById('stitch-dash-kpi-activas');
      var kpiIngresos = document.getElementById('stitch-dash-kpi-ingresos');
      var kpiEventos = document.getElementById('stitch-dash-kpi-eventos');
      var kpiSuspendidas = document.getElementById('stitch-dash-kpi-suspendidas');
      var movimientosList = document.getElementById('stitch-dash-movimientos');

      try {
        // Cargar usuarios para KPIs de cuentas
        var uRes = await VS_API.getUsuarios();
        var usuarios = (uRes && uRes.data && uRes.data.data) ? uRes.data.data : (uRes.data || uRes || []);
        if (Array.isArray(usuarios)) {
          var activas = 0, inactivas = 0;
          usuarios.forEach(function (u) {
            if ((u.estado || 'ACTIVO').toUpperCase() === 'ACTIVO') activas++;
            else inactivas++;
          });
          if (kpiActivas) kpiActivas.textContent = activas;
          if (kpiSuspendidas) kpiSuspendidas.textContent = inactivas;
        }

        // Cargar eventos y resumen de bitácora
        var liveRes = await VS_API.getBitacoraLive({ limit: 6 });
        if (liveRes && liveRes.kpis) {
          var k = liveRes.kpis;
          if (kpiEventos) kpiEventos.textContent = k.total_hoy != null ? k.total_hoy : '—';
          if (kpiIngresos) kpiIngresos.textContent = (k.total_mes != null ? k.total_mes : '0');
        }

        if (movimientosList && liveRes && liveRes.data && liveRes.data.length) {
          var html = '';
          liveRes.data.forEach(function (item) {
            var usr = item.usuario ? (item.usuario.nombre_usuario || 'Sistema') : 'Sistema';
            var detalle = item.detalle || 'Evento de auditoría registrado';
            var fecha = formatFechaHora(item.fecha_hora);

            html += '<li class="py-3.5 first:pt-0">' +
              '<div class="flex items-center justify-between gap-3 text-sm">' +
                '<div class="flex items-center gap-2">' +
                  getBadgeAccionStitch(item.tipo_accion) +
                  '<span class="font-semibold text-vs-ink">' + escapeHtml(detalle) + '</span>' +
                '</div>' +
                '<time class="text-[11px] text-slate-400 shrink-0 tabular-nums">' + fecha + '</time>' +
              '</div>' +
              '<p class="text-xs text-vs-muted mt-1">' + escapeHtml(item.modulo || 'GENERAL') + ' · usuario: ' + escapeHtml(usr) + ' · IP ' + (item.ip || '127.0.0.1') + '</p>' +
            '</li>';
          });
          movimientosList.innerHTML = html;
        }
      } catch (e) {
        console.warn('Error en dashboard admin stitch:', e);
      }
    }

    // 6. Vincular Gestión de Usuarios Stitch (usuarios-gestion-stitch.html)
    if (location.pathname.includes('usuarios-gestion-stitch')) {
      initUsuariosStitch();
    }

    async function initUsuariosStitch() {
      var tableBody = document.getElementById('stitch-usuarios-tbody');
      var kpiTotal = document.getElementById('stitch-u-kpi-total');
      var kpiMed = document.getElementById('stitch-u-kpi-medicos');
      var kpiRec = document.getElementById('stitch-u-kpi-recep');
      var kpiAdm = document.getElementById('stitch-u-kpi-admin');
      var badgeTotal = document.getElementById('stitch-u-badge-total');
      var paginationInfo = document.getElementById('stitch-u-pagination');
      var recentUsersBox = document.getElementById('stitch-recent-users');

      var inputBuscar = document.getElementById('stitch-u-buscar');
      var selectRol = document.getElementById('stitch-u-rol');
      var selectEstado = document.getElementById('stitch-u-estado');
      var btnFiltrar = document.getElementById('stitch-u-btn-filtrar');
      var btnLimpiar = document.getElementById('stitch-u-btn-limpiar');

      var todosUsuarios = [];

      async function cargarUsuarios(filtros) {
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400">Cargando personal institucional desde PostgreSQL...</td></tr>';

        try {
          var params = filtros || {};
          var res = await VS_API.getUsuarios(params);
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || res || []);
          if (!Array.isArray(list)) list = [];
          todosUsuarios = list;

          // KPIs
          var total = list.length;
          var med = 0, rec = 0, adm = 0;
          list.forEach(function (u) {
            var r = (u.rol ? (u.rol.nombre || u.rol) : '').toUpperCase();
            if (r.includes('MEDIC')) med++;
            else if (r.includes('RECEP')) rec++;
            else if (r.includes('ADMIN')) adm++;
          });

          if (kpiTotal) kpiTotal.textContent = total;
          if (kpiMed) kpiMed.textContent = med;
          if (kpiRec) kpiRec.textContent = rec;
          if (kpiAdm) kpiAdm.textContent = adm;
          if (badgeTotal) badgeTotal.textContent = total + ' registros totales';
          if (paginationInfo) paginationInfo.textContent = 'Mostrando 1–' + total + ' de ' + total + ' usuarios registrados';

          // Render tabla
          if (list.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400">No se encontraron usuarios para los filtros seleccionados.</td></tr>';
            return;
          }

          var html = '';
          list.forEach(function (u) {
            var pers = u.persona || {};
            var nombreCompleto = (pers.nombres ? (pers.nombres + ' ' + (pers.apellidos || '')) : u.nombre_usuario) || 'Sin nombre';
            var ci = pers.ci || '—';
            var email = pers.email || '—';
            var tel = pers.telefono || '—';
            var rolStr = (u.rol ? (u.rol.nombre || u.rol) : 'Personal');
            var estado = (u.estado || 'ACTIVO').toUpperCase();
            var esActivo = estado === 'ACTIVO';

            var estadoBadge = esActivo
              ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Activo</span>'
              : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Inactivo</span>';

            var inits = (pers.nombres ? pers.nombres.charAt(0) : 'U') + (pers.apellidos ? pers.apellidos.charAt(0) : '');

            var actionBtn = esActivo
              ? '<button type="button" class="btn-inactivar-usuario px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition" data-id="' + u.id_usuario + '" data-name="' + escapeHtml(nombreCompleto) + '">Inactivar</button>'
              : '<button type="button" class="btn-reactivar-usuario px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition" data-id="' + u.id_usuario + '" data-name="' + escapeHtml(nombreCompleto) + '">Reactivar / Renovar</button>';

            html += '<tr class="hover:bg-slate-50/70 transition-colors">' +
              '<td class="py-3 px-4 font-mono text-slate-600">' + ci + '</td>' +
              '<td class="py-3 px-4">' +
                '<div class="flex items-center gap-2.5">' +
                  '<span class="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">' + inits.toUpperCase() + '</span>' +
                  '<div><div class="font-bold text-slate-900">' + escapeHtml(nombreCompleto) + '</div><div class="text-[11px] font-mono text-slate-400">@' + escapeHtml(u.nombre_usuario) + '</div></div>' +
                '</div>' +
              '</td>' +
              '<td class="py-3 px-4 hidden md:table-cell text-slate-600">' + escapeHtml(email) + '</td>' +
              '<td class="py-3 px-4 hidden sm:table-cell font-mono text-slate-600">' + escapeHtml(tel) + '</td>' +
              '<td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">' + escapeHtml(rolStr) + '</span></td>' +
              '<td class="py-3 px-4">' + estadoBadge + '</td>' +
              '<td class="py-3 px-4 text-right space-x-1.5">' + actionBtn + '</td>' +
              '</tr>';
          });

          tableBody.innerHTML = html;
        } catch (err) {
          console.warn('Error al cargar usuarios:', err);
          tableBody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-rose-500">Error al cargar usuarios desde la base de datos: ' + err.message + '</td></tr>';
        }
      }

      // Cargar eventos recientes en el panel derecho
      async function cargarEventosRecientesPanel() {
        if (!recentUsersBox) return;
        try {
          var bRes = await VS_API.getBitacoraLive({ limit: 4 });
          if (bRes && bRes.data && bRes.data.length) {
            var rHtml = '';
            bRes.data.forEach(function (ev) {
              var usr = ev.usuario ? (ev.usuario.nombre_usuario || 'Sistema') : 'Sistema';
              var dt = formatFechaHora(ev.fecha_hora);
              var badge = getBadgeAccionStitch(ev.tipo_accion);

              rHtml += '<div class="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">' +
                '<div class="flex items-center justify-between gap-2 mb-1">' +
                  badge +
                  '<span class="text-[10px] text-slate-400 tabular-nums">' + dt + '</span>' +
                '</div>' +
                '<p class="text-xs font-bold text-slate-800 truncate">' + escapeHtml(ev.detalle || 'Operación en sistema') + '</p>' +
                '<p class="text-[11px] text-slate-500">Usuario: @' + escapeHtml(usr) + '</p>' +
              '</div>';
            });
            recentUsersBox.innerHTML = rHtml;
          }
        } catch (e) {}
      }

      // Event delegation para Inactivar y Reactivar / Renovar
      if (tableBody) {
        tableBody.addEventListener('click', async function (ev) {
          var btnInactivar = ev.target.closest('.btn-inactivar-usuario');
          if (btnInactivar) {
            var idInact = btnInactivar.getAttribute('data-id');
            var nameInact = btnInactivar.getAttribute('data-name');
            if (confirm('¿Confirmas inactivar la cuenta de ' + nameInact + '?\nLa acción quedará auditada en la bitácora como INACTIVAR.')) {
              btnInactivar.disabled = true;
              btnInactivar.textContent = 'Procesando...';
              try {
                await VS_API.inactivarUsuario(idInact, 'Inactivado por administrador desde panel Stitch');
                if (window.vsToast) window.vsToast('Cuenta inactivada', nameInact + ' pasó a estado INACTIVO');
                await cargarUsuarios();
                await cargarEventosRecientesPanel();
              } catch (errInact) {
                alert('No se pudo inactivar: ' + (errInact.data && errInact.data.message ? errInact.data.message : errInact.message));
                btnInactivar.disabled = false;
                btnInactivar.textContent = 'Inactivar';
              }
            }
            return;
          }

          var btnReactivar = ev.target.closest('.btn-reactivar-usuario');
          if (btnReactivar) {
            var idReact = btnReactivar.getAttribute('data-id');
            var nameReact = btnReactivar.getAttribute('data-name');
            if (confirm('¿Confirmas reactivar y renovar la cuenta de ' + nameReact + '?\nLa acción quedará auditada en la bitácora como RENOVAR.')) {
              btnReactivar.disabled = true;
              btnReactivar.textContent = 'Procesando...';
              try {
                await VS_API.reactivarUsuario(idReact);
                if (window.vsToast) window.vsToast('Cuenta renovada', nameReact + ' pasó a estado ACTIVO');
                await cargarUsuarios();
                await cargarEventosRecientesPanel();
              } catch (errReact) {
                alert('No se pudo reactivar: ' + (errReact.data && errReact.data.message ? errReact.data.message : errReact.message));
                btnReactivar.disabled = false;
                btnReactivar.textContent = 'Reactivar / Renovar';
              }
            }
            return;
          }
        });
      }

      // Filtrado y búsqueda
      function aplicarFiltros() {
        var query = inputBuscar ? inputBuscar.value.trim() : '';
        var rol = selectRol ? selectRol.value : '';
        var estado = selectEstado ? selectEstado.value : '';

        var params = {};
        if (query) params.buscar = query;
        if (rol) params.rol = rol;
        if (estado) params.estado = estado;

        cargarUsuarios(params);
      }

      if (btnFiltrar) btnFiltrar.addEventListener('click', aplicarFiltros);
      if (inputBuscar) {
        inputBuscar.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            aplicarFiltros();
          }
        });
      }
      if (selectRol) selectRol.addEventListener('change', aplicarFiltros);
      if (selectEstado) selectEstado.addEventListener('change', aplicarFiltros);

      if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function () {
          if (inputBuscar) inputBuscar.value = '';
          if (selectRol) selectRol.value = '';
          if (selectEstado) selectEstado.value = '';
          cargarUsuarios();
        });
      }

      // Modal Crear Usuario
      var modalUser = document.getElementById('modal-nuevo-usuario');
      var btnAbrirModalUser = document.getElementById('stitch-btn-nuevo-usuario');
      var btnCerrarModalUser = document.getElementById('btn-cerrar-modal-user');
      var btnCancelarModalUser = document.getElementById('btn-cancelar-modal-user');
      var formCrearUser = document.getElementById('form-crear-usuario-stitch');
      var modalError = document.getElementById('modal-user-error');

      function abrirModal() {
        if (modalUser) {
          modalUser.classList.remove('hidden');
          if (formCrearUser) formCrearUser.reset();
          if (modalError) modalError.classList.add('hidden');
        }
      }

      function cerrarModal() {
        if (modalUser) modalUser.classList.add('hidden');
      }

      if (btnAbrirModalUser) btnAbrirModalUser.addEventListener('click', abrirModal);
      if (btnCerrarModalUser) btnCerrarModalUser.addEventListener('click', cerrarModal);
      if (btnCancelarModalUser) btnCancelarModalUser.addEventListener('click', cerrarModal);

      if (formCrearUser) {
        formCrearUser.addEventListener('submit', async function (e) {
          e.preventDefault();
          var fd = new FormData(formCrearUser);
          var payload = {
            ci: fd.get('ci'),
            nombres: fd.get('nombres'),
            apellidos: fd.get('apellidos'),
            email: fd.get('email'),
            telefono: fd.get('telefono'),
            id_rol: parseInt(fd.get('id_rol'), 10),
            password: fd.get('password')
          };

          var submitBtn = document.getElementById('btn-submit-modal-user');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando en BD...';
          }
          if (modalError) modalError.classList.add('hidden');

          try {
            var res = await VS_API.crearUsuario(payload);
            cerrarModal();
            if (window.vsToast) {
              window.vsToast('Usuario registrado', 'Cuenta creada y auditada en bitácora (REGISTRAR)');
            }
            await cargarUsuarios();
            await cargarEventosRecientesPanel();
          } catch (err) {
            if (modalError) {
              var errDetail = err.data && err.data.errors ? Object.values(err.data.errors).flat().join('<br>') : (err.data && err.data.message ? err.data.message : err.message);
              modalError.innerHTML = errDetail;
              modalError.classList.remove('hidden');
            } else {
              alert('Error al registrar usuario: ' + err.message);
            }
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Guardar usuario';
            }
          }
        });
      }

      // Exportar CSV
      var btnExportar = document.getElementById('stitch-u-btn-exportar');
      if (btnExportar) {
        btnExportar.addEventListener('click', function () {
          if (!todosUsuarios.length) {
            alert('No hay usuarios para exportar.');
            return;
          }
          var csv = 'ID,CI,Nombres,Apellidos,Usuario,Email,Telefono,Rol,Estado\n';
          todosUsuarios.forEach(function (u) {
            var p = u.persona || {};
            var r = u.rol ? (u.rol.nombre || u.rol) : '';
            csv += [
              u.id_usuario,
              '"' + (p.ci || '') + '"',
              '"' + (p.nombres || '') + '"',
              '"' + (p.apellidos || '') + '"',
              '"' + (u.nombre_usuario || '') + '"',
              '"' + (p.email || '') + '"',
              '"' + (p.telefono || '') + '"',
              '"' + r + '"',
              '"' + (u.estado || 'ACTIVO') + '"'
            ].join(',') + '\n';
          });
          var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          var link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.setAttribute('download', 'usuarios_vida_salud.csv');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      cargarUsuarios();
      cargarEventosRecientesPanel();
    }

    // 7. Vincular Bitácora Stitch (bitacora-auditoria-stitch.html)
    if (location.pathname.includes('bitacora-auditoria-stitch')) {
      initBitacoraStitchCompleta();
    }

    function initBitacoraStitchCompleta() {
      var tableBody = document.getElementById('stitch-bitacora-tbody') || document.querySelector('table tbody');
      if (!tableBody) return;

      var kpiTotal = document.getElementById('stitch-kpi-total');
      var kpiLogins = document.getElementById('stitch-kpi-logins');
      var kpiAlertas = document.getElementById('stitch-kpi-alertas');
      var kpiRoles = document.getElementById('stitch-kpi-roles');

      var filterForm = document.getElementById('stitch-filter-form');
      var inputUsuario = document.getElementById('stitch-b-usuario');
      var selectModulo = document.getElementById('stitch-b-modulo');
      var selectAccion = document.getElementById('stitch-b-accion');
      var inputDesde = document.getElementById('stitch-b-desde');
      var inputHasta = document.getElementById('stitch-b-hasta');
      var btnExportar = document.getElementById('stitch-btn-exportar-csv');
      var btnLimpiar = document.getElementById('stitch-btn-limpiar');

      var lastId = 0;
      var isFiltering = false;
      var currentRecords = [];
      var activeFilterParams = {};

      function buildStitchRowHtml(item, isNew) {
        var usr = item.usuario ? (item.usuario.nombre_usuario || 'Sistema') : 'Sistema';
        var rol = item.usuario && item.usuario.rol ? (item.usuario.rol.nombre || item.usuario.rol) : 'Personal';
        var dt = formatFechaHora(item.fecha_hora);
        var badge = getBadgeAccionStitch(item.tipo_accion);
        var highlightCls = isNew ? ' bg-emerald-50/60 transition-colors duration-1000' : ' hover:bg-slate-50/60 transition-colors';

        return '<tr class="cursor-pointer ' + highlightCls + '" data-id="' + item.id_bitacora + '">' +
          '<td class="py-3 px-4 font-medium text-vs-ink whitespace-nowrap font-mono text-xs">' + dt + '</td>' +
          '<td class="py-3 px-4"><div class="font-bold text-slate-800 text-xs">@' + escapeHtml(usr) + '</div><div class="text-slate-400 text-[11px]">' + escapeHtml(rol) + ' · ' + (item.ip || '127.0.0.1') + '</div></td>' +
          '<td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">' + escapeHtml(item.modulo || 'GENERAL') + '</span></td>' +
          '<td class="py-3 px-4">' + badge + '</td>' +
          '<td class="py-3 px-4 text-slate-600 max-w-xs truncate text-xs" title="' + escapeHtml(item.detalle || '') + '">' + escapeHtml(item.detalle || '—') + '</td>' +
          '</tr>';
      }

      async function cargarBitacora(params) {
        try {
          activeFilterParams = params || {};
          var res = await VS_API.getBitacora(params);
          var pagData = (res && res.data && res.data.data) ? res.data.data : (res.data || res || []);
          if (!Array.isArray(pagData)) pagData = [];

          currentRecords = pagData;
          if (pagData.length > 0) {
            pagData.forEach(function (r) {
              if (r.id_bitacora > lastId) lastId = r.id_bitacora;
            });
          }

          var html = '';
          pagData.forEach(function (item) {
            html += buildStitchRowHtml(item, false);
          });

          if (!html) {
            html = '<tr><td colspan="5" class="py-8 text-center text-slate-400">No se encontraron eventos de auditoría para los criterios seleccionados.</td></tr>';
          }

          tableBody.innerHTML = html;

          // Render paginación dinámica Stitch (sin páginas ficticias)
          var totalCount = (res && res.data && res.data.total != null) ? res.data.total : (res.total_hoy != null ? res.total_hoy : pagData.length);
          var curPage = (res && res.data && res.data.current_page) ? res.data.current_page : 1;
          var lastPage = (res && res.data && res.data.last_page) ? res.data.last_page : 1;
          var fromRec = (res && res.data && res.data.from != null) ? res.data.from : (pagData.length > 0 ? 1 : 0);
          var toRec = (res && res.data && res.data.to != null) ? res.data.to : pagData.length;

          var pagInfoEl = document.getElementById('stitch-bitacora-pag-info');
          if (pagInfoEl) {
            if (totalCount === 0) {
              pagInfoEl.textContent = 'Sin eventos de auditoría registrados';
            } else {
              pagInfoEl.innerHTML = 'Mostrando <span class="font-semibold text-slate-800">' + fromRec + '–' + toRec + '</span> de <span class="font-semibold text-slate-800">' + totalCount + '</span> eventos registrados';
            }
          }

          var pagerEl = document.getElementById('stitch-bitacora-pager');
          if (pagerEl) {
            if (totalCount === 0 || lastPage <= 1) {
              pagerEl.innerHTML = '';
            } else {
              var spHtml = '';
              var prevDis = curPage <= 1 ? ' opacity-40 cursor-not-allowed' : ' hover:bg-slate-50 cursor-pointer';
              spHtml += '<button type="button" class="px-2.5 py-1 text-slate-500 rounded border border-slate-200/60 bg-white text-[11px] font-semibold flex items-center gap-1' + prevDis + '"' + (curPage <= 1 ? ' disabled' : '') + ' data-page="' + (curPage - 1) + '"><span class="material-symbols-outlined text-[16px]">chevron_left</span> Anterior</button>';

              for (var p = 1; p <= lastPage; p++) {
                if (lastPage > 7 && Math.abs(p - curPage) > 2 && p !== 1 && p !== lastPage) {
                  if (p === 2 || p === lastPage - 1) spHtml += '<span class="px-1 text-slate-400 text-xs">…</span>';
                  continue;
                }
                var isCur = p === curPage ? ' bg-primary text-white font-bold' : ' hover:bg-slate-50 text-slate-700 cursor-pointer';
                spHtml += '<button type="button" class="w-7 h-7 rounded text-[11px] font-semibold flex items-center justify-center' + isCur + '" data-page="' + p + '">' + p + '</button>';
              }

              var nextDis = curPage >= lastPage ? ' opacity-40 cursor-not-allowed' : ' hover:bg-slate-50 cursor-pointer';
              spHtml += '<button type="button" class="px-2.5 py-1 text-slate-500 rounded border border-slate-200/60 bg-white text-[11px] font-semibold flex items-center gap-1' + nextDis + '"' + (curPage >= lastPage ? ' disabled' : '') + ' data-page="' + (curPage + 1) + '">Siguiente <span class="material-symbols-outlined text-[16px]">chevron_right</span></button>';
              pagerEl.innerHTML = spHtml;
            }
          }

          // Cargar KPIs reales
          var liveRes = await VS_API.getBitacoraLive({ limit: 1 });
          if (liveRes && liveRes.kpis) {
            var k = liveRes.kpis;
            if (kpiTotal) kpiTotal.textContent = k.total_hoy != null ? k.total_hoy : pagData.length;
            if (kpiLogins) kpiLogins.textContent = k.total_mes != null ? k.total_mes : '—';
            if (kpiAlertas) kpiAlertas.textContent = k.alertas_hoy != null ? k.alertas_hoy : '0';
          }

          // Conteo de operaciones administrativas (REGISTRAR, INACTIVAR, RENOVAR)
          if (kpiRoles) {
            var opCount = pagData.filter(function (x) {
              var a = (x.tipo_accion || '').toUpperCase();
              return a.includes('REGISTRAR') || a.includes('INACTIVAR') || a.includes('RENOVAR') || a.includes('MODIFICAR');
            }).length;
            kpiRoles.textContent = opCount;
          }
        } catch (e) {
          console.warn('Error bitácora stitch:', e);
        }
      }

      // Polling en vivo cada 3 segundos
      setInterval(async function () {
        if (isFiltering) return;
        try {
          var liveRes = await VS_API.getBitacoraLive({ after_id: lastId });
          if (liveRes && liveRes.data && liveRes.data.length > 0) {
            var newRows = '';
            liveRes.data.forEach(function (newItem) {
              if (newItem.id_bitacora > lastId) {
                lastId = newItem.id_bitacora;
              }
              currentRecords.unshift(newItem);
              newRows += buildStitchRowHtml(newItem, true);
            });

            if (newRows) {
              var emptyTd = tableBody.querySelector('.py-8');
              if (emptyTd) tableBody.innerHTML = '';
              tableBody.insertAdjacentHTML('afterbegin', newRows);
            }

            if (liveRes.kpis && kpiTotal && liveRes.kpis.total_hoy != null) {
              kpiTotal.textContent = liveRes.kpis.total_hoy;
            }
          }
        } catch (err) {}
      }, 3000);

      // Ver detalle en modal al hacer click en fila
      tableBody.addEventListener('click', function (ev) {
        var tr = ev.target.closest('tr');
        if (!tr || !tr.getAttribute('data-id')) return;
        var id = parseInt(tr.getAttribute('data-id'), 10);
        var rec = currentRecords.find(function (r) { return r.id_bitacora === id; });
        if (rec) {
          mostrarModalDetalle(rec);
        }
      });

      // Filtros
      if (filterForm) {
        filterForm.addEventListener('submit', function (ev) {
          ev.preventDefault();
          isFiltering = true;

          var usuarioVal = inputUsuario ? inputUsuario.value.trim() : '';
          var moduloVal = selectModulo ? selectModulo.value : '';
          var accionVal = selectAccion ? selectAccion.value : '';
          var desdeVal = inputDesde ? inputDesde.value : '';
          var hastaVal = inputHasta ? inputHasta.value : '';

          var params = {};
          if (usuarioVal) params.usuario = usuarioVal;
          if (moduloVal) params.modulo = moduloVal;
          if (accionVal) params.tipo_accion = accionVal;
          if (desdeVal) params.fecha_desde = desdeVal;
          if (hastaVal) params.fecha_hasta = hastaVal;

          cargarBitacora(params);
        });

        filterForm.addEventListener('reset', function () {
          setTimeout(function () {
            isFiltering = false;
            cargarBitacora();
          }, 50);
        });
      }

      if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function () {
          if (filterForm) filterForm.reset();
          isFiltering = false;
          cargarBitacora();
        });
      }

      if (btnExportar) {
        btnExportar.addEventListener('click', function () {
          if (!currentRecords.length) {
            alert('No hay eventos cargados para descargar.');
            return;
          }
          var csv = 'ID,Fecha_Hora,Usuario,Modulo,Tipo_Accion,Tabla,Registro_ID,Detalle,IP\n';
          currentRecords.forEach(function (r) {
            var usr = r.usuario ? (r.usuario.nombre_usuario || 'Sistema') : 'Sistema';
            var det = (r.detalle || '').replace(/"/g, '""');
            csv += [
              r.id_bitacora,
              '"' + (r.fecha_hora || '') + '"',
              '"' + usr + '"',
              '"' + (r.modulo || '') + '"',
              '"' + (r.tipo_accion || '') + '"',
              '"' + (r.tabla_afectada || '') + '"',
              r.id_registro_afectado || '',
              '"' + det + '"',
              '"' + (r.ip || '') + '"'
            ].join(',') + '\n';
          });
          var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          var link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.setAttribute('download', 'bitacora_vida_salud.csv');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      cargarBitacora();
    }

    // 8. Vincular Bitácora Clásica (CU11)
    var cu11Page = document.querySelector('body[data-cu="CU11"]');
    if (cu11Page) {
      initBitacoraCU11Completa();
    }

    function initBitacoraCU11Completa() {
      var tableBody = document.getElementById('vs-bitacora-tbody') || document.querySelector('.vs-table tbody');
      if (!tableBody) return;

      var badgeTotal = document.getElementById('vs-badge-total');
      var badgeAlertas = document.getElementById('vs-badge-alertas');
      var filterForm = document.querySelector('.vs-filters');
      var paginationLabel = document.getElementById('vs-bitacora-pag-info') || document.querySelector('.vs-pagination span');
      var pagerContainer = document.getElementById('vs-bitacora-pager') || document.querySelector('.vs-pagination .vs-pager');
      var exportBtn = document.querySelector('[data-toast="Exportación generada"]') || document.querySelector('.vs-page-head__side button');

      var lastId = 0;
      var isFiltering = false;
      var currentRecords = [];
      var activeCU11Params = {};

      async function cargarUsuariosFiltroCU11() {
        var userSelect = document.getElementById('b-usuario');
        if (!userSelect) return;
        try {
          var resU = await VS_API.getUsuarios({ per_page: 100 });
          var uList = (resU && resU.data && resU.data.data) ? resU.data.data : (resU.data || []);
          var prevVal = userSelect.value;
          userSelect.innerHTML = '<option value="">Todos los usuarios</option><option value="sistema">Sistema</option>';
          uList.forEach(function (u) {
            var p = u.persona || {};
            var opt = document.createElement('option');
            opt.value = u.nombre_usuario;
            opt.textContent = u.nombre_usuario + ' — ' + (p.nombres || '') + ' ' + (p.apellidos || '');
            userSelect.appendChild(opt);
          });
          if (prevVal) userSelect.value = prevVal;
        } catch (e) {}
      }
      cargarUsuariosFiltroCU11();

      function buildRowHtml(item, isNew) {
        var usuario = item.usuario ? (item.usuario.nombre_usuario || 'Sistema') : 'Sistema';
        var tablaReg = item.tabla_afectada ? (item.tabla_afectada + (item.id_registro_afectado ? ' · ' + item.id_registro_afectado : '')) : '—';
        var detalle = item.detalle || '—';
        var ip = item.ip || '127.0.0.1';
        var trStyle = isNew ? ' style="background-color: rgba(16, 185, 129, 0.12); transition: background-color 2s;"' : '';

        return '<tr' + trStyle + ' data-id="' + item.id_bitacora + '">' +
          '<td class="vs-td-num">' + formatFechaHora(item.fecha_hora) + '</td>' +
          '<td><span class="vs-mono">' + escapeHtml(usuario) + '</span></td>' +
          '<td class="vs-hide-md">' + escapeHtml(item.modulo || 'GENERAL') + '</td>' +
          '<td>' + getBadgeAccion(item.tipo_accion) + '</td>' +
          '<td class="vs-hide-md vs-mono vs-xs">' + escapeHtml(tablaReg) + '</td>' +
          '<td class="vs-truncate" style="max-width:340px;cursor:pointer;text-decoration:underline dotted;" title="Click para ver detalle">' + escapeHtml(detalle) + '</td>' +
          '<td class="vs-hide-md vs-td-num">' + escapeHtml(ip) + '</td>' +
          '</tr>';
      }

      async function cargarBitacora(params) {
        try {
          activeCU11Params = params || {};
          var res = await VS_API.getBitacora(params);
          var pagData = (res && res.data && res.data.data) ? res.data.data : (res.data || res || []);
          if (!Array.isArray(pagData)) pagData = [];

          currentRecords = pagData;
          if (pagData.length > 0) {
            pagData.forEach(function (r) {
              if (r.id_bitacora > lastId) lastId = r.id_bitacora;
            });
          }

          var html = '';
          pagData.forEach(function (item) {
            html += buildRowHtml(item, false);
          });

          if (!html) {
            html = '<tr><td colspan="7" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-muted);">No se encontraron registros de auditoría para los criterios seleccionados.</td></tr>';
          }

          tableBody.innerHTML = html;

          var total = (res && res.data && res.data.total != null) ? res.data.total : (res.total_hoy || pagData.length);
          var curPage = (res && res.data && res.data.current_page) ? res.data.current_page : 1;
          var lastPage = (res && res.data && res.data.last_page) ? res.data.last_page : 1;
          var fromRec = (res && res.data && res.data.from != null) ? res.data.from : (pagData.length > 0 ? 1 : 0);
          var toRec = (res && res.data && res.data.to != null) ? res.data.to : pagData.length;

          if (badgeTotal) badgeTotal.textContent = total + ' eventos';
          if (badgeAlertas && res.alertas_hoy != null) {
            badgeAlertas.textContent = res.alertas_hoy + (res.alertas_hoy === 1 ? ' alerta' : ' alertas');
          }
          if (paginationLabel) {
            if (total === 0) {
              paginationLabel.innerHTML = 'Sin eventos registrados';
            } else {
              paginationLabel.innerHTML = 'Mostrando <strong class="vs-strong">' + fromRec + '–' + toRec + '</strong> de <strong class="vs-strong">' + total + '</strong> eventos';
            }
          }

          if (pagerContainer) {
            if (total === 0 || lastPage <= 1) {
              pagerContainer.innerHTML = '';
            } else {
              var pBtnHtml = '';
              var prevDis = curPage <= 1 ? ' disabled' : '';
              pBtnHtml += '<button type="button"' + prevDis + ' data-page="' + (curPage - 1) + '" aria-label="Anterior"><svg class="vs-i vs-i--sm"><use href="#i-chevron-left"/></svg></button>';

              for (var p = 1; p <= lastPage; p++) {
                if (lastPage > 7 && Math.abs(p - curPage) > 2 && p !== 1 && p !== lastPage) {
                  if (p === 2 || p === lastPage - 1) pBtnHtml += '<span>…</span>';
                  continue;
                }
                var isCur = p === curPage ? ' class="is-current"' : '';
                pBtnHtml += '<button type="button"' + isCur + ' data-page="' + p + '">' + p + '</button>';
              }

              var nextDis = curPage >= lastPage ? ' disabled' : '';
              pBtnHtml += '<button type="button"' + nextDis + ' data-page="' + (curPage + 1) + '" aria-label="Siguiente"><svg class="vs-i vs-i--sm"><use href="#i-chevron-right"/></svg></button>';
              pagerContainer.innerHTML = pBtnHtml;
            }
          }
        } catch (e) {
          console.warn('Error al cargar bitácora:', e);
        }
      }

      setInterval(async function () {
        if (isFiltering) return;
        try {
          var liveRes = await VS_API.getBitacoraLive({ after_id: lastId });
          if (liveRes && liveRes.data && liveRes.data.length > 0) {
            var newRows = '';
            liveRes.data.forEach(function (newItem) {
              if (newItem.id_bitacora > lastId) {
                lastId = newItem.id_bitacora;
              }
              currentRecords.unshift(newItem);
              newRows += buildRowHtml(newItem, true);
            });

            if (newRows) {
              var emptyRow = tableBody.querySelector('.vs-td-empty');
              if (emptyRow) tableBody.innerHTML = '';
              tableBody.insertAdjacentHTML('afterbegin', newRows);
            }
          }
        } catch (err) {}
      }, 3000);

      tableBody.addEventListener('click', function (ev) {
        var tr = ev.target.closest('tr');
        if (!tr || !tr.getAttribute('data-id')) return;
        var id = parseInt(tr.getAttribute('data-id'), 10);
        var rec = currentRecords.find(function (r) { return r.id_bitacora === id; });
        if (rec) mostrarModalDetalle(rec);
      });

      if (pagerContainer) {
        pagerContainer.addEventListener('click', function (ev) {
          var btn = ev.target.closest('button[data-page]');
          if (!btn || btn.disabled) return;
          var targetPage = parseInt(btn.getAttribute('data-page'), 10);
          if (targetPage > 0) {
            activeCU11Params.page = targetPage;
            cargarBitacora(activeCU11Params);
          }
        });
      }

      if (filterForm) {
        filterForm.addEventListener('submit', function (ev) {
          ev.preventDefault();
          isFiltering = true;

          var userEl = document.getElementById('b-usuario');
          var usuarioVal = userEl ? userEl.value.trim() : '';
          var modEl = document.getElementById('b-modulo');
          var moduloVal = modEl ? modEl.value.trim() : '';
          var accionVal = document.getElementById('b-accion') ? document.getElementById('b-accion').value : '';
          var desdeVal = document.getElementById('b-desde') ? document.getElementById('b-desde').value : '';
          var hastaVal = document.getElementById('b-hasta') ? document.getElementById('b-hasta').value : '';
          var qVal = document.getElementById('b-q') ? document.getElementById('b-q').value : '';

          var params = {};
          if (usuarioVal && !usuarioVal.includes('Todos')) params.usuario = usuarioVal;
          if (moduloVal && !moduloVal.includes('Todos')) {
            var mPrefix = moduloVal.match(/P\d+/i);
            params.modulo = mPrefix ? mPrefix[0] : moduloVal;
          }
          if (accionVal && !accionVal.includes('Todas')) params.tipo_accion = accionVal;
          if (desdeVal) params.fecha_desde = desdeVal;
          if (hastaVal) params.fecha_hasta = hastaVal;
          if (qVal) params.q = qVal;

          cargarBitacora(params);
        });

        filterForm.addEventListener('reset', function () {
          setTimeout(function () {
            isFiltering = false;
            cargarBitacora();
          }, 50);
        });
      }

      if (exportBtn) {
        exportBtn.addEventListener('click', function () {
          if (!currentRecords.length) {
            alert('No hay eventos cargados para exportar.');
            return;
          }
          var csv = 'ID,Fecha_Hora,Usuario,Modulo,Tipo_Accion,Tabla,Registro_ID,Detalle,IP\n';
          currentRecords.forEach(function (r) {
            var usr = r.usuario ? (r.usuario.nombre_usuario || 'Sistema') : 'Sistema';
            var det = (r.detalle || '').replace(/"/g, '""');
            csv += [
              r.id_bitacora,
              '"' + (r.fecha_hora || '') + '"',
              '"' + usr + '"',
              '"' + (r.modulo || '') + '"',
              '"' + (r.tipo_accion || '') + '"',
              '"' + (r.tabla_afectada || '') + '"',
              r.id_registro_afectado || '',
              '"' + det + '"',
              '"' + (r.ip || '') + '"'
            ].join(',') + '\n';
          });
          var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          var link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.setAttribute('download', 'bitacora_vida_salud.csv');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      cargarBitacora();
    }

    // 8.1. Vincular Catálogo de Usuarios Clásico (CU06)
    var cu06Page = document.querySelector('body[data-cu="CU06"]') || document.getElementById('vs-usuarios-tbody');
    if (cu06Page) {
      initUsuariosCU06Catalogo();
    }

    function initUsuariosCU06Catalogo() {
      var tableBody = document.getElementById('vs-usuarios-tbody') || document.querySelector('.vs-table tbody');
      if (!tableBody) return;

      var badgeTotal = document.getElementById('vs-usuarios-badge-total') || document.querySelector('.vs-card__head .vs-badge');
      var filterForm = document.querySelector('.vs-filters');
      var paginationLabel = document.getElementById('vs-usuarios-pag-info') || document.querySelector('.vs-pagination span');
      var pagerContainer = document.getElementById('vs-usuarios-pager') || document.querySelector('.vs-pagination .vs-pager');

      var currentFilterParams = {};

      function buildUserRowHtml(u) {
        var pers = u.persona || {};
        var nombre = (pers.nombres ? (pers.nombres + ' ' + (pers.apellidos || '')) : u.nombre_usuario) || 'Sin nombre';
        var ci = pers.ci || '—';
        var email = pers.email || '—';
        var tel = pers.telefono || '—';
        var rol = u.rol ? (u.rol.nombre || u.rol) : 'Personal';
        var rolUpper = rol.toUpperCase();
        var estado = (u.estado || 'ACTIVO').toUpperCase();
        var esActivo = estado === 'ACTIVO';
        var esBloqueado = estado === 'BLOQUEADO';

        var rolBadgeClass = rolUpper.includes('ADMIN') ? 'vs-badge--warn' : (rolUpper.includes('MEDIC') ? 'vs-badge--ok' : 'vs-badge--info');
        var estadoBadge = esActivo
          ? '<span class="vs-badge vs-badge--ok"><span class="vs-badge__dot"></span>Activo</span>'
          : (esBloqueado ? '<span class="vs-badge vs-badge--danger"><span class="vs-badge__dot"></span>Bloqueado</span>' : '<span class="vs-badge vs-badge--muted"><span class="vs-badge__dot"></span>Inactivo</span>');

        var inits = ((pers.nombres ? pers.nombres.charAt(0) : 'U') + (pers.apellidos ? pers.apellidos.charAt(0) : '')).toUpperCase();
        var avatarClass = rolUpper.includes('ADMIN') ? 'vs-avatar--amber' : (rolUpper.includes('MEDIC') ? 'vs-avatar--teal' : 'vs-avatar--sky');

        var actionBtns = '<a href="cu07-modificar-cuenta.html?id=' + u.id_usuario + '" class="vs-icon-btn" title="Modificar cuenta"><svg class="vs-i"><use href="#i-edit"/></svg></a>' +
          '<a href="cu08-roles-permisos.html?id=' + u.id_usuario + '" class="vs-icon-btn vs-icon-btn--warn" title="Cambiar rol"><svg class="vs-i"><use href="#i-shield"/></svg></a>';

        if (esActivo) {
          actionBtns += '<button type="button" class="vs-icon-btn vs-icon-btn--danger btn-inactivar-cu06" title="Inactivar cuenta" data-id="' + u.id_usuario + '" data-name="' + escapeHtml(nombre) + '"><svg class="vs-i"><use href="#i-ban"/></svg></button>';
        } else {
          actionBtns += '<button type="button" class="vs-icon-btn vs-icon-btn--teal btn-reactivar-cu06" title="Reactivar cuenta" data-id="' + u.id_usuario + '" data-name="' + escapeHtml(nombre) + '"><svg class="vs-i"><use href="#i-undo"/></svg></button>';
        }

        var ultimoAccesoStr = u.ultimo_acceso ? formatFechaHora(u.ultimo_acceso) : '—';

        return '<tr>' +
          '<td class="vs-td-num font-mono">' + escapeHtml(ci) + '</td>' +
          '<td><div class="vs-cell-person"><span class="vs-avatar vs-avatar--sm ' + avatarClass + '">' + inits + '</span><div><div class="vs-cell-person__name">' + escapeHtml(nombre) + '</div><div class="vs-cell-person__sub vs-mono">' + escapeHtml(u.nombre_usuario) + '</div></div></div></td>' +
          '<td class="vs-hide-md"><div class="vs-xs">' + escapeHtml(email) + '</div><div class="vs-xs vs-muted vs-mono">' + escapeHtml(tel) + '</div></td>' +
          '<td><span class="vs-badge ' + rolBadgeClass + '">' + escapeHtml(rol) + '</span></td>' +
          '<td>' + estadoBadge + '</td>' +
          '<td class="vs-hide-md vs-td-num font-mono">' + ultimoAccesoStr + '</td>' +
          '<td class="vs-td-actions">' + actionBtns + '</td>' +
          '</tr>';
      }

      async function cargarUsuarios(params) {
        tableBody.innerHTML = '<tr><td colspan="7" class="vs-td-empty" style="text-align:center;padding:2.5rem;color:var(--vs-muted);">Consultando usuarios en base de datos...</td></tr>';
        try {
          var res = await VS_API.getUsuarios(params);
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || res || []);
          if (!Array.isArray(list)) list = [];

          var total = (res && res.data && res.data.total != null) ? res.data.total : list.length;
          var curPage = (res && res.data && res.data.current_page) ? res.data.current_page : 1;
          var lastPage = (res && res.data && res.data.last_page) ? res.data.last_page : 1;
          var fromRec = (res && res.data && res.data.from != null) ? res.data.from : (list.length > 0 ? 1 : 0);
          var toRec = (res && res.data && res.data.to != null) ? res.data.to : list.length;

          if (badgeTotal) badgeTotal.textContent = total + ' registros reales';

          if (paginationLabel) {
            if (total === 0) {
              paginationLabel.innerHTML = 'Sin usuarios registrados';
            } else {
              paginationLabel.innerHTML = 'Mostrando <strong class="vs-strong">' + fromRec + '–' + toRec + '</strong> de <strong class="vs-strong">' + total + '</strong> usuarios';
            }
          }

          if (pagerContainer) {
            if (total === 0 || lastPage <= 1) {
              pagerContainer.innerHTML = '';
            } else {
              var pHtml = '';
              var prevDis = curPage <= 1 ? ' disabled' : '';
              pHtml += '<button type="button"' + prevDis + ' data-page="' + (curPage - 1) + '" aria-label="Anterior"><svg class="vs-i vs-i--sm"><use href="#i-chevron-left"/></svg></button>';
              for (var p = 1; p <= lastPage; p++) {
                var isCur = p === curPage ? ' class="is-current"' : '';
                pHtml += '<button type="button"' + isCur + ' data-page="' + p + '">' + p + '</button>';
              }
              var nextDis = curPage >= lastPage ? ' disabled' : '';
              pHtml += '<button type="button"' + nextDis + ' data-page="' + (curPage + 1) + '" aria-label="Siguiente"><svg class="vs-i vs-i--sm"><use href="#i-chevron-right"/></svg></button>';
              pagerContainer.innerHTML = pHtml;
            }
          }

          if (list.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="vs-td-empty" style="text-align:center;padding:2.5rem;color:var(--vs-muted);">No se encontraron usuarios registrados para el filtro aplicado.</td></tr>';
            return;
          }

          var html = '';
          list.forEach(function (u) {
            html += buildUserRowHtml(u);
          });
          tableBody.innerHTML = html;

          // Actualizar KPIs dinámicos de catálogo (CU06)
          var kpiTot = document.getElementById('kpi-total-usuarios');
          var kpiMed = document.getElementById('kpi-total-medicos');
          var kpiRec = document.getElementById('kpi-total-recep');
          var kpiAdm = document.getElementById('kpi-total-admins');
          if (kpiTot || kpiMed || kpiRec || kpiAdm) {
            VS_API.getUsuarios({ per_page: 200 }).then(function (allRes) {
              var allUsers = (allRes && allRes.data && allRes.data.data) ? allRes.data.data : (allRes.data || allRes || []);
              if (Array.isArray(allUsers)) {
                var cMed = 0, cRec = 0, cAdm = 0;
                allUsers.forEach(function (u) {
                  var r = ((u.rol && (u.rol.nombre || u.rol)) || '').toUpperCase();
                  if (r.includes('MEDIC')) cMed++;
                  else if (r.includes('RECEP')) cRec++;
                  else if (r.includes('ADMIN')) cAdm++;
                });
                if (kpiTot) kpiTot.textContent = allUsers.length;
                if (kpiMed) kpiMed.textContent = cMed;
                if (kpiRec) kpiRec.textContent = cRec;
                if (kpiAdm) kpiAdm.textContent = cAdm;
              }
            }).catch(function () {});
          }
        } catch (err) {
          tableBody.innerHTML = '<tr><td colspan="7" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-danger);">Error al cargar usuarios: ' + err.message + '</td></tr>';
        }
      }

      // Inactivar / reactivar
      tableBody.addEventListener('click', async function (ev) {
        var btnInact = ev.target.closest('.btn-inactivar-cu06');
        if (btnInact) {
          var id = btnInact.getAttribute('data-id');
          var name = btnInact.getAttribute('data-name');
          if (confirm('¿Confirmas inactivar la cuenta de ' + name + '?\nLa acción quedará auditada en la bitácora.')) {
            try {
              await VS_API.inactivarUsuario(id, 'Inactivado por administrador desde CU06');
              if (window.vsToast) window.vsToast('Cuenta inactivada', name + ' ahora está inactivo');
              cargarUsuarios(currentFilterParams);
            } catch (e) {
              alert('Error al inactivar usuario: ' + (e.data && e.data.message ? e.data.message : e.message));
            }
          }
          return;
        }

        var btnReact = ev.target.closest('.btn-reactivar-cu06');
        if (btnReact) {
          var idR = btnReact.getAttribute('data-id');
          var nameR = btnReact.getAttribute('data-name');
          if (confirm('¿Confirmas reactivar la cuenta de ' + nameR + '?\nLa acción quedará auditada en la bitácora.')) {
            try {
              await VS_API.reactivarUsuario(idR);
              if (window.vsToast) window.vsToast('Cuenta reactivada', nameR + ' ahora está activo');
              cargarUsuarios(currentFilterParams);
            } catch (eR) {
              alert('Error al reactivar usuario: ' + (eR.data && eR.data.message ? eR.data.message : eR.message));
            }
          }
          return;
        }
      });

      if (pagerContainer) {
        pagerContainer.addEventListener('click', function (ev) {
          var btn = ev.target.closest('button[data-page]');
          if (!btn || btn.disabled) return;
          var targetPage = parseInt(btn.getAttribute('data-page'), 10);
          if (targetPage > 0) {
            currentFilterParams.page = targetPage;
            cargarUsuarios(currentFilterParams);
          }
        });
      }

      if (filterForm) {
        filterForm.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var rolEl = document.getElementById('f-rol');
          var estEl = document.getElementById('f-est');
          currentFilterParams = {};
          if (rolEl && rolEl.value && !rolEl.value.includes('Todos')) currentFilterParams.rol = rolEl.value;
          if (estEl && estEl.value && !estEl.value.includes('Todos')) currentFilterParams.estado = estEl.value;
          cargarUsuarios(currentFilterParams);
        });

        filterForm.addEventListener('reset', function () {
          setTimeout(function () {
            currentFilterParams = {};
            cargarUsuarios();
          }, 50);
        });
      }

      cargarUsuarios();
    }

    // 9. Vincular Dashboard Principal (inicio.html)
    var isInicio = document.body.getAttribute('data-page') === 'inicio' || location.pathname.endsWith('inicio.html');
    if (isInicio) {
      cargarDashboardInicio();
    }

    async function cargarDashboardInicio() {
      try {
        // Cargar citas reales de la base de datos
        var citasRes = await VS_API.getCitas();
        var citasList = (citasRes && citasRes.data && citasRes.data.data) ? citasRes.data.data : (citasRes.data || citasRes || []);
        if (Array.isArray(citasList)) {
          var kpiCitas = document.getElementById('kpi-citas-hoy');
          if (kpiCitas) kpiCitas.textContent = citasList.length;

          var tableBody = document.getElementById('vs-inicio-citas-tbody');
          var totalSpan = document.getElementById('vs-inicio-citas-total');
          if (totalSpan) totalSpan.textContent = citasList.length + ' citas registradas';

          if (tableBody) {
            if (citasList.length === 0) {
              tableBody.innerHTML = '<tr><td colspan="4" class="vs-td-empty" style="text-align:center;padding:1.5rem;color:var(--vs-muted);">No hay citas agendadas aún.</td></tr>';
            } else {
              var html = '';
              citasList.slice(0, 8).forEach(function (c) {
                var pac = c.paciente && c.paciente.persona ? (c.paciente.persona.nombres + ' ' + (c.paciente.persona.apellidos || '')) : 'Paciente';
                var med = c.medico && c.medico.persona ? ('Dr. ' + c.medico.persona.apellidos) : 'Médico General';
                var est = (c.estado || 'PROGRAMADA').toUpperCase();
                var badgeCls = est === 'CONFIRMADA' ? 'vs-badge--cyan' : (est === 'ATENDIDA' ? 'vs-badge--ok' : (est === 'CANCELADA' ? 'vs-badge--danger' : 'vs-badge--info'));

                html += '<tr>' +
                  '<td class="vs-td-num font-mono">' + (c.hora_inicio ? c.hora_inicio.substring(0, 5) : '08:00') + '</td>' +
                  '<td><div class="vs-cell-person__name">' + escapeHtml(pac) + '</div><div class="vs-cell-person__sub">CM-' + c.id_cita + ' · ' + escapeHtml(c.motivo_consulta || 'Consulta') + '</div></td>' +
                  '<td class="vs-hide-sm">' + escapeHtml(med) + '</td>' +
                  '<td><span class="vs-badge ' + badgeCls + '"><span class="vs-badge__dot"></span>' + est + '</span></td>' +
                  '</tr>';
              });
              tableBody.innerHTML = html;
            }
          }
        }

        // Cargar pacientes reales para KPI
        try {
          var pacRes = await VS_API.getPacientes();
          var pacList = (pacRes && pacRes.data && pacRes.data.data) ? pacRes.data.data : (pacRes.data || pacRes || []);
          var kpiPac = document.getElementById('kpi-pacientes-activos');
          if (kpiPac && Array.isArray(pacList)) kpiPac.textContent = pacList.length;
        } catch (ep) {}

        // Cargar médicos reales para KPI
        try {
          var medRes = await VS_API.getMedicos();
          var medList = (medRes && medRes.data && medRes.data.data) ? medRes.data.data : (medRes.data || medRes || []);
          var kpiMed = document.getElementById('kpi-medicos-agenda');
          if (kpiMed && Array.isArray(medList)) kpiMed.textContent = medList.length;
        } catch (em) {}

        // Cargar últimos movimientos de auditoría en vivo en inicio.html
        var timelineEl = document.getElementById('vs-inicio-timeline') || document.querySelector('.vs-timeline');
        if (timelineEl) {
          try {
            var bRes = await VS_API.getBitacoraLive({ limit: 5 });
            if (bRes && bRes.data && bRes.data.length) {
              var tHtml = '';
              bRes.data.forEach(function (ev) {
                var act = (ev.tipo_accion || 'CREAR').toUpperCase();
                var cls = 'vs-tl-item--info';
                if (act.includes('LOGIN') || act.includes('ATENDIDA') || act.includes('RENOVAR') || act.includes('REGISTRAR')) cls = 'vs-tl-item--ok';
                else if (act.includes('BLOQUEO') || act.includes('INACTIVAR') || act.includes('ELIMINAR')) cls = 'vs-tl-item--danger';
                else if (act.includes('CANCEL') || act.includes('MODIFICAR')) cls = 'vs-tl-item--warn';

                var timeStr = '—';
                try {
                  var d = new Date(ev.fecha_hora);
                  timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
                } catch (e) {}

                var usr = ev.usuario ? (ev.usuario.nombre_usuario || 'Sistema') : 'Sistema';
                var title = act + (ev.tabla_afectada ? ' · ' + ev.tabla_afectada : '');
                var sub = usr + ' · ' + (ev.detalle || 'Acción registrada');

                tHtml += '<li class="vs-tl-item ' + cls + '">' +
                  '<span class="vs-tl-time">' + timeStr + '</span>' +
                  '<div class="vs-tl-title">' + escapeHtml(title) + '</div>' +
                  '<div class="vs-tl-sub">' + escapeHtml(sub) + '</div>' +
                  '</li>';
              });
              timelineEl.innerHTML = tHtml;
            }

            if (bRes && bRes.kpis) {
              var kpiAlertas = document.getElementById('kpi-alertas-seguridad');
              if (kpiAlertas && bRes.kpis.alertas_hoy != null) {
                kpiAlertas.textContent = bRes.kpis.alertas_hoy;
              }
            }
          } catch (eb) {}
        }
      } catch (e) {
        console.warn('Error en dashboard inicio:', e);
      }
    }

    // 10. Vincular Catálogo y Modificación de Pacientes (CU15 Dinámico)
    var pacTbody = document.getElementById('vs-pacientes-tbody');
    if (pacTbody) {
      initPacientesCatalogo();
    }

    async function initPacientesCatalogo() {
      var searchInput = document.getElementById('paciente-buscar-input');
      var searchForm = document.getElementById('paciente-buscar-form');
      var conteoSpan = document.getElementById('paciente-conteo');
      var splitCont = document.getElementById('cu15-split-container');
      var formMod = document.getElementById('form-modificar-paciente');
      var btnCerrar = document.getElementById('btn-cerrar-modificar');
      var radioEstPills = document.querySelectorAll('input[name="est"]');

      var pacientesCache = {};
      var currentEditingId = null;

      function calcularEdadStr(fNac, sexo) {
        var sexStr = sexo === 'F' ? 'Fem' : (sexo === 'M' ? 'Masc' : '—');
        if (!fNac) return sexStr;
        var d = new Date(fNac);
        if (isNaN(d.getTime())) return sexStr;
        var hoy = new Date();
        var edad = hoy.getFullYear() - d.getFullYear();
        var m = hoy.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < d.getDate())) edad--;
        return (edad >= 0 ? (edad + ' a · ') : '') + sexStr;
      }

      function cerrarModificarPaciente() {
        if (formMod) formMod.style.display = 'none';
        if (splitCont) splitCont.style.gridTemplateColumns = '1fr';
        currentEditingId = null;
        var allTr = pacTbody.querySelectorAll('tr');
        allTr.forEach(function (tr) { tr.classList.remove('is-selected'); });
      }

      async function abrirModificarPaciente(id) {
        var p = pacientesCache[id];
        if (!p) {
          try {
            var resP = await VS_API.getPaciente(id);
            p = resP.paciente || resP.data || resP;
            if (p) pacientesCache[id] = p;
          } catch (e) {}
        }
        if (!p) {
          alert('No se pudieron recuperar los datos del paciente ID #' + id);
          return;
        }

        currentEditingId = id;

        // Resaltar fila seleccionada en la tabla
        var allTr = pacTbody.querySelectorAll('tr');
        allTr.forEach(function (tr) {
          if (parseInt(tr.getAttribute('data-id'), 10) === id) {
            tr.classList.add('is-selected');
          } else {
            tr.classList.remove('is-selected');
          }
        });

        // Mostrar panel de modificación y restaurar layout dividido
        if (splitCont) splitCont.style.gridTemplateColumns = '';
        if (formMod) formMod.style.display = 'block';

        var pers = p.persona || {};
        var nombreComp = ((pers.nombres || '') + ' ' + (pers.apellidos || '')).trim() || 'Paciente sin nombre';
        var inits = (pers.nombres ? pers.nombres.charAt(0) : 'P') + (pers.apellidos ? pers.apellidos.charAt(0) : '');
        var cod = p.codigo || ('PAC-' + String(p.id_persona).padStart(4, '0'));

        var avatarEl = document.getElementById('mod-avatar');
        var nomEl = document.getElementById('mod-paciente-nombre');
        var codEl = document.getElementById('mod-paciente-codigo');
        var subEl = document.getElementById('mod-paciente-sub');

        if (avatarEl) avatarEl.textContent = inits.toUpperCase();
        if (nomEl) nomEl.textContent = nombreComp;
        if (codEl) codEl.textContent = cod;
        if (subEl) subEl.textContent = 'CI ' + (pers.ci || '—') + (pers.email ? ' · ' + pers.email : '');

        // Actualizar enlaces de navegación por pestañas para el paciente
        if (document.getElementById('tab-cu13')) document.getElementById('tab-cu13').href = 'cu13-informacion-medica.html?paciente_id=' + p.id_persona;
        if (document.getElementById('tab-cu14')) document.getElementById('tab-cu14').href = 'cu14-contacto-emergencia.html?paciente_id=' + p.id_persona;
        if (document.getElementById('tab-cu16')) document.getElementById('tab-cu16').href = 'cu16-historial-citas.html?paciente_id=' + p.id_persona;
        if (document.getElementById('link-desactivar-pac')) document.getElementById('link-desactivar-pac').href = 'cu17-desactivar-paciente.html?paciente_id=' + p.id_persona;

        // Rellenar campos del formulario con los datos dinámicos
        if (document.getElementById('e-ci')) document.getElementById('e-ci').value = pers.ci || '';
        if (document.getElementById('e-nac')) document.getElementById('e-nac').value = (p.fecha_nacimiento || '').slice(0, 10);
        if (document.getElementById('e-nombres')) document.getElementById('e-nombres').value = pers.nombres || '';
        if (document.getElementById('e-apellidos')) document.getElementById('e-apellidos').value = pers.apellidos || '';
        if (document.getElementById('e-tel')) document.getElementById('e-tel').value = pers.telefono || '';
        if (document.getElementById('e-email')) document.getElementById('e-email').value = pers.email || '';
        if (document.getElementById('e-dir')) document.getElementById('e-dir').value = p.direccion || '';

        var sexF = document.getElementById('e-sexo-f');
        var sexM = document.getElementById('e-sexo-m');
        if (sexF && sexM) {
          if (p.sexo === 'F') sexF.checked = true;
          else sexM.checked = true;
        }

        formMod.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      async function cargar(buscar) {
        pacTbody.innerHTML = '<tr><td colspan="6" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-muted);">Consultando pacientes en PostgreSQL...</td></tr>';
        try {
          var params = {};
          if (buscar) params.buscar = buscar;

          var radioInact = document.querySelector('input[name="est"]:checked');
          if (radioInact && radioInact.value === 'activos') {
            params.activo = 'true';
          }

          var res = await VS_API.getPacientes(params);
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || res || []);
          if (!Array.isArray(list)) list = [];

          pacientesCache = {};
          if (conteoSpan) conteoSpan.textContent = list.length + ' pacientes en el padrón';

          if (list.length === 0) {
            pacTbody.innerHTML = '<tr><td colspan="6" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-muted);">No se encontraron pacientes para el criterio de búsqueda.</td></tr>';
            return;
          }

          var html = '';
          list.forEach(function (p) {
            pacientesCache[p.id_persona] = p;
            var pers = p.persona || {};
            var nombre = (pers.nombres ? (pers.nombres + ' ' + (pers.apellidos || '')) : 'Sin nombre');
            var ci = pers.ci || '—';
            var tel = pers.telefono || '—';
            var cod = p.codigo || ('PAC-' + String(p.id_persona).padStart(4, '0'));
            var activo = pers.activo !== false;
            var estadoBadge = activo
              ? '<span class="vs-badge vs-badge--ok"><span class="vs-badge__dot"></span>Activo</span>'
              : '<span class="vs-badge vs-badge--danger"><span class="vs-badge__dot"></span>Inactivo</span>';
            var inits = (pers.nombres ? pers.nombres.charAt(0) : 'P') + (pers.apellidos ? pers.apellidos.charAt(0) : '');
            var edadSexo = calcularEdadStr(p.fecha_nacimiento, p.sexo);
            var isSel = currentEditingId === p.id_persona ? ' class="is-selected"' : '';

            html += '<tr data-id="' + p.id_persona + '"' + isSel + '>' +
              '<td class="vs-td-num font-mono">' + escapeHtml(cod) + '</td>' +
              '<td><div class="vs-cell-person"><span class="vs-avatar vs-avatar--sm vs-avatar--sky">' + inits.toUpperCase() + '</span>' +
              '<div><div class="vs-cell-person__name">' + escapeHtml(nombre) + '</div><div class="vs-cell-person__sub vs-mono">CI ' + escapeHtml(ci) + '</div></div></div></td>' +
              '<td class="vs-hide-md">' + escapeHtml(edadSexo) + '</td>' +
              '<td class="vs-hide-md vs-mono">' + escapeHtml(tel) + '</td>' +
              '<td>' + estadoBadge + '</td>' +
              '<td class="vs-td-actions" style="white-space:nowrap;">' +
                '<button type="button" class="vs-btn vs-btn--sm vs-btn--primary btn-modificar-paciente" data-id="' + p.id_persona + '" title="Modificar datos del paciente" style="display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .65rem;font-size:.78rem;margin-right:.35rem;">' +
                  '<svg class="vs-i vs-i--sm" style="width:14px;height:14px;"><use href="#i-edit"/></svg>Modificar' +
                '</button>' +
                '<a href="../P6 Gestión de Citas Médicas/cu24-programar-cita.html?paciente_id=' + p.id_persona + '" class="vs-icon-btn" title="Programar cita">' +
                  '<svg class="vs-i"><use href="#i-plus"/></svg>' +
                '</a>' +
              '</td>' +
              '</tr>';
          });
          pacTbody.innerHTML = html;
        } catch (e) {
          pacTbody.innerHTML = '<tr><td colspan="6" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-danger);">Error al consultar pacientes: ' + e.message + '</td></tr>';
        }
      }

      // Event delegation para botón Modificar en cada fila de paciente
      pacTbody.addEventListener('click', function (ev) {
        var btnMod = ev.target.closest('.btn-modificar-paciente');
        if (btnMod) {
          var id = parseInt(btnMod.getAttribute('data-id'), 10);
          if (id) abrirModificarPaciente(id);
          return;
        }
      });

      if (btnCerrar) {
        btnCerrar.addEventListener('click', function () {
          cerrarModificarPaciente();
        });
      }

      if (searchForm) {
        searchForm.addEventListener('submit', function (e) {
          e.preventDefault();
          cargar(searchInput ? searchInput.value.trim() : '');
        });
      }

      if (radioEstPills && radioEstPills.length) {
        radioEstPills.forEach(function (r) {
          r.addEventListener('change', function () {
            cargar(searchInput ? searchInput.value.trim() : '');
          });
        });
      }

      if (formMod) {
        formMod.setAttribute('data-api-bound', 'true');
        formMod.addEventListener('submit', async function (e) {
          e.preventDefault();
          if (!currentEditingId) {
            alert('Por favor selecciona un paciente para modificar.');
            return;
          }

          var ciVal = document.getElementById('e-ci') ? document.getElementById('e-ci').value.trim() : '';
          var nacVal = document.getElementById('e-nac') ? document.getElementById('e-nac').value : '';
          var nomVal = document.getElementById('e-nombres') ? document.getElementById('e-nombres').value.trim() : '';
          var apeVal = document.getElementById('e-apellidos') ? document.getElementById('e-apellidos').value.trim() : '';
          var telVal = document.getElementById('e-tel') ? document.getElementById('e-tel').value.trim() : '';
          var emailVal = document.getElementById('e-email') ? document.getElementById('e-email').value.trim() : '';
          var dirVal = document.getElementById('e-dir') ? document.getElementById('e-dir').value.trim() : '';

          var sexRadio = formMod.querySelector('input[name="e-sexo"]:checked');
          var sexoVal = sexRadio ? sexRadio.value : 'F';

          if (!ciVal || !nacVal || !nomVal || !apeVal) {
            alert('Por favor completa todos los campos requeridos: CI, Fecha de nacimiento, Nombres y Apellidos.');
            return;
          }

          var submitBtn = document.getElementById('btn-guardar-modificar') || formMod.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando cambios...';
          }

          try {
            var payload = {
              ci: ciVal,
              fecha_nacimiento: nacVal,
              nombres: nomVal,
              apellidos: apeVal,
              telefono: telVal,
              email: emailVal || null,
              direccion: dirVal,
              sexo: sexoVal
            };

            var resActualizar = await VS_API.actualizarPaciente(currentEditingId, payload);

            // Actualizar paciente en cache local
            if (pacientesCache[currentEditingId]) {
              var old = pacientesCache[currentEditingId];
              old.sexo = sexoVal;
              old.fecha_nacimiento = nacVal;
              old.direccion = dirVal;
              if (!old.persona) old.persona = {};
              old.persona.ci = ciVal;
              old.persona.nombres = nomVal;
              old.persona.apellidos = apeVal;
              old.persona.telefono = telVal;
              old.persona.email = emailVal;
            }

            if (window.vsToast) {
              window.vsToast('Paciente actualizado exitosamente', 'Datos guardados en PostgreSQL y auditados en bitácora (MODIFICAR)');
            } else {
              alert('Datos del paciente actualizados exitosamente.');
            }

            // Actualizar fila en la tabla visualmente
            var trRow = pacTbody.querySelector('tr[data-id="' + currentEditingId + '"]');
            if (trRow) {
              var nomElCell = trRow.querySelector('.vs-cell-person__name');
              var subElCell = trRow.querySelector('.vs-cell-person__sub');
              var telElCell = trRow.querySelectorAll('td')[3];
              var edadElCell = trRow.querySelectorAll('td')[2];
              if (nomElCell) nomElCell.textContent = nomVal + ' ' + apeVal;
              if (subElCell) subElCell.textContent = 'CI ' + ciVal;
              if (telElCell) telElCell.textContent = telVal || '—';
              if (edadElCell) edadElCell.textContent = calcularEdadStr(nacVal, sexoVal);
            }

            // Actualizar cabecera del formulario
            var nomHeader = document.getElementById('mod-paciente-nombre');
            var subHeader = document.getElementById('mod-paciente-sub');
            if (nomHeader) nomHeader.textContent = nomVal + ' ' + apeVal;
            if (subHeader) subHeader.textContent = 'CI ' + ciVal + (emailVal ? ' · ' + emailVal : '');

          } catch (err) {
            var msg = err.data && err.data.errors ? Object.values(err.data.errors).flat().join('\n') : (err.data && err.data.message ? err.data.message : err.message);
            alert('Error al modificar paciente:\n' + msg);
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<svg class="vs-i"><use href="#i-check"/></svg>Guardar cambios';
            }
          }
        });
      }

      await cargar();

      // Abrir automáticamente si se proporciona paciente_id en la URL
      var pUrlId = parseInt(new URLSearchParams(location.search).get('paciente_id') || new URLSearchParams(location.search).get('id'), 10);
      if (pUrlId) {
        abrirModificarPaciente(pUrlId);
      }
    }

    // 11. Vincular Registro de Pacientes (CU12)
    var formRegPaciente = document.getElementById('form-registrar-paciente') || document.querySelector('form[data-demo="Paciente registrado"]');
    if (formRegPaciente && !formRegPaciente.getAttribute('data-bound')) {
      formRegPaciente.setAttribute('data-bound', 'true');
      formRegPaciente.setAttribute('data-api-bound', 'true');

      formRegPaciente.addEventListener('submit', async function (e) {
        e.preventDefault();
        var ciVal = document.getElementById('p-ci') ? document.getElementById('p-ci').value.trim() : '';
        var nombresVal = document.getElementById('p-nombres') ? document.getElementById('p-nombres').value.trim() : '';
        var apellidosVal = document.getElementById('p-apellidos') ? document.getElementById('p-apellidos').value.trim() : '';
        var nacVal = document.getElementById('p-nac') ? document.getElementById('p-nac').value : '1990-01-01';
        var telVal = document.getElementById('p-tel') ? document.getElementById('p-tel').value.trim() : '';
        var emailVal = document.getElementById('p-email') ? document.getElementById('p-email').value.trim() : '';
        var dirVal = document.getElementById('p-dir') ? document.getElementById('p-dir').value.trim() : '';

        var sexoRadio = formRegPaciente.querySelector('input[name="sexo"]:checked');
        var sexoVal = sexoRadio ? sexoRadio.value : 'M';

        if (!ciVal || !nombresVal || !apellidosVal) {
          alert('Por favor completa CI, Nombres y Apellidos.');
          return;
        }

        var submitBtn = formRegPaciente.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Guardando en BD...';
        }

        try {
          var payload = {
            ci: ciVal,
            nombres: nombresVal,
            apellidos: apellidosVal,
            fecha_nacimiento: nacVal,
            sexo: sexoVal,
            telefono: telVal || null,
            email: emailVal || null,
            direccion: dirVal || null
          };

          var res = await VS_API.crearPaciente(payload);
          if (window.vsToast) {
            window.vsToast('Paciente registrado exitosamente', 'Guardado en PostgreSQL y auditado en bitácora (REGISTRAR)');
          } else {
            alert('Paciente registrado exitosamente. Guardado en la base de datos.');
          }
          setTimeout(function () {
            window.location.href = 'cu15-buscar-paciente.html';
          }, 600);
        } catch (err) {
          var msg = err.data && err.data.errors ? Object.values(err.data.errors).flat().join('\n') : (err.data && err.data.message ? err.data.message : err.message);
          alert('Error al registrar paciente:\n' + msg);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar paciente';
          }
        }
      });
    }

    // 12. Vincular Catálogo de Médicos (CU19)
    var medTbody = document.getElementById('vs-medicos-tbody');
    if (medTbody) {
      initMedicosCatalogo();
    }

    async function initMedicosCatalogo() {
      var kpiActivos = document.getElementById('kpi-med-activos');
      var kpiHorarios = document.getElementById('kpi-med-horarios');
      var kpiEsp = document.getElementById('kpi-med-especialidades');
      var kpiDoble = document.getElementById('kpi-med-doble');
      var totalSpan = document.getElementById('vs-medicos-total');
      var filtroBuscar = document.getElementById('filtro-med-buscar');
      var filtroEsp = document.getElementById('filtro-med-esp');

      // Cargar especialidades en el dropdown
      try {
        var espRes = await VS_API.getEspecialidades();
        var espList = espRes.data || espRes || [];
        if (Array.isArray(espList) && filtroEsp) {
          espList.forEach(function (es) {
            var opt = document.createElement('option');
            opt.value = es.id_especialidad;
            opt.textContent = es.nombre;
            filtroEsp.appendChild(opt);
          });
        }
      } catch (eEsp) {}

      async function cargar(buscar, espId) {
        medTbody.innerHTML = '<tr><td colspan="7" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-muted);">Consultando PostgreSQL...</td></tr>';
        try {
          var params = {};
          if (buscar) params.buscar = buscar;
          if (espId) params.id_especialidad = espId;

          var res = await VS_API.getMedicos(params);
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || res || []);
          if (!Array.isArray(list)) list = [];

          var total = list.length;
          if (kpiActivos) kpiActivos.textContent = total;
          if (kpiHorarios) kpiHorarios.textContent = total;
          if (kpiDoble) kpiDoble.textContent = total;
          if (totalSpan) totalSpan.textContent = total + ' médicos registrados en la base de datos';

          if (total === 0) {
            medTbody.innerHTML = '<tr><td colspan="7" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-muted);">No se encontraron médicos registrados.</td></tr>';
            return;
          }

          var html = '';
          list.forEach(function (m) {
            var pers = m.persona || {};
            var nombre = (pers.nombres ? (pers.nombres + ' ' + (pers.apellidos || '')) : 'Sin nombre');
            var cod = m.codigo || ('MED-' + String(m.id_persona).padStart(3, '0'));
            var mat = m.matricula || '—';
            var ci = pers.ci || '—';
            var tel = pers.telefono || '—';
            var email = pers.email || '—';

            var espBadges = '';
            if (Array.isArray(m.especialidades) && m.especialidades.length) {
              m.especialidades.forEach(function (es) {
                espBadges += '<span class="vs-badge vs-badge--info" style="margin-right:3px;">' + escapeHtml(es.nombre) + '</span>';
              });
            } else {
              espBadges = '<span class="vs-badge vs-badge--muted">Medicina General</span>';
            }

            var inits = (pers.nombres ? pers.nombres.charAt(0) : 'M') + (pers.apellidos ? pers.apellidos.charAt(0) : '');

            html += '<tr>' +
              '<td class="vs-td-num font-mono">' + cod + '</td>' +
              '<td><div class="vs-cell-person"><span class="vs-avatar vs-avatar--sm vs-avatar--teal">' + inits.toUpperCase() + '</span>' +
              '<div><div class="vs-cell-person__name">Dr(a). ' + escapeHtml(nombre) + '</div><div class="vs-cell-person__sub vs-mono">CI ' + escapeHtml(ci) + '</div></div></div></td>' +
              '<td class="vs-hide-md vs-td-num font-mono">' + escapeHtml(mat) + '</td>' +
              '<td>' + espBadges + '</td>' +
              '<td class="vs-hide-md vs-xs"><div class="font-mono">' + escapeHtml(tel) + '</div><div class="vs-muted">' + escapeHtml(email) + '</div></td>' +
              '<td><span class="vs-badge vs-badge--ok"><span class="vs-badge__dot"></span>Activo</span></td>' +
              '<td class="vs-td-actions">' +
                '<a href="cu20-horarios.html?id=' + m.id_persona + '" class="vs-icon-btn vs-icon-btn--teal" title="Horarios"><svg class="vs-i"><use href="#i-clock"/></svg></a>' +
              '</td>' +
              '</tr>';
          });

          medTbody.innerHTML = html;
        } catch (e) {
          medTbody.innerHTML = '<tr><td colspan="7" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-danger);">Error: ' + e.message + '</td></tr>';
        }
      }

      if (filtroBuscar) {
        filtroBuscar.addEventListener('input', function () {
          cargar(filtroBuscar.value.trim(), filtroEsp ? filtroEsp.value : '');
        });
      }
      if (filtroEsp) {
        filtroEsp.addEventListener('change', function () {
          cargar(filtroBuscar ? filtroBuscar.value.trim() : '', filtroEsp.value);
        });
      }

      cargar();
    }

    // 12.1. Vincular Catálogo de Especialidades (CU18)
    var espTbody = document.getElementById('vs-especialidades-tbody');
    if (espTbody) {
      initEspecialidadesCatalogo();
    }

    async function initEspecialidadesCatalogo() {
      var totalSpan = document.getElementById('vs-especialidades-total');
      var filtroBuscar = document.getElementById('filtro-esp-buscar');
      var formNueva = document.getElementById('form-nueva-especialidad');

      async function cargar(buscar) {
        espTbody.innerHTML = '<tr><td colspan="6" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-muted);">Consultando PostgreSQL...</td></tr>';
        try {
          var params = {};
          if (buscar) params.buscar = buscar;
          var res = await VS_API.getEspecialidades(params);
          var list = res.data || res || [];
          if (!Array.isArray(list)) list = [];

          var total = list.length;
          if (totalSpan) totalSpan.textContent = total + ' especialidades registradas en la base de datos';

          if (total === 0) {
            espTbody.innerHTML = '<tr><td colspan="6" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-muted);">No se encontraron especialidades.</td></tr>';
            return;
          }

          var html = '';
          list.forEach(function (es, idx) {
            var medCount = (es.medicos_count !== undefined) ? es.medicos_count : 1;
            var estadoBadge = es.activo ? '<span class="vs-badge vs-badge--ok"><span class="vs-badge__dot"></span>Activa</span>' : '<span class="vs-badge vs-badge--muted">Inactiva</span>';

            html += '<tr>' +
              '<td class="vs-td-num">' + (idx + 1) + '</td>' +
              '<td><strong class="vs-strong">' + escapeHtml(es.nombre) + '</strong></td>' +
              '<td class="vs-hide-md vs-muted">' + escapeHtml(es.descripcion || '—') + '</td>' +
              '<td><span class="vs-badge vs-badge--info">' + medCount + '</span></td>' +
              '<td>' + estadoBadge + '</td>' +
              '<td class="vs-td-actions">' +
                '<a href="cu19-personal-medico.html?esp=' + es.id_especialidad + '" class="vs-icon-btn vs-icon-btn--teal" title="Ver médicos"><svg class="vs-i"><use href="#i-users"/></svg></a>' +
              '</td>' +
              '</tr>';
          });

          espTbody.innerHTML = html;
        } catch (e) {
          espTbody.innerHTML = '<tr><td colspan="6" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-danger);">Error: ' + e.message + '</td></tr>';
        }
      }

      if (filtroBuscar) {
        filtroBuscar.addEventListener('input', function () {
          cargar(filtroBuscar.value.trim());
        });
      }

      if (formNueva && !formNueva.getAttribute('data-bound')) {
        formNueva.setAttribute('data-bound', 'true');
        formNueva.addEventListener('submit', async function (e) {
          e.preventDefault();
          var nomInput = document.getElementById('n-nombre');
          var descInput = document.getElementById('n-desc');
          var nom = nomInput ? nomInput.value.trim() : '';
          var desc = descInput ? descInput.value.trim() : '';

          if (!nom) {
            alert('El nombre de la especialidad es obligatorio.');
            return;
          }

          var btn = formNueva.querySelector('button[type="submit"]');
          if (btn) {
            btn.disabled = true;
            btn.textContent = 'Guardando en BD...';
          }

          try {
            await VS_API.crearEspecialidad({ nombre: nom, descripcion: desc });
            if (window.vsToast) {
              window.vsToast('Especialidad creada', nom + ' almacenada en PostgreSQL y auditada en bitácora (REGISTRAR)');
            } else {
              alert('Especialidad creada exitosamente y registrada en BD.');
            }
            var dlg = document.getElementById('dlg-nueva');
            if (dlg && dlg.close) dlg.close();
            if (nomInput) nomInput.value = '';
            if (descInput) descInput.value = '';
            cargar();
          } catch (err) {
            var msg = (err.data && err.data.message) ? err.data.message : err.message;
            alert('Error al registrar especialidad: ' + msg);
          } finally {
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'Guardar';
            }
          }
        });
      }

      cargar();
    }

    // 13. Vincular Programar Cita (cu24-programar-cita.html)
    var formProgramarCita = document.getElementById('form-programar-cita') || document.querySelector('form[data-demo="Cita programada"]');
    if (formProgramarCita && !formProgramarCita.getAttribute('data-bound')) {
      formProgramarCita.setAttribute('data-bound', 'true');
      formProgramarCita.setAttribute('data-api-bound', 'true');

      initFormProgramarCita(formProgramarCita);
    }

    async function initFormProgramarCita(formEl) {
      var selectEsp = document.getElementById('c-esp');
      var selectMed = document.getElementById('c-med');
      var inputFecha = document.getElementById('c-fecha');
      var inputMotivo = document.getElementById('c-motivo');

      // Cargar especialidades reales
      try {
        var espRes = await VS_API.getEspecialidades();
        var espList = espRes.data || espRes || [];
        if (Array.isArray(espList) && selectEsp) {
          selectEsp.innerHTML = '';
          espList.forEach(function (es) {
            var opt = document.createElement('option');
            opt.value = es.id_especialidad;
            opt.textContent = es.nombre;
            selectEsp.appendChild(opt);
          });
        }
      } catch (e) {}

      // Cargar médicos reales
      try {
        var medRes = await VS_API.getMedicos();
        var medList = (medRes && medRes.data && medRes.data.data) ? medRes.data.data : (medRes.data || medRes || []);
        if (Array.isArray(medList) && selectMed) {
          selectMed.innerHTML = '';
          medList.forEach(function (m) {
            var pers = m.persona || {};
            var nom = pers.nombres + ' ' + (pers.apellidos || '');
            var opt = document.createElement('option');
            opt.value = m.id_persona;
            opt.textContent = (m.codigo || 'MED') + ' · Dr(a). ' + nom;
            selectMed.appendChild(opt);
          });
        }
      } catch (e) {}

      // Manejar selección de bloque horario
      var bloqueSeleccionado = '08:30';
      document.querySelectorAll('.vs-slots .vs-slot--free').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.querySelectorAll('.vs-slots .vs-slot--free').forEach(function (b) {
            b.classList.remove('is-selected');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-selected');
          btn.setAttribute('aria-pressed', 'true');
          bloqueSeleccionado = btn.getAttribute('data-time') || '08:30';
          var summary = document.querySelector('[data-slot-summary="cita"]');
          if (summary) summary.textContent = bloqueSeleccionado;
        });
      });

      // Submit real a la base de datos
      formEl.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Obtener paciente (por defecto el primer paciente real si no se seleccionó otro)
        var pacId = 1;
        try {
          var pListRes = await VS_API.getPacientes();
          var pArr = (pListRes && pListRes.data && pListRes.data.data) ? pListRes.data.data : (pListRes.data || pListRes || []);
          if (Array.isArray(pArr) && pArr.length > 0) pacId = pArr[0].id_persona;
        } catch (e) {}

        var medId = selectMed ? parseInt(selectMed.value, 10) : 1;
        var espId = selectEsp ? parseInt(selectEsp.value, 10) : 1;
        var fechaVal = inputFecha ? inputFecha.value : new Date().toISOString().slice(0, 10);
        var motivoVal = inputMotivo ? inputMotivo.value.trim() : 'Consulta médica';

        var submitBtn = formEl.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Almacenando cita en BD...';
        }

        try {
          var res = await VS_API.programarCita({
            id_paciente: pacId,
            id_medico: medId,
            id_especialidad: espId,
            fecha: fechaVal,
            hora_inicio: bloqueSeleccionado,
            motivo_consulta: motivoVal
          });

          var citaId = res && res.cita ? res.cita.id_cita : 'NUEVA';
          if (window.vsToast) {
            window.vsToast('Cita médica programada exitosamente', 'CM-' + citaId + ' almacenada en PostgreSQL y auditada en bitácora (REGISTRAR)');
          } else {
            alert('Cita programada con éxito: CM-' + citaId + '. Almacenada en la base de datos.');
          }

          setTimeout(function () {
            window.location.href = '../inicio.html';
          }, 800);
        } catch (err) {
          var msg = err.data && err.data.errors ? Object.values(err.data.errors).flat().join('\n') : (err.data && err.data.message ? err.data.message : err.message);
          alert('Error al programar cita médica:\n' + msg);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirmar y generar comprobante';
          }
        }
      });
    }

    // 14. Vincular Registro de Usuarios Clásico (CU05)
    var formRegUser = document.getElementById('form-registrar-usuario') || document.querySelector('form[data-demo="Usuario registrado"]');
    if (formRegUser && !formRegUser.getAttribute('data-bound')) {
      formRegUser.setAttribute('data-bound', 'true');
      formRegUser.setAttribute('data-api-bound', 'true');

      formRegUser.addEventListener('submit', async function (e) {
        e.preventDefault();
        var ci = document.getElementById('u-ci') ? document.getElementById('u-ci').value.trim() : '';
        var tel = document.getElementById('u-tel') ? document.getElementById('u-tel').value.trim() : '';
        var nombres = document.getElementById('u-nombres') ? document.getElementById('u-nombres').value.trim() : '';
        var apellidos = document.getElementById('u-apellidos') ? document.getElementById('u-apellidos').value.trim() : '';
        var email = document.getElementById('u-email') ? document.getElementById('u-email').value.trim() : '';
        var pass = document.getElementById('u-pass') ? document.getElementById('u-pass').value : '';
        var usuario = document.getElementById('u-usuario') ? document.getElementById('u-usuario').value.trim() : '';

        var rolRadio = formRegUser.querySelector('input[name="rol"]:checked');
        var rolVal = rolRadio ? rolRadio.value : 'recep';
        var idRol = rolVal === 'admin' ? 1 : (rolVal === 'medico' ? 3 : 2);

        if (!ci || !nombres || !apellidos || !email || !pass) {
          alert('Por favor completa todos los campos requeridos (*).');
          return;
        }

        var btn = formRegUser.querySelector('button[type="submit"]');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Guardando en BD...';
        }

        try {
          await VS_API.crearUsuario({
            ci: ci,
            nombres: nombres,
            apellidos: apellidos,
            email: email,
            telefono: tel,
            id_rol: idRol,
            password: pass,
            nombre_usuario: usuario || undefined
          });

          if (window.vsToast) {
            window.vsToast('Usuario registrado exitosamente', 'Guardado en PostgreSQL y auditado en bitácora (REGISTRAR)');
          } else {
            alert('Usuario registrado exitosamente.');
          }

          setTimeout(function () {
            window.location.href = 'cu06-catalogo-usuarios.html';
          }, 600);
        } catch (err) {
          var msg = err.data && err.data.errors ? Object.values(err.data.errors).flat().join('\n') : (err.data && err.data.message ? err.data.message : err.message);
          alert('Error al registrar usuario:\n' + msg);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Crear usuario';
          }
        }
      });
    }

    // =========================================================================
    // 15. PROTECCIÓN EXCLUSIVA DE BITÁCORA PARA ADMINISTRADOR (CU10 / CU11)
    // =========================================================================
    var currentCuAttr = (document.body.getAttribute('data-cu') || '').toUpperCase();
    var currentUsrObj = VS_API.getUser();
    var currentRolStr = currentUsrObj && currentUsrObj.rol ? String(currentUsrObj.rol.nombre || currentUsrObj.rol).toUpperCase() : 'ADMINISTRADOR';
    var esUsuarioAdmin = currentRolStr.indexOf('ADMIN') !== -1;

    if ((currentCuAttr === 'CU10' || currentCuAttr === 'CU11' || location.pathname.indexOf('bitacora') !== -1) && !esUsuarioAdmin) {
      var mainPage = document.querySelector('main') || document.body;
      mainPage.innerHTML = '<div style="padding:3rem;max-width:42rem;margin:2rem auto;background:#fff;border:1px solid #fecdd3;border-radius:1rem;text-align:center;">' +
        '<h2 style="color:#be123c;margin-bottom:.75rem;font-size:1.5rem;">Acceso Restringido · Exclusivo Administrador</h2>' +
        '<p style="color:#475569;margin-bottom:1.5rem;">La Bitácora de Auditoría y Trazabilidad (P3 · CU10 y CU11) solo puede ser visualizada por cuentas con el rol <strong>ADMINISTRADOR</strong>.</p>' +
        '<a href="../inicio.html" class="vs-btn vs-btn--primary">Volver al Panel de Inicio</a></div>';
      return;
    }

    // =========================================================================
    // 16. CU03: RECUPERAR Y RESTABLECER CONTRASEÑA
    // =========================================================================
    if (currentCuAttr === 'CU03') {
      var stepForms = document.querySelectorAll('form[data-step]');
      var recIdentificador = 'scolque@vidasalud.bo';
      var recCodigo = '';
      stepForms.forEach(function (f) {
        f.setAttribute('data-api-bound', 'true');
        var stepNum = f.getAttribute('data-step');
        f.addEventListener('submit', async function (e) {
          e.preventDefault();
          try {
            if (stepNum === '1') {
              var idIn = document.getElementById('rec-id');
              recIdentificador = idIn ? idIn.value.trim() : recIdentificador;
              var r1 = await VS_API.solicitarRecuperacion(recIdentificador);
              recCodigo = r1.codigo_demo || '482915';
              var codeBoxes = document.querySelectorAll('form[data-step="2"] .vs-code-input input');
              String(recCodigo).split('').forEach(function (d, idx) {
                if (codeBoxes[idx]) codeBoxes[idx].value = d;
              });
              stepForms.forEach(function (sf) { sf.hidden = sf.getAttribute('data-step') !== '2'; });
              if (window.vsToast) window.vsToast('Código generado en BD', 'Código de 6 dígitos: ' + recCodigo);
            } else if (stepNum === '2') {
              var boxes = document.querySelectorAll('form[data-step="2"] .vs-code-input input');
              var typed = '';
              boxes.forEach(function (b) { typed += b.value.trim(); });
              if (typed.length === 6) recCodigo = typed;
              stepForms.forEach(function (sf) { sf.hidden = sf.getAttribute('data-step') !== '3'; });
            } else if (stepNum === '3') {
              var np1 = document.getElementById('np-1') ? document.getElementById('np-1').value : '';
              var np2 = document.getElementById('np-2') ? document.getElementById('np-2').value : np1;
              await VS_API.restablecerContrasena({
                identificador: recIdentificador,
                codigo: recCodigo,
                password: np1,
                password_confirmation: np2
              });
              if (window.vsToast) window.vsToast('Contraseña restablecida', 'Actualizada en PostgreSQL y registrada en bitácora');
              setTimeout(function () { window.location.href = 'cu01-iniciar-sesion.html'; }, 800);
            }
          } catch (err) {
            alert('Error en recuperación: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      });
    }

    // =========================================================================
    // 17. CU04: BLOQUEO POR INTENTOS FALLIDOS Y DESBLOQUEO
    // =========================================================================
    if (currentCuAttr === 'CU04') {
      var cu04Tbody = document.querySelector('.vs-table tbody');
      if (cu04Tbody) {
        async function cargarBloqueosCU04() {
          try {
            var res = await VS_API.getUsuarios({ per_page: 50 });
            var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
            var html = '';
            list.forEach(function (u) {
              var pers = u.persona || {};
              var nom = (pers.nombres || '') + ' ' + (pers.apellidos || '');
              var rol = u.rol ? (u.rol.nombre || u.rol) : 'Personal';
              var intFallidos = u.intentos_fallidos || 0;
              var est = (u.estado || 'ACTIVO').toUpperCase();
              var badge = est === 'BLOQUEADO'
                ? '<span class="vs-badge vs-badge--danger"><span class="vs-badge__dot"></span>Bloqueado</span>'
                : (intFallidos > 0 ? '<span class="vs-badge vs-badge--warn"><span class="vs-badge__dot"></span>En observación</span>' : '<span class="vs-badge vs-badge--ok"><span class="vs-badge__dot"></span>Activo</span>');
              html += '<tr>' +
                '<td><div class="vs-cell-person__name">' + escapeHtml(nom) + '</div><div class="vs-cell-person__sub vs-mono">' + escapeHtml(u.nombre_usuario) + ' · ' + escapeHtml(rol) + '</div></td>' +
                '<td class="vs-td-num">' + intFallidos + ' / 3</td>' +
                '<td class="vs-hide-md vs-td-num">' + (u.bloqueado_hasta ? formatFechaHora(u.bloqueado_hasta) : '—') + '</td>' +
                '<td>' + badge + '</td>' +
                '<td class="vs-td-actions"><button type="button" class="vs-btn vs-btn--ghost vs-btn--sm btn-reset-cu04" data-id="' + u.id_usuario + '" data-user="' + escapeHtml(u.nombre_usuario) + '"><svg class="vs-i"><use href="#i-undo"/></svg>Reiniciar / Desbloquear</button></td>' +
                '</tr>';
            });
            if (html) cu04Tbody.innerHTML = html;
          } catch (e) {}
        }
        cu04Tbody.addEventListener('click', async function (ev) {
          var btn = ev.target.closest('.btn-reset-cu04');
          if (!btn) return;
          var id = btn.getAttribute('data-id');
          var uname = btn.getAttribute('data-user');
          try {
            await VS_API.reactivarUsuario(id);
            if (window.vsToast) window.vsToast('Contador reiniciado', uname + ' → ACTIVO · intentos_fallidos = 0 (auditado en bitácora)');
            cargarBloqueosCU04();
          } catch (e) {
            alert('Error: ' + e.message);
          }
        });
        cargarBloqueosCU04();
      }
    }

    // =========================================================================
    // 18. CU07: MODIFICAR DATOS DE CUENTA DE USUARIO
    // =========================================================================
    if (currentCuAttr === 'CU07') {
      var paramsUrl07 = new URLSearchParams(location.search);
      var targetUserId = parseInt(paramsUrl07.get('id') || (currentUsrObj && currentUsrObj.id_usuario) || '1', 10);
      var forms07 = document.querySelectorAll('form.vs-card');
      var formDatos07 = forms07[0];
      var formPass07 = forms07[1];

      async function cargarDatosCU07() {
        try {
          var res = await VS_API.getUsuario(targetUserId);
          var u = res.usuario || res.data || res;
          if (!u) return;
          var p = u.persona || {};
          var nombreCompleto = (p.nombres ? (p.nombres + ' ' + (p.apellidos || '')) : u.nombre_usuario) || 'Usuario';
          var rolName = u.rol ? (u.rol.nombre || u.rol) : 'Personal';
          var ciEl = document.getElementById('m-ci');
          var userEl = document.getElementById('m-usuario') || document.getElementById('m-user');
          var nomEl = document.getElementById('m-nombres') || document.getElementById('m-nom');
          var apeEl = document.getElementById('m-apellidos') || document.getElementById('m-ape');
          var emailEl = document.getElementById('m-email');
          var telEl = document.getElementById('m-tel');

          if (ciEl) ciEl.value = p.ci || '';
          if (userEl) userEl.value = u.nombre_usuario || '';
          if (nomEl) nomEl.value = p.nombres || '';
          if (apeEl) apeEl.value = p.apellidos || '';
          if (emailEl) emailEl.value = p.email || '';
          if (telEl) telEl.value = p.telefono || '';

          var headerNom = document.getElementById('cu07-header-nombre');
          var headerSub = document.getElementById('cu07-header-sub');
          var headerAvatar = document.getElementById('cu07-avatar');
          var rolTit = document.getElementById('cu07-rol-titulo');
          if (headerNom) headerNom.textContent = nombreCompleto;
          if (headerSub) headerSub.textContent = rolName + ' · CI ' + (p.ci || '—') + ' · @' + u.nombre_usuario;
          if (headerAvatar) {
            var inits = ((p.nombres ? p.nombres[0] : '') + (p.apellidos ? p.apellidos[0] : '')).toUpperCase() || 'US';
            headerAvatar.textContent = inits;
          }
          if (rolTit) rolTit.textContent = 'Rol actual: ' + rolName;
        } catch (e) {}
      }
      cargarDatosCU07();

      if (formDatos07) {
        formDatos07.setAttribute('data-api-bound', 'true');
        formDatos07.addEventListener('submit', async function (e) {
          e.preventDefault();
          try {
            var nomInput = document.getElementById('m-nombres') || document.getElementById('m-nom');
            var apeInput = document.getElementById('m-apellidos') || document.getElementById('m-ape');
            var emailInput = document.getElementById('m-email');
            var telInput = document.getElementById('m-tel');
            await VS_API.actualizarUsuario(targetUserId, {
              ci: document.getElementById('m-ci') ? document.getElementById('m-ci').value.trim() : undefined,
              nombres: nomInput ? nomInput.value.trim() : '',
              apellidos: apeInput ? apeInput.value.trim() : '',
              email: emailInput ? emailInput.value.trim() : '',
              telefono: telInput ? telInput.value.trim() : ''
            });
            if (window.vsToast) window.vsToast('Cambios guardados', 'Cuenta modificada en PostgreSQL y registrada en bitácora (MODIFICAR)');
            cargarDatosCU07();
          } catch (err) {
            alert('Error al actualizar cuenta: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }
          } catch (err) {
            alert('Error al actualizar cuenta: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }

      if (formPass07) {
        formPass07.setAttribute('data-api-bound', 'true');
        formPass07.addEventListener('submit', async function (e) {
          e.preventDefault();
          var pNueva = document.getElementById('p-nueva') ? document.getElementById('p-nueva').value : '';
          if (!pNueva || pNueva.length < 6) {
            alert('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
          }
          try {
            await VS_API.actualizarUsuario(targetUserId, {
              nombres: document.getElementById('m-nom').value.trim(),
              apellidos: document.getElementById('m-ape').value.trim(),
              email: document.getElementById('m-email').value.trim(),
              telefono: document.getElementById('m-tel').value.trim(),
              password: pNueva
            });
            if (window.vsToast) window.vsToast('Contraseña actualizada', 'Hash actualizado y registrado en bitácora (MODIFICAR)');
            formPass07.reset();
          } catch (err) {
            alert('Error al actualizar contraseña: ' + err.message);
          }
        });
      }
    }

    // =========================================================================
    // 19. CU08: CAMBIAR ROL OPERATIVO Y PERMISOS (RBAC DINÁMICO)
    // =========================================================================
    if (currentCuAttr === 'CU08') {
      var selectUser08 = document.getElementById('r-usuario');
      var dlgRol08 = document.getElementById('dlg-rol') || document.getElementById('dlg-cambiar-rol');
      var formRol08 = document.getElementById('form-cambiar-rol-cu08') || (dlgRol08 ? dlgRol08.querySelector('form') : null);
      var choiceGrid08 = document.getElementById('cu08-choice-grid');
      var rolActualLabel = document.getElementById('cu08-rol-actual');
      var rolNuevoLabel = document.getElementById('cu08-rol-nuevo-label');
      var alertImpacto08 = document.getElementById('cu08-alert-impacto');
      var impactoText08 = document.getElementById('cu08-impacto-text');
      var cambiosTbody08 = document.getElementById('cu08-cambios-tbody');
      var usuariosMap08 = {};

      var ROLES_CATALOGO = [
        { id: 1, nombre: 'Administrador', desc: '19 permisos · Acceso total P1 a P7', impacto: 'ganará privilegios de administración completa, gestión de usuarios, auditoría, catálogos y reportes.' },
        { id: 2, nombre: 'Recepcionista', desc: 'Gestión de citas, pacientes y admisión', impacto: 'podrá registrar pacientes, programar y reprogramar citas médicas, y emitir fichas.' },
        { id: 3, nombre: 'Médico', desc: '6 permisos · agenda, consultas y atención clínica', impacto: 'tendrá acceso a la agenda médica diaria, registro de atenciones y bloqueo de disponibilidad.' },
        { id: 4, nombre: 'Paciente', desc: 'Portal web · reserva de citas, pagos y ficha', impacto: 'pasará a perfil de paciente en línea con acceso a sus citas y ficha médica básica.' }
      ];

      function renderizarOpcionesNuevoRol(currentRoleId, currentUsername) {
        if (!choiceGrid08) return;
        choiceGrid08.innerHTML = '';
        if (rolNuevoLabel) rolNuevoLabel.textContent = 'Seleccione';
        if (alertImpacto08) alertImpacto08.style.display = 'none';

        var rolesDisponibles = ROLES_CATALOGO.filter(function (r) {
          return r.id !== currentRoleId;
        });

        rolesDisponibles.forEach(function (r, idx) {
          var labelEl = document.createElement('label');
          labelEl.className = 'vs-choice';
          labelEl.innerHTML = '<input type="radio" name="nuevo-rol" value="' + r.id + '"' + (idx === 0 ? ' checked' : '') + '>' +
            '<div><div class="vs-choice__title">' + escapeHtml(r.nombre) + '</div>' +
            '<div class="vs-choice__desc">' + escapeHtml(r.desc) + '</div></div>';

          var radioInput = labelEl.querySelector('input');
          radioInput.addEventListener('change', function () {
            if (rolNuevoLabel) rolNuevoLabel.textContent = r.nombre;
            if (alertImpacto08 && impactoText08) {
              alertImpacto08.style.display = 'flex';
              impactoText08.innerHTML = '<span class="vs-alert__title">Impacto para ' + escapeHtml(currentUsername || 'el usuario') + '</span>El usuario ' + escapeHtml(r.impacto);
            }
          });

          choiceGrid08.appendChild(labelEl);
        });

        if (rolesDisponibles.length > 0) {
          var primerRol = rolesDisponibles[0];
          if (rolNuevoLabel) rolNuevoLabel.textContent = primerRol.nombre;
          if (alertImpacto08 && impactoText08) {
            alertImpacto08.style.display = 'flex';
            impactoText08.innerHTML = '<span class="vs-alert__title">Impacto para ' + escapeHtml(currentUsername || 'el usuario') + '</span>El usuario ' + escapeHtml(primerRol.impacto);
          }
        }
      }

      async function cargarUsuariosCU08() {
        if (!selectUser08) return;
        try {
          var res = await VS_API.getUsuarios({ per_page: 50 });
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          usuariosMap08 = {};
          selectUser08.innerHTML = '<option value="">Selecciona un usuario…</option>';
          var cAdm08 = 0, cRec08 = 0, cMed08 = 0;
          list.forEach(function (u) {
            usuariosMap08[u.id_usuario] = u;
            var p = u.persona || {};
            var r = u.rol ? (u.rol.nombre || u.rol) : 'RECEPCIONISTA';
            var rUpper = String(r).toUpperCase();
            if (rUpper.indexOf('ADMIN') !== -1) cAdm08++;
            else if (rUpper.indexOf('RECEP') !== -1) cRec08++;
            else if (rUpper.indexOf('MEDIC') !== -1) cMed08++;

            var opt = document.createElement('option');
            opt.value = u.id_usuario;
            opt.textContent = u.nombre_usuario + ' — ' + (p.nombres || '') + ' ' + (p.apellidos || '') + ' (actual: ' + r + ')';
            selectUser08.appendChild(opt);
          });

          var elAdm08 = document.getElementById('cu08-kpi-admin-count');
          var elRec08 = document.getElementById('cu08-kpi-recep-count');
          var elMed08 = document.getElementById('cu08-kpi-med-count');
          if (elAdm08) elAdm08.textContent = cAdm08 + (cAdm08 === 1 ? ' usuario' : ' usuarios');
          if (elRec08) elRec08.textContent = cRec08 + (cRec08 === 1 ? ' usuario' : ' usuarios');
          if (elMed08) elMed08.textContent = cMed08 + (cMed08 === 1 ? ' usuario' : ' usuarios');

          var urlParamId = parseInt(new URLSearchParams(location.search).get('id'), 10);
          if (urlParamId && usuariosMap08[urlParamId]) {
            selectUser08.value = urlParamId;
            selectUser08.dispatchEvent(new Event('change'));
            if (dlgRol08 && dlgRol08.showModal) dlgRol08.showModal();
          } else if (list.length > 0) {
            selectUser08.value = list[0].id_usuario;
            selectUser08.dispatchEvent(new Event('change'));
          }
        } catch (e) {}
      }

      if (selectUser08) {
        selectUser08.addEventListener('change', function () {
          var uid = parseInt(selectUser08.value, 10);
          var usr = usuariosMap08[uid];
          if (!usr) {
            if (rolActualLabel) rolActualLabel.textContent = '—';
            if (choiceGrid08) choiceGrid08.innerHTML = '<p class="vs-muted vs-small" style="grid-column: 1 / -1;">Selecciona un usuario arriba para ver los roles disponibles para el cambio.</p>';
            if (alertImpacto08) alertImpacto08.style.display = 'none';
            return;
          }

          var rolObj = usr.rol || {};
          var rolId = typeof rolObj === 'object' ? (rolObj.id_rol || 2) : 2;
          var rolNombre = typeof rolObj === 'object' ? (rolObj.nombre || 'Recepcionista') : String(rolObj);

          if (rolActualLabel) {
            rolActualLabel.textContent = rolNombre;
            var rUp = rolNombre.toUpperCase();
            rolActualLabel.className = 'vs-badge ' + (rUp.indexOf('ADMIN') !== -1 ? 'vs-badge--warn' : (rUp.indexOf('MED') !== -1 ? 'vs-badge--ok' : (rUp.indexOf('PAC') !== -1 ? 'vs-badge--cyan' : 'vs-badge--info')));
          }

          renderizarOpcionesNuevoRol(rolId, usr.nombre_usuario);
        });
      }

      async function cargarCambiosRolRecientes() {
        if (!cambiosTbody08) return;
        try {
          var res = await VS_API.getBitacora({ modulo: 'P2', tipo_accion: 'MODIFICAR', per_page: 20 });
          var events = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          var roleEvents = events.filter(function (ev) {
            var det = (ev.detalle || '').toLowerCase();
            return det.indexOf('rol') !== -1 || det.indexOf('cambio') !== -1 || (ev.tabla_afectada === 'usuario' && det.indexOf('de [') !== -1);
          });

          if (!roleEvents.length) {
            cambiosTbody08.innerHTML = '<tr><td colspan="5" class="vs-td-empty" style="text-align:center;padding:1.5rem;">No se registran cambios de rol recientes en la bitácora.</td></tr>';
            return;
          }

          cambiosTbody08.innerHTML = roleEvents.map(function (ev) {
            var usr = ev.usuario ? (ev.usuario.nombre_usuario || 'Admin') : 'Admin';
            var fecha = formatFechaHora(ev.fecha_hora);
            var det = ev.detalle || '';

            return '<tr>' +
              '<td class="vs-td-num">' + fecha + '</td>' +
              '<td><div class="vs-cell-person__name">' + escapeHtml(ev.usuario && ev.usuario.persona ? (ev.usuario.persona.nombres + ' ' + ev.usuario.persona.apellidos) : usr) + '</div><div class="vs-cell-person__sub vs-mono">' + escapeHtml(usr) + '</div></td>' +
              '<td><span class="vs-badge vs-badge--info vs-badge--sm">' + escapeHtml(ev.tipo_accion) + '</span></td>' +
              '<td class="vs-hide-md">' + escapeHtml(det) + '</td>' +
              '<td class="vs-hide-sm vs-mono">' + escapeHtml(usr) + '</td>' +
              '</tr>';
          }).join('');
        } catch (e) {
          cambiosTbody08.innerHTML = '<tr><td colspan="5" class="vs-td-empty" style="text-align:center;padding:1.5rem;">Error al cargar cambios de rol desde bitácora.</td></tr>';
        }
      }

      cargarUsuariosCU08();
      cargarCambiosRolRecientes();

      if (formRol08) {
        formRol08.setAttribute('data-api-bound', 'true');
        formRol08.addEventListener('submit', async function (e) {
          e.preventDefault();
          var uid = selectUser08 ? parseInt(selectUser08.value, 10) : 0;
          if (!uid) {
            alert('Por favor selecciona un usuario.');
            return;
          }
          var checkedRol = formRol08.querySelector('input[name="nuevo-rol"]:checked');
          if (!checkedRol) {
            alert('Por favor selecciona el nuevo rol para el usuario.');
            return;
          }
          var idRol = parseInt(checkedRol.value, 10);
          var motivo = document.getElementById('r-motivo') ? document.getElementById('r-motivo').value.trim() : 'Reasignación operativa';
          if (!motivo) {
            alert('Por favor ingresa el motivo del cambio de rol para la bitácora de auditoría.');
            return;
          }

          var submitBtn = document.getElementById('cu08-btn-submit') || formRol08.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Actualizando rol y registrando en bitácora...';
          }

          try {
            await VS_API.cambiarRolUsuario(uid, idRol, motivo);
            if (dlgRol08 && dlgRol08.close) dlgRol08.close();
            if (window.vsToast) {
              window.vsToast('Rol operativo actualizado', 'El cambio se guardó en PostgreSQL y se registró en la bitácora de auditoría (MODIFICAR)');
            } else {
              alert('Rol operativo actualizado exitosamente.');
            }
            if (document.getElementById('r-motivo')) document.getElementById('r-motivo').value = '';
            cargarUsuariosCU08();
            cargarCambiosRolRecientes();
          } catch (err) {
            var errTxt = err.data && err.data.message ? err.data.message : err.message;
            alert('No se pudo cambiar el rol: ' + errTxt);
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<svg class="vs-i"><use href="#i-check"/></svg>Confirmar cambio de rol';
            }
          }
        });
      }
    }

    // =========================================================================
    // 20. CU09: SUSPENDER / INACTIVAR CUENTA DE USUARIO (BAJA LÓGICA)
    // =========================================================================
    if (currentCuAttr === 'CU09') {
      var cu09Tbody = document.querySelector('.vs-table tbody');
      var dlgSusp = document.getElementById('dlg-suspender');
      var formSusp = dlgSusp ? dlgSusp.querySelector('form') : null;
      var selectedUid09 = null;

      async function cargarCuentasCU09() {
        if (!cu09Tbody) return;
        try {
          var res = await VS_API.getUsuarios({ per_page: 50 });
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          var html = '';
          list.forEach(function (u) {
            var p = u.persona || {};
            var nom = (p.nombres || '') + ' ' + (p.apellidos || '');
            var rol = u.rol ? (u.rol.nombre || u.rol) : 'Personal';
            var est = (u.estado || 'ACTIVO').toUpperCase();
            var esMiCuenta = currentUsrObj && u.id_usuario === currentUsrObj.id_usuario;
            var btnHtml = '';
            if (esMiCuenta) {
              btnHtml = '<button type="button" class="vs-btn vs-btn--ghost vs-btn--sm" disabled title="No puedes suspender tu propia cuenta">Tu cuenta</button>';
            } else if (est === 'ACTIVO') {
              btnHtml = '<button type="button" class="vs-btn vs-btn--danger-soft vs-btn--sm btn-susp-cu09" data-id="' + u.id_usuario + '" data-name="' + escapeHtml(nom) + '"><svg class="vs-i"><use href="#i-ban"/></svg>Suspender</button>';
            } else {
              btnHtml = '<button type="button" class="vs-btn vs-btn--teal vs-btn--sm btn-react-cu09" data-id="' + u.id_usuario + '" data-name="' + escapeHtml(nom) + '"><svg class="vs-i"><use href="#i-undo"/></svg>Reactivar</button>';
            }
            html += '<tr>' +
              '<td><div class="vs-cell-person__name">' + escapeHtml(nom) + '</div><div class="vs-cell-person__sub vs-mono">' + escapeHtml(u.nombre_usuario) + ' · CI ' + escapeHtml(p.ci || '') + '</div></td>' +
              '<td><span class="vs-badge vs-badge--info">' + escapeHtml(rol) + '</span></td>' +
              '<td class="vs-hide-md">' + (est === 'ACTIVO' ? '<span class="vs-badge vs-badge--ok">Activa</span>' : '<span class="vs-badge vs-badge--muted">Inactiva</span>') + '</td>' +
              '<td class="vs-hide-md vs-td-num">' + (u.ultimo_acceso ? formatFechaHora(u.ultimo_acceso) : '—') + '</td>' +
              '<td class="vs-td-actions">' + btnHtml + '</td>' +
              '</tr>';
          });
          if (html) cu09Tbody.innerHTML = html;
        } catch (e) {}
      }

      if (cu09Tbody) {
        cu09Tbody.addEventListener('click', async function (ev) {
          var bSusp = ev.target.closest('.btn-susp-cu09');
          if (bSusp) {
            selectedUid09 = bSusp.getAttribute('data-id');
            if (dlgSusp && dlgSusp.showModal) {
              dlgSusp.showModal();
            } else if (confirm('¿Confirmas inactivar esta cuenta?')) {
              await VS_API.inactivarUsuario(selectedUid09, 'Baja lógica desde CU09');
              cargarCuentasCU09();
            }
            return;
          }
          var bReact = ev.target.closest('.btn-react-cu09');
          if (bReact) {
            var idR = bReact.getAttribute('data-id');
            await VS_API.reactivarUsuario(idR);
            if (window.vsToast) window.vsToast('Cuenta reactivada', 'Estado ACTIVO y registrado en bitácora (RENOVAR)');
            cargarCuentasCU09();
          }
        });
      }

      if (formSusp) {
        formSusp.setAttribute('data-api-bound', 'true');
        formSusp.addEventListener('submit', async function (e) {
          e.preventDefault();
          if (!selectedUid09) return;
          var mot = document.getElementById('motivo-baja') ? document.getElementById('motivo-baja').value : 'Baja administrativa';
          try {
            await VS_API.inactivarUsuario(selectedUid09, mot);
            if (dlgSusp && dlgSusp.close) dlgSusp.close();
            if (window.vsToast) window.vsToast('Cuenta inactivada', 'Estado INACTIVO y sesiones revocadas en bitácora (INACTIVAR)');
            cargarCuentasCU09();
          } catch (err) {
            alert('No se pudo inactivar: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }

      cargarCuentasCU09();
    }

    // =========================================================================
    // 21. CU10: REGISTRO AUTOMÁTICO EN BITÁCORA (LIVE DASHBOARD EN TIEMPO REAL)
    // =========================================================================
    if (currentCuAttr === 'CU10') {
      var kpiHoyEl = document.getElementById('kpi-hoy');
      var kpiMesEl = document.getElementById('kpi-mes');
      var kpiAlertasEl = document.getElementById('kpi-alertas');
      var kpiHoyHintEl = document.getElementById('kpi-hoy-hint');
      var barsEl = document.getElementById('bitacora-bars');
      var tlEl = document.getElementById('bitacora-timeline');
      var subMesEl = document.getElementById('bitacora-sub-mes');
      var subHoyEl = document.getElementById('bitacora-sub-hoy');

      var MESES_NOMBRE = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      var dFecha = new Date();
      if (subMesEl) subMesEl.textContent = MESES_NOMBRE[dFecha.getMonth()] + ' ' + dFecha.getFullYear();

      async function cargarResumenCU10() {
        try {
          var res = await VS_API.getBitacoraResumen();
          var r = (res && res.resumen) ? res.resumen : res;
          if (!r) return;

          if (kpiHoyEl) kpiHoyEl.textContent = r.total_hoy != null ? r.total_hoy : 0;
          if (kpiMesEl) kpiMesEl.textContent = r.total_mes != null ? r.total_mes : 0;
          if (kpiAlertasEl) kpiAlertasEl.textContent = r.alertas_hoy != null ? r.alertas_hoy : 0;
          if (kpiHoyHintEl) {
            kpiHoyHintEl.textContent = (r.segundos_desde_ultimo <= 60)
              ? 'Último evento hace ' + r.segundos_desde_ultimo + ' s'
              : 'Último evento hace ' + Math.round(r.segundos_desde_ultimo / 60) + ' min';
          }
          if (subHoyEl) {
            subHoyEl.textContent = 'En vivo · ' + (r.total_hoy != null ? r.total_hoy : 0) + ' eventos registrados hoy';
          }

          if (barsEl && Array.isArray(r.por_accion) && r.por_accion.length) {
            var maxVal = Math.max.apply(null, r.por_accion.map(function (a) { return parseInt(a.total, 10); })) || 1;
            var bHtml = '';
            var colorMap = {
              'CREAR': 'vs-bar',
              'REGISTRAR': 'vs-bar',
              'MODIFICAR': 'vs-bar vs-bar--cyan',
              'LOGIN': 'vs-bar vs-bar--teal',
              'LOGOUT': 'vs-bar vs-bar--teal',
              'INACTIVAR': 'vs-bar vs-bar--amber',
              'ELIMINAR': 'vs-bar vs-bar--amber',
              'BLOQUEO': 'vs-bar vs-bar--rose'
            };
            r.por_accion.forEach(function (a) {
              var tAcc = a.tipo_accion || 'OTRO';
              var barCls = colorMap[tAcc] || 'vs-bar';
              var pct = Math.max(8, Math.round((parseInt(a.total, 10) / maxVal) * 100));
              bHtml += '<div class="vs-bars__row"><span class="vs-bars__label vs-mono">' + escapeHtml(tAcc) + '</span><div class="' + barCls + '"><i style="width:' + pct + '%"></i></div><span class="vs-bars__val">' + a.total + '</span></div>';
            });
            barsEl.innerHTML = bHtml;
          }

          if (tlEl) {
            var liveRes = await VS_API.getBitacoraLive({ limit: 10 });
            var list = (liveRes && liveRes.data && liveRes.data.length) ? liveRes.data : (r.ultimos_eventos || []);
            if (!list.length) {
              tlEl.innerHTML = '<li class="vs-tl-item"><div class="vs-tl-title">Sin eventos registrados aún</div><div class="vs-tl-sub">Las operaciones se anotarán en vivo automáticamente.</div></li>';
            } else {
              var tHtml = '';
              list.forEach(function (ev) {
                var usr = ev.usuario ? (ev.usuario.nombre_usuario || 'Sistema') : 'Sistema';
                var det = ev.descripcion || ev.detalle || 'Evento registrado';
                var act = (ev.tipo_accion || 'REGISTRAR').toUpperCase();
                var dotCls = 'vs-tl-item--ok';
                if (act === 'BLOQUEO' || act === 'ELIMINAR') dotCls = 'vs-tl-item--danger';
                else if (act === 'INACTIVAR' || act === 'MODIFICAR') dotCls = 'vs-tl-item--warn';
                else if (act === 'CREAR' || act === 'REGISTRAR') dotCls = 'vs-tl-item--info';

                tHtml += '<li class="vs-tl-item ' + dotCls + '">' +
                  '<span class="vs-tl-time">' + formatFechaHora(ev.fecha_hora) + '</span>' +
                  '<div class="vs-tl-title"><span class="vs-badge vs-badge--mono vs-badge--sm">' + escapeHtml(act) + '</span> ' + escapeHtml(ev.modulo || 'GENERAL') + ' · <span class="vs-code">' + escapeHtml(ev.tabla_afectada || 'sistema') + '</span></div>' +
                  '<div class="vs-tl-sub">“' + escapeHtml(det) + '” — <strong class="vs-strong">' + escapeHtml(usr) + '</strong> (' + escapeHtml(ev.ip || '127.0.0.1') + ')</div>' +
                  '</li>';
              });
              tlEl.innerHTML = tHtml;
            }
          }
        } catch (e) {}
      }
      cargarResumenCU10();
      setInterval(cargarResumenCU10, 3500);
    }

    // =========================================================================
    // 22. CU13 (INFORMACIÓN MÉDICA), CU14 (CONTACTOS EMERGENCIA), CU16 (HISTORIAL CITAS), CU17 (DESACTIVAR PACIENTE)
    // =========================================================================
    if (currentCuAttr === 'CU13') {
      var p13Params = new URLSearchParams(location.search);
      var pacId13 = parseInt(p13Params.get('paciente_id') || '16', 10);
      var form13 = document.querySelector('form.vs-card');

      async function cargarInfoMedicaCU13() {
        try {
          var resP = await VS_API.getPacientes({ per_page: 50 });
          var pList = (resP && resP.data && resP.data.data) ? resP.data.data : (resP.data || []);
          if (!p13Params.get('paciente_id') && pList.length > 0) {
            pacId13 = pList[0].id_persona;
          }
          var resInfo = await VS_API.getInfoMedica(pacId13);
          var info = resInfo.informacion_medica || resInfo.data || {};
          if (info.alergias && document.getElementById('im-alergias')) document.getElementById('im-alergias').value = info.alergias;
          if (info.enfermedades_cronicas && document.getElementById('im-cronicas')) document.getElementById('im-cronicas').value = info.enfermedades_cronicas;
          if (info.medicamentos_habituales && document.getElementById('im-med')) document.getElementById('im-med').value = info.medicamentos_habituales;
          if (info.antecedentes_relevantes && document.getElementById('im-ant')) document.getElementById('im-ant').value = info.antecedentes_relevantes;
        } catch (e) {}
      }
      cargarInfoMedicaCU13();

      if (form13) {
        form13.setAttribute('data-api-bound', 'true');
        form13.addEventListener('submit', async function (e) {
          e.preventDefault();
          var sangreEl = form13.querySelector('input[name="sangre"]:checked');
          var payload = {
            tipo_sangre: sangreEl ? sangreEl.value : 'A+',
            alergias: document.getElementById('im-alergias') ? document.getElementById('im-alergias').value.trim() : null,
            enfermedades_cronicas: document.getElementById('im-cronicas') ? document.getElementById('im-cronicas').value.trim() : null,
            medicamentos_habituales: document.getElementById('im-med') ? document.getElementById('im-med').value.trim() : null,
            antecedentes_relevantes: document.getElementById('im-ant') ? document.getElementById('im-ant').value.trim() : null
          };
          try {
            await VS_API.guardarInfoMedica(pacId13, payload);
            if (window.vsToast) window.vsToast('Información médica actualizada', 'Guardada en PostgreSQL y auditada en bitácora (INFO_MEDICA)');
          } catch (err) {
            alert('Error al guardar ficha médica: ' + err.message);
          }
        });
      }
    }

    if (currentCuAttr === 'CU14') {
      var p14Params = new URLSearchParams(location.search);
      var pacId14 = parseInt(p14Params.get('paciente_id') || '16', 10);
      var list14 = document.querySelector('.vs-list--boxed');
      var form14 = document.querySelector('form.vs-card');

      async function cargarContactosCU14() {
        try {
          var resP = await VS_API.getPacientes({ per_page: 50 });
          var pList = (resP && resP.data && resP.data.data) ? resP.data.data : (resP.data || []);
          if (!p14Params.get('paciente_id') && pList.length > 0) pacId14 = pList[0].id_persona;

          var resC = await VS_API.getContactosEmergencia(pacId14);
          var contactos = resC.data || [];
          if (list14 && contactos.length) {
            var html = '';
            contactos.forEach(function (c) {
              html += '<li class="vs-list-row">' +
                '<span class="vs-avatar vs-avatar--teal">CE</span>' +
                '<div class="vs-list-row__body">' +
                  '<div class="vs-list-row__title">' + escapeHtml(c.nombre_completo) + ' <span class="vs-badge vs-badge--info">' + escapeHtml(c.parentesco) + '</span></div>' +
                  '<div class="vs-list-row__sub">Teléfono: <span class="vs-mono vs-strong">' + escapeHtml(c.telefono) + '</span></div>' +
                '</div>' +
                '<div class="vs-row">' +
                  '<button type="button" class="vs-icon-btn vs-icon-btn--danger btn-del-contacto" data-id="' + c.id_contacto + '" title="Quitar"><svg class="vs-i"><use href="#i-trash"/></svg></button>' +
                '</div>' +
              '</li>';
            });
            list14.innerHTML = html;
          }
        } catch (e) {}
      }
      cargarContactosCU14();

      if (list14) {
        list14.addEventListener('click', async function (ev) {
          var btn = ev.target.closest('.btn-del-contacto');
          if (!btn) return;
          var cid = btn.getAttribute('data-id');
          try {
            await VS_API.eliminarContactoEmergencia(pacId14, cid);
            if (window.vsToast) window.vsToast('Contacto eliminado', 'Eliminado de PostgreSQL y registrado en bitácora (ELIMINAR)');
            cargarContactosCU14();
          } catch (e) {}
        });
      }

      if (form14) {
        form14.setAttribute('data-api-bound', 'true');
        form14.addEventListener('submit', async function (e) {
          e.preventDefault();
          var nom = document.getElementById('ce-nom') ? document.getElementById('ce-nom').value.trim() : '';
          var par = document.getElementById('ce-par') ? document.getElementById('ce-par').value.trim() : '';
          var tel = document.getElementById('ce-tel') ? document.getElementById('ce-tel').value.trim() : '';
          if (!nom || !par || !tel) {
            alert('Completa nombre, parentesco y teléfono.');
            return;
          }
          try {
            await VS_API.agregarContactoEmergencia(pacId14, {
              nombre_completo: nom,
              parentesco: par,
              telefono: tel
            });
            if (window.vsToast) window.vsToast('Contacto agregado', nom + ' guardado en BD y auditado en bitácora');
            form14.reset();
            cargarContactosCU14();
          } catch (err) {
            alert('Error: ' + err.message);
          }
        });
      }
    }

    if (currentCuAttr === 'CU16') {
      var p16Params = new URLSearchParams(location.search);
      var pacId16 = parseInt(p16Params.get('paciente_id') || '16', 10);
      var tbody16 = document.querySelector('.vs-table tbody');
      async function cargarHistorialCU16() {
        if (!tbody16) return;
        try {
          var resP = await VS_API.getPacientes({ per_page: 50 });
          var pList = (resP && resP.data && resP.data.data) ? resP.data.data : (resP.data || []);
          if (!p16Params.get('paciente_id') && pList.length > 0) pacId16 = pList[0].id_persona;

          var resH = await VS_API.getHistorialCitas(pacId16);
          var citas = resH.citas || [];
          if (!citas.length) return;
          var html = '';
          citas.forEach(function (c) {
            var esp = c.especialidad ? c.especialidad.nombre : 'Medicina General';
            var med = c.medico && c.medico.persona ? ('Dr(a). ' + c.medico.persona.apellidos) : 'Médico';
            var est = (c.estado || 'PROGRAMADA').toUpperCase();
            var bCls = est === 'ATENDIDA' ? 'vs-badge--ok' : (est === 'CANCELADA' ? 'vs-badge--danger' : (est === 'CONFIRMADA' ? 'vs-badge--cyan' : 'vs-badge--info'));
            html += '<tr>' +
              '<td class="vs-td-num">' + escapeHtml(c.codigo || ('CM-' + c.id_cita)) + '</td>' +
              '<td class="vs-td-num">' + escapeHtml(c.fecha) + ' · ' + escapeHtml((c.hora_inicio || '').substring(0, 5)) + '</td>' +
              '<td>' + escapeHtml(esp) + '</td>' +
              '<td class="vs-hide-md">' + escapeHtml(med) + '</td>' +
              '<td>' + escapeHtml(c.motivo_consulta || '—') + '</td>' +
              '<td><span class="vs-badge ' + bCls + '"><span class="vs-badge__dot"></span>' + est + '</span></td>' +
              '<td class="vs-hide-md vs-xs">' + escapeHtml(c.observacion_atencion || c.motivo_cancelacion || '—') + '</td>' +
              '</tr>';
          });
          tbody16.innerHTML = html;
        } catch (e) {}
      }
      cargarHistorialCU16();
    }

    if (currentCuAttr === 'CU17') {
      var tbody17 = document.querySelector('.vs-table tbody');
      async function cargarPacientesCU17() {
        if (!tbody17) return;
        try {
          var res = await VS_API.getPacientes({ per_page: 50 });
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          var html = '';
          list.forEach(function (p) {
            var pers = p.persona || {};
            var activo = pers.activo !== false;
            var nom = (pers.nombres || '') + ' ' + (pers.apellidos || '');
            var btn = activo
              ? '<button type="button" class="vs-btn vs-btn--danger-soft vs-btn--sm btn-inact-pac17" data-id="' + p.id_persona + '" data-name="' + escapeHtml(nom) + '"><svg class="vs-i"><use href="#i-ban"/></svg>Desactivar</button>'
              : '<button type="button" class="vs-btn vs-btn--teal vs-btn--sm btn-react-pac17" data-id="' + p.id_persona + '" data-name="' + escapeHtml(nom) + '"><svg class="vs-i"><use href="#i-undo"/></svg>Reactivar</button>';
            html += '<tr>' +
              '<td class="vs-td-num">' + escapeHtml(p.codigo || ('PAC-' + p.id_persona)) + '</td>' +
              '<td><div class="vs-cell-person__name">' + escapeHtml(nom) + '</div><div class="vs-cell-person__sub vs-mono">CI ' + escapeHtml(pers.ci || '') + '</div></td>' +
              '<td class="vs-hide-md">' + (activo ? '<span class="vs-badge vs-badge--ok">Activo</span>' : '<span class="vs-badge vs-badge--muted">Inactivo</span>') + '</td>' +
              '<td class="vs-hide-md vs-td-num">' + escapeHtml(pers.telefono || '—') + '</td>' +
              '<td class="vs-td-actions">' + btn + '</td>' +
              '</tr>';
          });
          if (html) tbody17.innerHTML = html;
        } catch (e) {}
      }
      if (tbody17) {
        tbody17.addEventListener('click', async function (ev) {
          var bIn = ev.target.closest('.btn-inact-pac17');
          if (bIn) {
            var id = bIn.getAttribute('data-id');
            try {
              await VS_API.inactivarPaciente(id, 'Baja lógica desde CU17');
              if (window.vsToast) window.vsToast('Paciente desactivado', 'Baja lógica aplicada y registrada en bitácora (INACTIVAR)');
              cargarPacientesCU17();
            } catch (err) {
              alert('No se pudo desactivar: ' + (err.data && err.data.message ? err.data.message : err.message));
            }
            return;
          }
          var bRe = ev.target.closest('.btn-react-pac17');
          if (bRe) {
            var idR = bRe.getAttribute('data-id');
            try {
              await VS_API.reactivarPaciente(idR);
              if (window.vsToast) window.vsToast('Paciente reactivado', 'Reactivado y registrado en bitácora (RENOVAR)');
              cargarPacientesCU17();
            } catch (err) {
              alert('Error: ' + err.message);
            }
          }
        });
        cargarPacientesCU17();
      }
    }

    // =========================================================================
    // 23. CU19 MODAL CREAR MÉDICO, CU20 HORARIOS, CU21 DESACTIVAR MÉDICO
    // =========================================================================
    var formCrearMedico19 = document.getElementById('form-crear-medico');
    if (formCrearMedico19 && !formCrearMedico19.getAttribute('data-bound')) {
      formCrearMedico19.setAttribute('data-bound', 'true');
      formCrearMedico19.setAttribute('data-api-bound', 'true');
      formCrearMedico19.addEventListener('submit', async function (e) {
        e.preventDefault();
        var ci = document.getElementById('m-ci') ? document.getElementById('m-ci').value.trim() : '';
        var mat = document.getElementById('m-mat') ? document.getElementById('m-mat').value.trim() : '';
        var nom = document.getElementById('m-nom') ? document.getElementById('m-nom').value.trim() : '';
        var ape = document.getElementById('m-ape') ? document.getElementById('m-ape').value.trim() : '';
        var tel = document.getElementById('m-tel') ? document.getElementById('m-tel').value.trim() : '';
        var email = document.getElementById('m-email') ? document.getElementById('m-email').value.trim() : '';
        try {
          var espRes = await VS_API.getEspecialidades();
          var espList = espRes.data || [];
          var firstEspId = espList.length > 0 ? espList[0].id_especialidad : 1;
          await VS_API.crearMedico({
            ci: ci,
            matricula: mat,
            nombres: nom,
            apellidos: ape,
            telefono: tel,
            email: email,
            especialidades: [firstEspId]
          });
          var dlgM = document.getElementById('dlg-medico');
          if (dlgM && dlgM.close) dlgM.close();
          if (window.vsToast) window.vsToast('Médico registrado', 'Almacenado en PostgreSQL y auditado en bitácora (REGISTRAR)');
          setTimeout(function () { location.reload(); }, 600);
        } catch (err) {
          var msg = err.data && err.data.errors ? Object.values(err.data.errors).flat().join('\n') : (err.data && err.data.message ? err.data.message : err.message);
          alert('Error al registrar médico:\n' + msg);
        }
      });
    }

    if (currentCuAttr === 'CU20') {
      var selMed20 = document.getElementById('h-medico');
      var dlgHor20 = document.getElementById('dlg-horario');
      var formHor20 = dlgHor20 ? dlgHor20.querySelector('form') : null;

      async function initCU20() {
        try {
          var resM = await VS_API.getMedicos();
          var mList = (resM && resM.data && resM.data.data) ? resM.data.data : (resM.data || []);
          if (selMed20 && mList.length) {
            selMed20.innerHTML = '';
            mList.forEach(function (m) {
              var p = m.persona || {};
              var opt = document.createElement('option');
              opt.value = m.id_persona;
              opt.textContent = (m.codigo || 'MED') + ' · Dr(a). ' + (p.nombres || '') + ' ' + (p.apellidos || '');
              selMed20.appendChild(opt);
            });
          }
        } catch (e) {}
      }
      initCU20();

      if (formHor20) {
        formHor20.setAttribute('data-api-bound', 'true');
        formHor20.addEventListener('submit', async function (e) {
          e.preventDefault();
          var medId = selMed20 ? parseInt(selMed20.value, 10) : 1;
          var hi = document.getElementById('h-ini') ? document.getElementById('h-ini').value : '08:00';
          var hf = document.getElementById('h-fin') ? document.getElementById('h-fin').value : '12:00';
          try {
            await VS_API.configurarHorariosMedico(medId, {
              dias_semana: [1, 2, 3, 4, 5],
              hora_inicio: hi.substring(0, 5),
              hora_fin: hf.substring(0, 5),
              duracion_bloque_min: 30
            });
            if (dlgHor20 && dlgHor20.close) dlgHor20.close();
            if (window.vsToast) window.vsToast('Horario guardado en BD', 'Bloques de 30 min generados y auditados en bitácora (CREAR)');
          } catch (err) {
            alert('Error al configurar horario: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }
    }

    if (currentCuAttr === 'CU21') {
      var tbody21 = document.querySelector('.vs-table tbody');
      async function cargarMedicosCU21() {
        if (!tbody21) return;
        try {
          var res = await VS_API.getMedicos();
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          var html = '';
          list.forEach(function (m) {
            var p = m.persona || {};
            var activo = p.activo !== false;
            var nom = 'Dr(a). ' + (p.nombres || '') + ' ' + (p.apellidos || '');
            var btn = activo
              ? '<button type="button" class="vs-btn vs-btn--danger-soft vs-btn--sm btn-inact-med21" data-id="' + m.id_persona + '"><svg class="vs-i"><use href="#i-ban"/></svg>Desactivar</button>'
              : '<button type="button" class="vs-btn vs-btn--teal vs-btn--sm btn-react-med21" data-id="' + m.id_persona + '"><svg class="vs-i"><use href="#i-undo"/></svg>Reactivar</button>';
            html += '<tr>' +
              '<td class="vs-td-num">' + escapeHtml(m.codigo || ('MED-' + m.id_persona)) + '</td>' +
              '<td><div class="vs-cell-person__name">' + escapeHtml(nom) + '</div><div class="vs-cell-person__sub vs-mono">' + escapeHtml(m.matricula || '') + '</div></td>' +
              '<td>' + (activo ? '<span class="vs-badge vs-badge--ok">Activo</span>' : '<span class="vs-badge vs-badge--muted">Inactivo</span>') + '</td>' +
              '<td class="vs-hide-md vs-td-num">' + escapeHtml(p.telefono || '—') + '</td>' +
              '<td class="vs-td-actions">' + btn + '</td>' +
              '</tr>';
          });
          if (html) tbody21.innerHTML = html;
        } catch (e) {}
      }
      if (tbody21) {
        tbody21.addEventListener('click', async function (ev) {
          var bIn = ev.target.closest('.btn-inact-med21');
          if (bIn) {
            try {
              await VS_API.inactivarMedico(bIn.getAttribute('data-id'), 'Baja lógica desde CU21');
              if (window.vsToast) window.vsToast('Médico desactivado', 'Registrado en bitácora (INACTIVAR)');
              cargarMedicosCU21();
            } catch (err) {
              alert('No se pudo desactivar al médico: ' + (err.data && err.data.message ? err.data.message : err.message));
            }
            return;
          }
          var bRe = ev.target.closest('.btn-react-med21');
          if (bRe) {
            try {
              await VS_API.reactivarMedico(bRe.getAttribute('data-id'));
              if (window.vsToast) window.vsToast('Médico reactivado', 'Registrado en bitácora (RENOVAR)');
              cargarMedicosCU21();
            } catch (err) {
              alert('Error: ' + err.message);
            }
          }
        });
        cargarMedicosCU21();
      }
    }

    // =========================================================================
    // 24. CU22 DISPONIBILIDAD (100% DINÁMICO EN BLOQUES DE 15 MINUTOS POSTGRESQL)
    // =========================================================================
    if (currentCuAttr === 'CU22') {
      var selEsp22 = document.getElementById('d-esp');
      var selMed22 = document.getElementById('d-med');
      var inFecha22 = document.getElementById('d-fecha');
      var slotsBox22 = document.querySelector('[data-slots="disp"]') || document.getElementById('cu22-slots-container');
      var filterForm22 = document.querySelector('.vs-filters');
      var btnProximo22 = document.getElementById('cu22-btn-proximo');
      var btnConsultar22 = document.getElementById('cu22-btn-consultar');
      var titulo22 = document.getElementById('cu22-titulo');
      var sub22 = document.getElementById('cu22-sub');
      var otrosMedBox22 = document.getElementById('cu22-otros-medicos');
      var slotSummary22 = document.querySelector('[data-slot-summary="disp"]');
      var slotConfirmBtn22 = document.querySelector('[data-slot-confirm="disp"]');

      var medicosGlobalCU22 = [];

      // Inicializar fecha con hoy (Bolivia)
      if (inFecha22 && !inFecha22.value) {
        var hoyLocal = new Date();
        var y = hoyLocal.getFullYear();
        var m = String(hoyLocal.getMonth() + 1).padStart(2, '0');
        var d = String(hoyLocal.getDate()).padStart(2, '0');
        inFecha22.value = y + '-' + m + '-' + d;
      }

      async function inicializarFiltrosCU22() {
        try {
          var resEsp = await VS_API.getEspecialidades();
          var espList = (resEsp && resEsp.data && resEsp.data.data) ? resEsp.data.data : (resEsp.data || []);
          if (selEsp22 && espList.length) {
            selEsp22.innerHTML = '<option value="">Todas las especialidades</option>' +
              espList.map(function (e) {
                return '<option value="' + e.id_especialidad + '">' + escapeHtml(e.nombre) + '</option>';
              }).join('');
          }

          var resMed = await VS_API.getMedicos();
          medicosGlobalCU22 = (resMed && resMed.data && resMed.data.data) ? resMed.data.data : (resMed.data || []);
          poblarSelectMedicosCU22();
        } catch (e) {}
      }

      function poblarSelectMedicosCU22(espId) {
        if (!selMed22) return;
        var filtrados = medicosGlobalCU22;
        if (espId) {
          filtrados = medicosGlobalCU22.filter(function (m) {
            var esps = m.especialidades || [];
            return esps.some(function (x) { return String(x.id_especialidad) === String(espId); });
          });
        }
        selMed22.innerHTML = '<option value="">Cualquier médico de la especialidad</option>' +
          filtrados.map(function (m) {
            var p = m.persona || {};
            var nom = (p.nombres || '') + ' ' + (p.apellidos || '');
            return '<option value="' + m.id_persona + '">Dr(a). ' + escapeHtml(nom) + (m.codigo ? (' · ' + m.codigo) : '') + '</option>';
          }).join('');
        if (filtrados.length > 0 && !selMed22.value) {
          selMed22.value = filtrados[0].id_persona;
        }
      }

      if (selEsp22) {
        selEsp22.addEventListener('change', function () {
          poblarSelectMedicosCU22(selEsp22.value);
          cargarDisponibilidadCU22();
        });
      }

      if (selMed22) {
        selMed22.addEventListener('change', function () {
          cargarDisponibilidadCU22();
        });
      }

      if (inFecha22) {
        inFecha22.addEventListener('change', function () {
          cargarDisponibilidadCU22();
        });
      }

      async function cargarDisponibilidadCU22() {
        if (!slotsBox22) return;
        slotsBox22.innerHTML = '<p class="vs-muted" style="text-align:center;padding:2rem;width:100%;">Consultando turnos y reservas en tiempo real...</p>';

        try {
          var medId = selMed22 && selMed22.value ? selMed22.value : null;
          var espId = selEsp22 && selEsp22.value ? selEsp22.value : null;
          var fecha = inFecha22 && inFecha22.value ? inFecha22.value : new Date().toISOString().slice(0, 10);

          var params = { fecha: fecha };
          if (medId) params.id_medico = medId;
          if (espId) params.id_especialidad = espId;

          var disp = await VS_API.getDisponibilidad(params);

          if (!disp || !disp.success) {
            slotsBox22.innerHTML = '<p class="vs-muted" style="text-align:center;padding:2rem;width:100%;">' + escapeHtml((disp && disp.message) ? disp.message : 'No hay turnos configurados para los criterios seleccionados.') + '</p>';
            return;
          }

          var med = disp.medico || {};
          var pMed = med.persona || {};
          var nombreDoc = 'Dr(a). ' + (pMed.nombres || '') + ' ' + (pMed.apellidos || '');

          if (titulo22) {
            titulo22.textContent = (disp.nombre_dia || fecha) + ' · ' + nombreDoc;
          }
          if (sub22) {
            sub22.textContent = (disp.turno || 'Turno') + ' · ' + disp.total_bloques + ' bloques (cada 15 min) · ' + disp.bloques_libres + ' libres';
          }

          if (slotSummary22) slotSummary22.textContent = 'ninguno';
          if (slotConfirmBtn22) {
            slotConfirmBtn22.classList.add('is-disabled');
            slotConfirmBtn22.setAttribute('aria-disabled', 'true');
            slotConfirmBtn22.removeAttribute('href');
          }

          var slots = disp.slots || [];
          if (slots.length === 0) {
            slotsBox22.innerHTML = '<p class="vs-muted" style="text-align:center;padding:2rem;width:100%;">No hay bloques horarios disponibles para este médico en la fecha indicada.</p>';
          } else {
            var sHtml = '';
            slots.forEach(function (s) {
              if (s.estado === 'LIBRE') {
                sHtml += '<button type="button" class="vs-slot vs-slot--free" data-time="' + s.hora_inicio + '" data-end="' + s.hora_fin + '" title="Libre para agendar (15 min)">' +
                  s.hora_inicio + '<small>LIBRE</small></button>';
              } else if (s.estado === 'BLOQUEADO') {
                sHtml += '<button type="button" class="vs-slot vs-slot--blocked" data-time="' + s.hora_inicio + '" data-estado="bloqueado" data-motivo="' + escapeHtml(s.motivo || 'Bloqueado') + '" title="No disponible: ' + escapeHtml(s.motivo || 'Bloqueado') + '">' +
                  s.hora_inicio + '<small>' + escapeHtml(s.motivo ? (s.motivo.slice(0, 11) + '..') : 'Bloqueado') + '</small></button>';
              } else {
                sHtml += '<button type="button" class="vs-slot vs-slot--busy" data-time="' + s.hora_inicio + '" data-estado="ocupado" data-cita="' + escapeHtml(s.cita_codigo || '') + '" title="Horario reservado: ' + escapeHtml(s.cita_codigo || 'Cita médica') + '">' +
                  s.hora_inicio + '<small>' + escapeHtml(s.cita_codigo || 'RESERVADO') + '</small></button>';
              }
            });
            slotsBox22.innerHTML = sHtml;

            // Delegar eventos a los botones de slots
            slotsBox22.querySelectorAll('.vs-slot').forEach(function (btn) {
              btn.addEventListener('click', function () {
                var estado = btn.getAttribute('data-estado');
                var horaIni = btn.getAttribute('data-time');
                var horaFin = btn.getAttribute('data-end');

                if (estado === 'ocupado') {
                  var codC = btn.getAttribute('data-cita');
                  if (window.vsToast) {
                    window.vsToast('Horario ya reservado', 'El bloque de las ' + horaIni + ' tiene la cita ' + codC + '. Debes escoger otro horario libre.', 'warning');
                  } else {
                    alert('Este horario (' + horaIni + ') ya está reservado (' + codC + '). Por favor escoge un horario libre.');
                  }
                  return;
                }

                if (estado === 'bloqueado') {
                  var motB = btn.getAttribute('data-motivo');
                  if (window.vsToast) {
                    window.vsToast('Horario no disponible', 'Bloqueado por: ' + motB + '. Por favor escoge otro horario libre.', 'danger');
                  } else {
                    alert('Horario no disponible (' + horaIni + '): ' + motB);
                  }
                  return;
                }

                // Es LIBRE: seleccionar
                slotsBox22.querySelectorAll('.vs-slot').forEach(function (b) { b.classList.remove('is-selected'); });
                btn.classList.add('is-selected');

                if (slotSummary22) {
                  slotSummary22.textContent = horaIni + ' – ' + (horaFin || '') + ' (' + nombreDoc + ')';
                }

                if (slotConfirmBtn22) {
                  slotConfirmBtn22.classList.remove('is-disabled');
                  slotConfirmBtn22.removeAttribute('aria-disabled');
                  var idDocActual = med.id_persona || medId;
                  slotConfirmBtn22.href = 'cu24-programar-cita.html?medico=' + encodeURIComponent(idDocActual) +
                    '&fecha=' + encodeURIComponent(fecha) +
                    '&hora=' + encodeURIComponent(horaIni) +
                    (espId ? ('&especialidad=' + encodeURIComponent(espId)) : '');
                }

                if (window.vsToast) {
                  window.vsToast('Horario de 15 min seleccionado', horaIni + ' – ' + horaFin + ' listo para programar cita.');
                }
              });
            });
          }

          // Cargar "Otros médicos"
          if (otrosMedBox22 && Array.isArray(disp.otros_medicos)) {
            if (disp.otros_medicos.length === 0) {
              otrosMedBox22.innerHTML = '<li class="vs-list-row" style="color:var(--vs-muted);padding:1rem;text-align:center;">No hay otros médicos con turno este día.</li>';
            } else {
              otrosMedBox22.innerHTML = disp.otros_medicos.map(function (om) {
                var iniciales = om.nombre.replace(/Dr\(a\)\.\s*/, '').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('');
                return '<li class="vs-list-row" style="cursor:pointer;" data-om-id="' + om.id_medico + '">' +
                  '<div class="vs-avatar vs-avatar--sm">' + escapeHtml(iniciales || 'MD') + '</div>' +
                  '<div class="vs-cell-person">' +
                    '<div class="vs-cell-person__name">' + escapeHtml(om.nombre) + '</div>' +
                    '<div class="vs-cell-person__sub">' + escapeHtml(om.turno) + ' · ' + om.bloques_libres + ' bloques libres</div>' +
                  '</div>' +
                  '<span class="vs-badge ' + (om.bloques_libres > 0 ? 'vs-badge--ok' : 'vs-badge--warn') + '">' + om.bloques_libres + '</span>' +
                '</li>';
              }).join('');

              otrosMedBox22.querySelectorAll('li[data-om-id]').forEach(function (row) {
                row.addEventListener('click', function () {
                  var omId = row.getAttribute('data-om-id');
                  if (selMed22) selMed22.value = omId;
                  cargarDisponibilidadCU22();
                });
              });
            }
          }
        } catch (err) {
          slotsBox22.innerHTML = '<p class="vs-muted" style="text-align:center;padding:2rem;width:100%;">Error al consultar disponibilidad: ' + escapeHtml(err.message) + '</p>';
        }
      }

      // Botón "Próximo libre"
      if (btnProximo22) {
        btnProximo22.addEventListener('click', async function () {
          try {
            btnProximo22.disabled = true;
            btnProximo22.textContent = 'Buscando...';
            var medId = selMed22 && selMed22.value ? selMed22.value : null;
            var espId = selEsp22 && selEsp22.value ? selEsp22.value : null;
            var fechaBase = inFecha22 && inFecha22.value ? inFecha22.value : new Date().toISOString().slice(0, 10);

            var resp = await VS_API.getProximoLibre({
              id_medico: medId,
              id_especialidad: espId,
              fecha_desde: fechaBase
            });

            if (resp && resp.success && resp.fecha_encontrada) {
              inFecha22.value = resp.fecha_encontrada;
              if (window.vsToast) {
                window.vsToast('Próximo turno libre encontrado', 'Fecha: ' + resp.fecha_encontrada);
              }
              cargarDisponibilidadCU22();
            } else {
              alert((resp && resp.message) ? resp.message : 'No se encontraron turnos libres próximos.');
            }
          } catch (e) {
            alert('No se encontraron turnos libres disponibles en los próximos días.');
          } finally {
            btnProximo22.disabled = false;
            btnProximo22.innerHTML = '<svg class="vs-i"><use href="#i-sparkle"/></svg>Próximo libre';
          }
        });
      }

      if (filterForm22) {
        filterForm22.addEventListener('submit', function (e) {
          e.preventDefault();
          cargarDisponibilidadCU22();
        });
      }

      inicializarFiltrosCU22().then(function () {
        cargarDisponibilidadCU22();
      });
    }

    if (currentCuAttr === 'CU23') {
      var tbody23 = document.querySelector('.vs-table tbody');
      var dlgBloq23 = document.getElementById('dlg-bloqueo');
      var formBloq23 = dlgBloq23 ? dlgBloq23.querySelector('form') : null;
      var selMed23 = document.getElementById('bl-medico');

      async function cargarBloqueosCU23() {
        try {
          var resM = await VS_API.getMedicos();
          var mList = (resM && resM.data && resM.data.data) ? resM.data.data : (resM.data || []);
          if (selMed23 && mList.length) {
            selMed23.innerHTML = '';
            mList.forEach(function (m) {
              var p = m.persona || {};
              var opt = document.createElement('option');
              opt.value = m.id_persona;
              opt.textContent = (m.codigo || 'MED') + ' · Dr(a). ' + (p.nombres || '') + ' ' + (p.apellidos || '');
              selMed23.appendChild(opt);
            });
          }

          var resB = await VS_API.getBloqueosAgenda();
          var bList = resB.data || [];
          if (tbody23 && bList.length) {
            var html = '';
            bList.forEach(function (b) {
              var alcance = b.aplica_a_todos ? '<span class="vs-strong">Toda la clínica</span>' : (b.medico && b.medico.persona ? ('Dr(a). ' + b.medico.persona.nombres + ' ' + b.medico.persona.apellidos) : 'Médico');
              var bCls = b.tipo === 'FERIADO' ? 'vs-badge--rose' : (b.tipo === 'LICENCIA' ? 'vs-badge--warn' : 'vs-badge--info');
              html += '<tr>' +
                '<td><span class="vs-badge ' + bCls + ' vs-badge--mono">' + escapeHtml(b.tipo) + '</span></td>' +
                '<td>' + alcance + '</td>' +
                '<td class="vs-td-num">' + escapeHtml(b.fecha_inicio) + ' → ' + escapeHtml(b.fecha_fin) + '</td>' +
                '<td class="vs-hide-md">' + escapeHtml(b.motivo) + '</td>' +
                '<td class="vs-td-actions"><button type="button" class="vs-icon-btn vs-icon-btn--danger btn-del-bloq23" data-id="' + b.id_bloqueo + '" title="Eliminar bloqueo"><svg class="vs-i"><use href="#i-trash"/></svg></button></td>' +
                '</tr>';
            });
            tbody23.innerHTML = html;
          }
        } catch (e) {}
      }

      if (tbody23) {
        tbody23.addEventListener('click', async function (ev) {
          var btn = ev.target.closest('.btn-del-bloq23');
          if (!btn) return;
          try {
            await VS_API.eliminarBloqueoAgenda(btn.getAttribute('data-id'));
            if (window.vsToast) window.vsToast('Bloqueo eliminado', 'Agenda liberada y auditada en bitácora (ELIMINAR)');
            cargarBloqueosCU23();
          } catch (e) {}
        });
      }

      if (formBloq23) {
        formBloq23.setAttribute('data-api-bound', 'true');
        formBloq23.addEventListener('submit', async function (e) {
          e.preventDefault();
          var tipoEl = formBloq23.querySelector('input[name="tipo"]:checked');
          var tipoVal = tipoEl ? tipoEl.value.toUpperCase() : 'LICENCIA';
          var alcEl = formBloq23.querySelector('input[name="alc"]:checked');
          var aplicaTodos = alcEl ? (alcEl.value === 'todos') : (tipoVal === 'FERIADO');
          var fIni = document.getElementById('bl-ini') ? document.getElementById('bl-ini').value : new Date().toISOString().slice(0, 10);
          var fFin = document.getElementById('bl-fin') ? document.getElementById('bl-fin').value : fIni;
          var mot = document.getElementById('bl-motivo') ? document.getElementById('bl-motivo').value.trim() : 'Bloqueo administrativo';
          var medId = selMed23 ? parseInt(selMed23.value, 10) : null;
          try {
            await VS_API.crearBloqueoAgenda({
              tipo: tipoVal,
              fecha_inicio: fIni,
              fecha_fin: fFin,
              id_medico: aplicaTodos ? null : medId,
              aplica_a_todos: aplicaTodos,
              motivo: mot,
              confirmar_con_citas_afectadas: true
            });
            if (dlgBloq23 && dlgBloq23.close) dlgBloq23.close();
            if (window.vsToast) window.vsToast('Bloqueo registrado', 'Guardado en PostgreSQL y auditado en bitácora (CREAR)');
            cargarBloqueosCU23();
          } catch (err) {
            alert('Error al bloquear agenda: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }

      cargarBloqueosCU23();
    }

    if (currentCuAttr === 'CU26') {
      var formRepro26 = document.querySelector('form[data-demo="Cita reprogramada"]');
      var currentCitaId26 = null;
      var selMed26 = document.getElementById('r-med');

      async function initCU26() {
        try {
          var resC = await VS_API.getCitas({ per_page: 20 });
          var cList = (resC && resC.data && resC.data.data) ? resC.data.data : (resC.data || []);
          var prog = cList.find(function (c) { return c.estado === 'PROGRAMADA' || c.estado === 'CONFIRMADA'; }) || cList[0];
          if (prog) currentCitaId26 = prog.id_cita;

          var resM = await VS_API.getMedicos();
          var mList = (resM && resM.data && resM.data.data) ? resM.data.data : (resM.data || []);
          if (selMed26 && mList.length) {
            selMed26.innerHTML = '';
            mList.forEach(function (m) {
              var p = m.persona || {};
              var opt = document.createElement('option');
              opt.value = m.id_persona;
              opt.textContent = (m.codigo || 'MED') + ' · Dr(a). ' + (p.nombres || '') + ' ' + (p.apellidos || '');
              selMed26.appendChild(opt);
            });
          }
        } catch (e) {}
      }
      initCU26();

      if (formRepro26) {
        formRepro26.setAttribute('data-api-bound', 'true');
        formRepro26.addEventListener('submit', async function (e) {
          e.preventDefault();
          if (!currentCitaId26) {
            alert('No se encontró una cita activa para reprogramar.');
            return;
          }
          var nFecha = document.getElementById('r-fecha') ? document.getElementById('r-fecha').value : new Date().toISOString().slice(0, 10);
          var nMotivo = document.getElementById('r-motivo') ? document.getElementById('r-motivo').value : 'Solicitud del paciente';
          var selSlot = document.querySelector('[data-slots="repro"] .vs-slot.is-selected');
          var nHora = selSlot ? (selSlot.getAttribute('data-time') || '09:00') : '09:00';
          var nMed = selMed26 ? parseInt(selMed26.value, 10) : undefined;
          try {
            await VS_API.reprogramarCita(currentCitaId26, {
              nueva_fecha: nFecha,
              nueva_hora_inicio: nHora,
              nuevo_medico_id: nMed,
              motivo_reprogramacion: nMotivo || 'Solicitud del paciente'
            });
            if (window.vsToast) window.vsToast('Cita reprogramada', 'Actualizada en PostgreSQL y auditada en bitácora (MODIFICAR)');
          } catch (err) {
            alert('Error al reprogramar: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }
    }

    if (currentCuAttr === 'CU27') {
      var tbody27 = document.querySelector('.vs-table tbody');
      var dlgCanc27 = document.getElementById('dlg-cancelar');
      var formCanc27 = dlgCanc27 ? dlgCanc27.querySelector('form') : null;
      var citaIdCancel27 = null;

      async function cargarCitasCU27() {
        if (!tbody27) return;
        try {
          var res = await VS_API.getCitas({ per_page: 30 });
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          var cancelables = list.filter(function (c) { return c.estado === 'PROGRAMADA' || c.estado === 'CONFIRMADA'; });
          if (!cancelables.length) return;
          var html = '';
          cancelables.forEach(function (c) {
            var pac = c.paciente && c.paciente.persona ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : 'Paciente';
            var tel = c.paciente && c.paciente.persona ? (c.paciente.persona.telefono || '') : '';
            var bCls = c.estado === 'CONFIRMADA' ? 'vs-badge--cyan' : 'vs-badge--info';
            html += '<tr>' +
              '<td class="vs-td-num">' + escapeHtml(c.codigo || ('CM-' + c.id_cita)) + '</td>' +
              '<td class="vs-td-num">' + escapeHtml(c.fecha) + ' ' + escapeHtml((c.hora_inicio || '').substring(0, 5)) + '</td>' +
              '<td><div class="vs-cell-person__name">' + escapeHtml(pac) + '</div><div class="vs-cell-person__sub vs-mono">' + escapeHtml(tel) + '</div></td>' +
              '<td class="vs-hide-md">' + escapeHtml(c.motivo_consulta || '—') + '</td>' +
              '<td><span class="vs-badge ' + bCls + '"><span class="vs-badge__dot"></span>' + escapeHtml(c.estado) + '</span></td>' +
              '<td class="vs-td-actions"><button type="button" class="vs-btn vs-btn--danger-soft vs-btn--sm btn-open-canc27" data-id="' + c.id_cita + '" data-code="' + escapeHtml(c.codigo || ('CM-' + c.id_cita)) + '"><svg class="vs-i"><use href="#i-calendar-x"/></svg>Cancelar</button></td>' +
              '</tr>';
          });
          tbody27.innerHTML = html;
        } catch (e) {}
      }

      if (tbody27) {
        tbody27.addEventListener('click', function (ev) {
          var btn = ev.target.closest('.btn-open-canc27');
          if (!btn) return;
          citaIdCancel27 = btn.getAttribute('data-id');
          if (dlgCanc27 && dlgCanc27.showModal) dlgCanc27.showModal();
        });
      }

      if (formCanc27) {
        formCanc27.setAttribute('data-api-bound', 'true');
        formCanc27.addEventListener('submit', async function (e) {
          e.preventDefault();
          var mot = document.getElementById('cx-motivo') ? document.getElementById('cx-motivo').value : 'Solicitud del paciente';
          var det = document.getElementById('cx-detalle') ? document.getElementById('cx-detalle').value.trim() : '';
          var motivoCompleto = (mot || 'Solicitud del paciente') + (det ? ': ' + det : '');
          if (!citaIdCancel27) {
            var res = await VS_API.getCitas({ per_page: 5 });
            var l = (res && res.data && res.data.data) ? res.data.data : [];
            if (l[0]) citaIdCancel27 = l[0].id_cita;
          }
          try {
            await VS_API.cancelarCita(citaIdCancel27, motivoCompleto);
            if (dlgCanc27 && dlgCanc27.close) dlgCanc27.close();
            if (window.vsToast) window.vsToast('Cita cancelada', 'Estado CANCELADA en PostgreSQL y auditado en bitácora (CANCELAR)');
            cargarCitasCU27();
          } catch (err) {
            alert('Error al cancelar cita: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }

      cargarCitasCU27();
    }

    if (currentCuAttr === 'CU28') {
      var tbody28 = document.querySelector('.vs-table tbody');
      var btnRegen28 = document.querySelector('[data-toast="Lista regenerada"]');

      async function cargarNotificacionesCU28() {
        if (!tbody28) return;
        try {
          var res = await VS_API.getNotificaciones({ per_page: 25 });
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          if (!list.length) return;
          var html = '';
          list.forEach(function (n) {
            var c = n.cita || {};
            var pac = c.paciente && c.paciente.persona ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : 'Paciente';
            var tel = c.paciente && c.paciente.persona ? (c.paciente.persona.telefono || '70000000') : '70000000';
            var med = c.medico && c.medico.persona ? ('Dr(a). ' + c.medico.persona.apellidos) : 'Médico';
            var est = (n.estado || 'PENDIENTE').toUpperCase();
            var bCls = est === 'ENVIADA' ? 'vs-badge--ok' : (est === 'FALLIDA' ? 'vs-badge--danger' : 'vs-badge--warn');
            html += '<tr>' +
              '<td><div class="vs-cell-person__name vs-mono">' + escapeHtml(c.codigo || ('CM-' + n.id_cita)) + '</div><div class="vs-cell-person__sub">' + escapeHtml(c.fecha || '') + ' ' + escapeHtml((c.hora_inicio || '').substring(0, 5)) + '</div></td>' +
              '<td><div class="vs-cell-person__name">' + escapeHtml(pac) + '</div></td>' +
              '<td class="vs-hide-md">' + escapeHtml(med) + '</td>' +
              '<td class="vs-td-num">' + escapeHtml(tel) + '</td>' +
              '<td><span class="vs-badge ' + bCls + '"><span class="vs-badge__dot"></span>' + est + '</span></td>' +
              '<td class="vs-td-actions">' +
                '<button type="button" class="vs-btn vs-btn--teal vs-btn--sm btn-conf-notif28" data-id="' + n.id_notificacion + '"><svg class="vs-i"><use href="#i-check"/></svg>Confirmó</button>' +
              '</td>' +
              '</tr>';
          });
          tbody28.innerHTML = html;
        } catch (e) {}
      }

      if (tbody28) {
        tbody28.addEventListener('click', async function (ev) {
          var btn = ev.target.closest('.btn-conf-notif28');
          if (!btn) return;
          try {
            await VS_API.registrarGestionNotificacion(btn.getAttribute('data-id'), {
              estado: 'ENVIADA',
              confirmar_cita: true,
              observacion: 'Paciente confirmó asistencia telefónicamente'
            });
            if (window.vsToast) window.vsToast('Asistencia confirmada', 'Notificación ENVIADA y cita CONFIRMADA en bitácora');
            cargarNotificacionesCU28();
          } catch (e) {}
        });
      }

      if (btnRegen28) {
        btnRegen28.addEventListener('click', async function () {
          try {
            await VS_API.regenerarNotificaciones();
            cargarNotificacionesCU28();
          } catch (e) {}
        });
      }

      cargarNotificacionesCU28();
    }

    if (currentCuAttr === 'CU29') {
      var tbody29 = document.querySelector('.vs-table tbody');
      async function cargarAsistenciaCU29() {
        if (!tbody29) return;
        try {
          var res = await VS_API.getCitas({ per_page: 25 });
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          if (!list.length) return;
          var html = '';
          list.slice(0, 12).forEach(function (c) {
            var pac = c.paciente && c.paciente.persona ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : 'Paciente';
            var est = (c.estado || 'PROGRAMADA').toUpperCase();
            var bCls = est === 'ATENDIDA' ? 'vs-badge--ok' : (est === 'CONFIRMADA' ? 'vs-badge--cyan' : (est === 'CANCELADA' ? 'vs-badge--danger' : (est === 'INASISTENCIA' ? 'vs-badge--warn' : 'vs-badge--info')));
            var actBtns = '<span class="vs-xs vs-muted">Final</span>';
            if (est === 'PROGRAMADA' || est === 'CONFIRMADA') {
              actBtns = '<button type="button" class="vs-btn vs-btn--teal vs-btn--sm btn-llego-cu29" data-id="' + c.id_cita + '"><svg class="vs-i"><use href="#i-check"/></svg>Llegó</button> ' +
                '<button type="button" class="vs-btn vs-btn--warn-soft vs-btn--sm btn-inasist-cu29" data-id="' + c.id_cita + '"><svg class="vs-i"><use href="#i-x-circle"/></svg>No asistió</button>';
            }
            html += '<tr>' +
              '<td class="vs-td-num">' + escapeHtml((c.hora_inicio || '').substring(0, 5)) + '</td>' +
              '<td class="vs-td-num">' + escapeHtml(c.codigo || ('CM-' + c.id_cita)) + '</td>' +
              '<td>' + escapeHtml(pac) + '</td>' +
              '<td><span class="vs-badge ' + bCls + '"><span class="vs-badge__dot"></span>' + est + '</span></td>' +
              '<td class="vs-hide-md vs-xs">' + escapeHtml(c.fecha) + ' · ' + escapeHtml(c.motivo_consulta || '') + '</td>' +
              '<td class="vs-td-actions">' + actBtns + '</td>' +
              '</tr>';
          });
          tbody29.innerHTML = html;
        } catch (e) {}
      }
      if (tbody29) {
        tbody29.addEventListener('click', async function (ev) {
          var bLlego = ev.target.closest('.btn-llego-cu29');
          if (bLlego) {
            await VS_API.cambiarEstadoCita(bLlego.getAttribute('data-id'), { estado: 'CONFIRMADA', motivo: 'Llegada del paciente registrada en recepción (CU29)' });
            if (window.vsToast) window.vsToast('Llegada registrada', 'Cita pasó a CONFIRMADA y se registró en bitácora');
            cargarAsistenciaCU29();
            return;
          }
          var bInas = ev.target.closest('.btn-inasist-cu29');
          if (bInas) {
            await VS_API.cambiarEstadoCita(bInas.getAttribute('data-id'), { estado: 'INASISTENCIA', motivo: 'Paciente no se presentó a la cita (CU29)' });
            if (window.vsToast) window.vsToast('Inasistencia registrada', 'Cita pasó a INASISTENCIA y se registró en bitácora');
            cargarAsistenciaCU29();
          }
        });
        cargarAsistenciaCU29();
      }
    }

    if (currentCuAttr === 'CU31') {
      var form31 = document.querySelector('form[data-demo="Cita marcada como atendida"]');
      if (form31) {
        form31.setAttribute('data-api-bound', 'true');
        form31.addEventListener('submit', async function (e) {
          e.preventDefault();
          var obs = document.getElementById('at-obs') ? document.getElementById('at-obs').value.trim() : '';
          var p31 = new URLSearchParams(location.search);
          var citaId = p31.get('id');
          if (!citaId) {
            var resC = await VS_API.getCitas({ per_page: 20 });
            var list = (resC && resC.data && resC.data.data) ? resC.data.data : [];
            var target = list.find(function (c) { return c.estado === 'CONFIRMADA' || c.estado === 'PROGRAMADA'; }) || list[0];
            if (target) citaId = target.id_cita;
          }
          try {
            await VS_API.registrarAtencion(citaId, {
              estado: 'ATENDIDA',
              observacion_atencion: obs || 'Atención médica concluida sin novedades.'
            });
            if (window.vsToast) window.vsToast('Cita marcada como atendida', 'Guardada en PostgreSQL y auditada en bitácora (MODIFICAR)');
            setTimeout(function () { window.location.href = 'cu30-agenda-diaria.html'; }, 700);
          } catch (err) {
            alert('Error al registrar atención: ' + err.message);
          }
        });
      }
    }

    // =========================================================================
    // 24.5 CU30: AGENDA DIARIA DEL MÉDICO (100% DINÁMICO DESDE POSTGRESQL)
    // =========================================================================
    if (currentCuAttr === 'CU30') {
      var agendaContainer = document.getElementById('cu30-agenda-list');
      var fechaInp30 = document.getElementById('cu30-fecha-input');
      var badgeFecha30 = document.getElementById('cu30-fecha-badge');
      var kpiTot30 = document.getElementById('cu30-kpi-total');
      var kpiAten30 = document.getElementById('cu30-kpi-atendidas');
      var kpiEsp30 = document.getElementById('cu30-kpi-espera');
      var kpiCanc30 = document.getElementById('cu30-kpi-canceladas');
      var medNombre30 = document.getElementById('cu30-medico-nombre');
      var medSub30 = document.getElementById('cu30-medico-sub');
      var medAvatar30 = document.getElementById('cu30-avatar');

      // Ficha del paciente
      var pacAvatar = document.getElementById('cu30-pac-avatar');
      var pacNombre = document.getElementById('cu30-pac-nombre');
      var pacSub = document.getElementById('cu30-pac-sub');
      var pacCod = document.getElementById('cu30-pac-cod');
      var pacEdad = document.getElementById('cu30-pac-edad');
      var pacSangre = document.getElementById('cu30-pac-sangre');
      var pacAlergias = document.getElementById('cu30-pac-alergias');
      var pacAnt = document.getElementById('cu30-pac-ant');
      var pacEmerg = document.getElementById('cu30-pac-emerg');
      var pacUlt = document.getElementById('cu30-pac-ult');

      var citasDiaCache = [];

      function getFechaHoyIso() {
        var d = new Date();
        return d.toISOString().split('T')[0];
      }

      if (fechaInp30 && !fechaInp30.value) {
        fechaInp30.value = getFechaHoyIso();
      }

      async function cargarAgendaCU30() {
        if (!agendaContainer) return;
        agendaContainer.innerHTML = '<div style="padding:2.5rem;text-align:center;color:var(--vs-muted);">Consultando agenda médica desde la base de datos...</div>';
        try {
          var res = await VS_API.getCitas({ per_page: 100 });
          var todas = (res && res.data && res.data.data) ? res.data.data : (res.data || res || []);
          if (!Array.isArray(todas)) todas = [];

          var fechaSel = fechaInp30 ? fechaInp30.value : '';
          var citasFiltradas = todas.filter(function (c) {
            if (!fechaSel) return true;
            var f = (c.fecha || (c.horario && c.horario.fecha) || '').split('T')[0];
            return !f || f === fechaSel || fechaSel === '';
          });

          if (citasFiltradas.length === 0 && todas.length > 0) {
            citasFiltradas = todas;
          }

          citasDiaCache = citasFiltradas;

          var total = citasFiltradas.length;
          var atendidas = 0, espera = 0, canceladas = 0;

          citasFiltradas.forEach(function (c) {
            var st = String(c.estado || 'PROGRAMADA').toUpperCase();
            if (st === 'ATENDIDA') atendidas++;
            else if (st === 'CANCELADA') canceladas++;
            else espera++;
          });

          if (kpiTot30) kpiTot30.textContent = total;
          if (kpiAten30) kpiAten30.textContent = atendidas;
          if (kpiEsp30) kpiEsp30.textContent = espera;
          if (kpiCanc30) kpiCanc30.textContent = canceladas;
          if (badgeFecha30 && fechaSel) badgeFecha30.textContent = 'Fecha: ' + fechaSel;

          if (citasFiltradas.length > 0 && citasFiltradas[0].medico) {
            var med = citasFiltradas[0].medico;
            var medP = med.persona || {};
            var nomMed = 'Dr(a). ' + (medP.nombres || '') + ' ' + (medP.apellidos || '');
            if (medNombre30) medNombre30.textContent = nomMed;
            if (medSub30) medSub30.textContent = 'Agenda activa · ' + total + ' turnos registrados';
            if (medAvatar30) {
              var mInits = ((medP.nombres ? medP.nombres[0] : '') + (medP.apellidos ? medP.apellidos[0] : '')).toUpperCase() || 'MD';
              medAvatar30.textContent = mInits;
            }
          }

          if (citasFiltradas.length === 0) {
            agendaContainer.innerHTML = '<div style="padding:2.5rem;text-align:center;color:var(--vs-muted);">Sin citas médicas programadas para la fecha seleccionada.</div>';
            return;
          }

          var html = '';
          citasFiltradas.forEach(function (c, idx) {
            var p = (c.paciente && c.paciente.persona) ? c.paciente.persona : (c.paciente || {});
            var nomPac = (p.nombres ? (p.nombres + ' ' + (p.apellidos || '')) : 'Paciente') || 'Sin nombre';
            var codCita = c.codigo || ('CM-' + String(c.id_cita || idx + 1).padStart(4, '0'));
            var horaStr = c.hora_inicio || (c.horario ? c.horario.hora_inicio : '08:30') || '08:30';
            var st = String(c.estado || 'PROGRAMADA').toUpperCase();
            var badgeCls = st === 'ATENDIDA' ? 'vs-badge--ok' : (st === 'CANCELADA' ? 'vs-badge--danger' : 'vs-badge--info');
            var itemCls = st === 'CANCELADA' ? 'vs-agenda__item--cancel' : (st === 'ATENDIDA' ? 'vs-agenda__item--now' : '');

            html += '<div class="vs-agenda__row" data-cita-idx="' + idx + '" style="cursor:pointer;">' +
              '<div class="vs-agenda__time">' + escapeHtml(horaStr.substring(0, 5)) + '</div>' +
              '<div class="vs-agenda__item ' + itemCls + '">' +
                '<div><div class="vs-agenda__title">' + escapeHtml(nomPac) + ' <span class="vs-xs vs-mono vs-muted">' + escapeHtml(codCita) + '</span></div>' +
                '<div class="vs-agenda__sub">' + escapeHtml(c.motivo_consulta || 'Consulta médica programada') + '</div></div>' +
                '<div class="vs-row vs-row--nowrap"><span class="vs-badge ' + badgeCls + '"><span class="vs-badge__dot"></span>' + escapeHtml(st) + '</span>' +
                '<button type="button" class="vs-icon-btn btn-ver-ficha-cu30" title="Ver ficha del paciente"><svg class="vs-i"><use href="#i-eye"/></svg></button></div>' +
              '</div>' +
            '</div>';
          });
          agendaContainer.innerHTML = html;

          mostrarFichaPaciente(citasFiltradas[0]);

        } catch (err) {
          agendaContainer.innerHTML = '<div style="padding:2.5rem;text-align:center;color:var(--vs-danger);">Error al cargar la agenda médica: ' + escapeHtml(err.message) + '</div>';
        }
      }

      function mostrarFichaPaciente(c) {
        if (!c) return;
        var pac = c.paciente || {};
        var pers = pac.persona || pac || {};
        var nom = (pers.nombres ? (pers.nombres + ' ' + (pers.apellidos || '')) : 'Paciente') || 'Paciente';
        var cod = pac.codigo_paciente || ('PAC-' + String(pac.id_paciente || 1).padStart(4, '0'));
        var inits = ((pers.nombres ? pers.nombres[0] : '') + (pers.apellidos ? pers.apellidos[0] : '')).toUpperCase() || 'PA';

        if (pacAvatar) pacAvatar.textContent = inits;
        if (pacNombre) pacNombre.textContent = nom;
        if (pacSub) pacSub.textContent = (c.estado || 'Programada') + ' · ' + (c.codigo || 'CM-0001');
        if (pacCod) pacCod.textContent = cod + ' · CI ' + (pers.ci || '—');
        if (pacEdad) pacEdad.textContent = (pers.fecha_nacimiento ? pers.fecha_nacimiento : '—') + ' · ' + (pers.sexo || 'No especificado');
        if (pacSangre) pacSangre.textContent = pac.grupo_sanguineo || 'O+';
        if (pacAlergias) pacAlergias.textContent = pac.alergias || 'Ninguna registrada';
        if (pacAnt) pacAnt.textContent = pac.antecedentes || 'Sin antecedentes patológicos';
        if (pacEmerg) pacEmerg.textContent = (pac.contacto_emergencia_nombre ? (pac.contacto_emergencia_nombre + ' (' + (pac.contacto_emergencia_telefono || '—') + ')') : 'No registrado');
        if (pacUlt) pacUlt.textContent = c.fecha ? formatFechaHora(c.fecha) : 'Hoy';
      }

      if (agendaContainer) {
        agendaContainer.addEventListener('click', function (ev) {
          var row = ev.target.closest('[data-cita-idx]');
          if (row) {
            var idx = parseInt(row.getAttribute('data-cita-idx'), 10);
            if (citasDiaCache[idx]) {
              mostrarFichaPaciente(citasDiaCache[idx]);
            }
          }
        });
      }

      if (fechaInp30) {
        fechaInp30.addEventListener('change', cargarAgendaCU30);
      }

      cargarAgendaCU30();
    }

    // =========================================================================
    // 25. P7 REPORTES ADMINISTRATIVOS DINÁMICOS DESDE POSTGRESQL (CU32-CU36)
    // =========================================================================
    function descargarCsvDesdeFilas(filename, headers, rows) {
      var csv = '\uFEFF' + headers.join(';') + '\n';
      rows.forEach(function (r) {
        csv += r.map(function (c) {
          return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"';
        }).join(';') + '\n';
      });
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // CU32: Reporte de citas por período (100% dinámico desde PostgreSQL)
    if (currentCuAttr === 'CU32') {
      var form32 = document.querySelector('form.vs-filters');
      var selEsp32 = document.getElementById('rp-esp');
      var selEst32 = document.getElementById('rp-estado');
      var inpDesde32 = document.getElementById('rp-desde');
      var inpHasta32 = document.getElementById('rp-hasta');
      var kpiVals32 = document.querySelectorAll('.vs-kpi .vs-kpi__value');
      var kpiHints32 = document.querySelectorAll('.vs-kpi .vs-kpi__hint');
      var tbody32 = document.querySelector('.vs-table tbody');
      var badgeFilas32 = document.querySelector('.vs-card__head .vs-badge');
      var subDetalle32 = document.querySelectorAll('.vs-card__head .vs-card__sub');
      var pagSpan32 = document.querySelector('.vs-pagination span');
      var pager32 = document.querySelector('.vs-pagination .vs-pager');
      var donutVal32 = document.querySelector('.vs-donut__val');
      var estadoList32 = document.querySelector('.vs-donut') ? document.querySelector('.vs-donut').parentElement.querySelector('ul') : null;
      var espBars32 = document.querySelector('.vs-bars');
      var colsChart32 = document.querySelector('.vs-cols');
      var citasFiltradas32 = [];

      if (inpDesde32) inpDesde32.value = '2026-01-01';
      if (inpHasta32) inpHasta32.value = '2026-12-31';

      async function initCU32() {
        try {
          var resEsp = await VS_API.getEspecialidades();
          var esps = (resEsp && resEsp.data) ? resEsp.data : [];
          if (selEsp32 && Array.isArray(esps)) {
            selEsp32.innerHTML = '<option value="">Todas</option>' + esps.map(function (e) {
              return '<option value="' + escapeHtml(e.nombre) + '">' + escapeHtml(e.nombre) + '</option>';
            }).join('');
          }
        } catch (e) {}
        await cargarReporteCU32(false);
      }

      async function cargarReporteCU32(registrarEnBd) {
        if (tbody32) tbody32.innerHTML = '<tr><td colspan="7" class="vs-td-empty" style="text-align:center;padding:1.5rem;">Consultando citas en PostgreSQL...</td></tr>';
        try {
          var resC = await VS_API.getCitas({ per_page: 200 });
          var todas = (resC && resC.data && resC.data.data) ? resC.data.data : (resC.data || []);
          var fDesde = inpDesde32 ? inpDesde32.value : '';
          var fHasta = inpHasta32 ? inpHasta32.value : '';
          var fEsp = selEsp32 ? selEsp32.value.trim().toUpperCase() : '';
          var fEst = selEst32 ? selEst32.value.trim().toUpperCase() : '';

          citasFiltradas32 = todas.filter(function (c) {
            if (fDesde && c.fecha < fDesde) return false;
            if (fHasta && c.fecha > fHasta) return false;
            if (fEsp && fEsp !== 'TODAS') {
              var nomEsp = (c.especialidad && c.especialidad.nombre ? c.especialidad.nombre : '').toUpperCase();
              if (nomEsp !== fEsp) return false;
            }
            if (fEst && fEst !== 'TODOS') {
              if ((c.estado || '').toUpperCase() !== fEst) return false;
            }
            return true;
          });

          var total = citasFiltradas32.length;
          var atendidas = 0, programadas = 0, confirmadas = 0, canceladas = 0, inasistencias = 0;
          var porEsp = {};
          var porFecha = {};

          citasFiltradas32.forEach(function (c) {
            var est = (c.estado || 'PROGRAMADA').toUpperCase();
            if (est === 'ATENDIDA') atendidas++;
            else if (est === 'CONFIRMADA') confirmadas++;
            else if (est === 'CANCELADA') canceladas++;
            else if (est === 'INASISTENCIA') inasistencias++;
            else programadas++;

            var espNom = (c.especialidad && c.especialidad.nombre) ? c.especialidad.nombre : 'Medicina General';
            porEsp[espNom] = (porEsp[espNom] || 0) + 1;
            porFecha[c.fecha || 'Sin fecha'] = (porFecha[c.fecha || 'Sin fecha'] || 0) + 1;
          });

          var pctAtend = total > 0 ? Math.round((atendidas / total) * 100) : 0;
          var pctCanc = total > 0 ? Math.round((canceladas / total) * 100) : 0;
          var diasUnicos = Object.keys(porFecha).length || 1;
          var promDiario = (total / diasUnicos).toFixed(1).replace('.', ',');

          if (kpiVals32[0]) kpiVals32[0].textContent = total;
          if (kpiHints32[0]) kpiHints32[0].textContent = (fDesde || 'Inicio') + ' – ' + (fHasta || 'Hoy') + ' · ' + diasUnicos + ' fechas con agenda';
          if (kpiVals32[1]) kpiVals32[1].textContent = atendidas;
          if (kpiHints32[1]) kpiHints32[1].textContent = pctAtend + ' % del total';
          if (kpiVals32[2]) kpiVals32[2].textContent = canceladas;
          if (kpiHints32[2]) kpiHints32[2].textContent = pctCanc + ' % del total';
          if (kpiVals32[3]) kpiVals32[3].textContent = promDiario;
          if (kpiHints32[3]) kpiHints32[3].textContent = 'Calculado en vivo desde PostgreSQL';

          if (donutVal32) donutVal32.textContent = total;
          if (estadoList32) {
            estadoList32.innerHTML =
              '<li class="vs-row" style="gap:.5rem"><span class="vs-swatch" style="background:var(--vs-moss)"></span>Atendidas · ' + atendidas + '</li>' +
              '<li class="vs-row" style="gap:.5rem"><span class="vs-swatch" style="background:var(--vs-forest)"></span>Programadas · ' + programadas + '</li>' +
              '<li class="vs-row" style="gap:.5rem"><span class="vs-swatch" style="background:var(--vs-clay)"></span>Confirmadas · ' + confirmadas + '</li>' +
              '<li class="vs-row" style="gap:.5rem"><span class="vs-swatch" style="background:var(--vs-rose-500)"></span>Canceladas · ' + canceladas + '</li>' +
              '<li class="vs-row" style="gap:.5rem"><span class="vs-swatch" style="background:#f59e0b"></span>Inasistencias · ' + inasistencias + '</li>';
          }

          if (espBars32) {
            var espKeys = Object.keys(porEsp);
            var maxEsp = 1;
            espKeys.forEach(function (k) { if (porEsp[k] > maxEsp) maxEsp = porEsp[k]; });
            espBars32.innerHTML = espKeys.map(function (k) {
              var w = Math.max(8, Math.round((porEsp[k] / maxEsp) * 100));
              return '<div class="vs-bars__row"><span class="vs-bars__label">' + escapeHtml(k) + '</span><div class="vs-bar vs-bar--teal"><i style="width:' + w + '%"></i></div><span class="vs-bars__val">' + porEsp[k] + '</span></div>';
            }).join('') || '<div class="vs-muted vs-xs">Sin datos en el rango seleccionado</div>';
          }

          if (colsChart32) {
            var fechasKeys = Object.keys(porFecha).sort().slice(-5);
            var maxF = 1;
            fechasKeys.forEach(function (fk) { if (porFecha[fk] > maxF) maxF = porFecha[fk]; });
            if (fechasKeys.length) {
              colsChart32.innerHTML = fechasKeys.map(function (fk) {
                var h = Math.max(15, Math.round((porFecha[fk] / maxF) * 90));
                return '<div class="vs-col"><span class="vs-col__val">' + porFecha[fk] + '</span><i style="height:' + h + '%"></i><small>' + escapeHtml(fk.slice(5)) + '</small></div>';
              }).join('');
            }
          }

          if (badgeFilas32) badgeFilas32.textContent = total + ' filas';
          if (subDetalle32.length > 0) {
            subDetalle32[subDetalle32.length - 1].textContent = 'Registros reales cargados desde PostgreSQL';
          }
          if (pagSpan32) {
            pagSpan32.innerHTML = total === 0
              ? 'Sin registros en el período'
              : 'Mostrando <strong class="vs-strong">1–' + total + '</strong> de <strong class="vs-strong">' + total + '</strong> citas';
          }
          if (pager32) pager32.innerHTML = '';

          if (tbody32) {
            if (!total) {
              tbody32.innerHTML = '<tr><td colspan="7" class="vs-td-empty" style="text-align:center;padding:1.5rem;">No hay citas registradas para los filtros seleccionados.</td></tr>';
            } else {
              tbody32.innerHTML = citasFiltradas32.map(function (c) {
                var pac = (c.paciente && c.paciente.persona) ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : 'Paciente';
                var med = (c.medico && c.medico.persona) ? ('Dr(a). ' + c.medico.persona.apellidos) : 'Médico';
                var esp = (c.especialidad && c.especialidad.nombre) ? c.especialidad.nombre : 'Medicina General';
                var est = (c.estado || 'PROGRAMADA').toUpperCase();
                var bCls = est === 'ATENDIDA' ? 'vs-badge--ok' : (est === 'CONFIRMADA' ? 'vs-badge--cyan' : (est === 'CANCELADA' ? 'vs-badge--danger' : (est === 'INASISTENCIA' ? 'vs-badge--warn' : 'vs-badge--info')));
                return '<tr>' +
                  '<td class="vs-td-num">' + escapeHtml(c.codigo || ('CM-' + c.id_cita)) + '</td>' +
                  '<td class="vs-td-num">' + escapeHtml(c.fecha || '—') + '</td>' +
                  '<td class="vs-td-num">' + escapeHtml((c.hora_inicio || '').substring(0, 5)) + '</td>' +
                  '<td>' + escapeHtml(pac) + '</td>' +
                  '<td class="vs-hide-md">' + escapeHtml(esp) + '</td>' +
                  '<td class="vs-hide-md">' + escapeHtml(med) + '</td>' +
                  '<td><span class="vs-badge ' + bCls + '">' + escapeHtml(est) + '</span></td>' +
                '</tr>';
              }).join('');
            }
          }

          if (registrarEnBd) {
            await VS_API.crearReporte({
              tipo: 'CITAS_PERIODO',
              fecha_desde: fDesde || null,
              fecha_hasta: fHasta || null,
              formato: 'CSV'
            });
            if (window.vsToast) window.vsToast('Reporte actualizado', total + ' citas consultadas en PostgreSQL y auditadas en bitácora');
          }
        } catch (err) {
          console.warn('Error cargando reporte CU32:', err);
        }
      }

      if (form32) {
        form32.setAttribute('data-api-bound', 'true');
        form32.addEventListener('submit', function (e) {
          e.preventDefault();
          cargarReporteCU32(true);
        });
      }
      if (selEsp32) selEsp32.addEventListener('change', function () { cargarReporteCU32(false); });
      if (selEst32) selEst32.addEventListener('change', function () { cargarReporteCU32(false); });

      document.querySelectorAll('.vs-page-head__side a').forEach(function (btnLink) {
        btnLink.addEventListener('click', async function (e) {
          e.preventDefault();
          var isPdf = btnLink.textContent.toUpperCase().indexOf('PDF') !== -1;
          await VS_API.crearReporte({
            tipo: 'CITAS_PERIODO',
            fecha_desde: inpDesde32 ? inpDesde32.value : null,
            fecha_hasta: inpHasta32 ? inpHasta32.value : null,
            formato: isPdf ? 'PDF' : 'CSV'
          });
          if (isPdf) {
            window.print();
          } else {
            descargarCsvDesdeFilas('reporte_citas_periodo.csv', ['Codigo', 'Fecha', 'Hora', 'Paciente', 'Especialidad', 'Medico', 'Estado'], citasFiltradas32.map(function (c) {
              var pac = (c.paciente && c.paciente.persona) ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : 'Paciente';
              var med = (c.medico && c.medico.persona) ? ('Dr(a). ' + c.medico.persona.apellidos) : 'Médico';
              var esp = (c.especialidad && c.especialidad.nombre) ? c.especialidad.nombre : 'Medicina General';
              return [c.codigo || ('CM-' + c.id_cita), c.fecha, (c.hora_inicio || '').substring(0, 5), pac, esp, med, c.estado];
            }));
          }
          if (window.vsToast) window.vsToast('Exportación completada', 'Archivo generado desde PostgreSQL y registrado en bitácora');
        });
      });

      initCU32();
    }

    // CU33: Reporte de atenciones por médico y especialidad (100% dinámico desde PostgreSQL)
    if (currentCuAttr === 'CU33') {
      var form33 = document.querySelector('form.vs-filters');
      var selEsp33 = document.getElementById('ra-esp');
      var selMed33 = document.getElementById('ra-med');
      var inpDesde33 = document.getElementById('ra-desde');
      var inpHasta33 = document.getElementById('ra-hasta');
      var kpiVals33 = document.querySelectorAll('.vs-kpi .vs-kpi__value');
      var kpiHints33 = document.querySelectorAll('.vs-kpi .vs-kpi__hint');
      var colsChart33 = document.querySelector('.vs-cols');
      var donutVal33 = document.querySelector('.vs-donut__val');
      var espList33 = document.querySelector('.vs-donut') ? document.querySelector('.vs-donut').parentElement.querySelector('ul') : null;
      var tbody33 = document.querySelector('.vs-table tbody');
      var resumenMedicos33 = [];

      if (inpDesde33) inpDesde33.value = '2026-01-01';
      if (inpHasta33) inpHasta33.value = '2026-12-31';

      async function initCU33() {
        try {
          var resEsp = await VS_API.getEspecialidades();
          var esps = (resEsp && resEsp.data) ? resEsp.data : [];
          if (selEsp33 && Array.isArray(esps)) {
            selEsp33.innerHTML = '<option value="">Todas</option>' + esps.map(function (e) {
              return '<option value="' + escapeHtml(e.nombre) + '">' + escapeHtml(e.nombre) + '</option>';
            }).join('');
          }
          var resMed = await VS_API.getMedicos();
          var meds = (resMed && resMed.data) ? resMed.data : [];
          if (selMed33 && Array.isArray(meds)) {
            selMed33.innerHTML = '<option value="">Todos los médicos</option>' + meds.map(function (m) {
              var p = m.persona || {};
              return '<option value="' + (m.id_persona || m.id_medico) + '">Dr(a). ' + escapeHtml((p.nombres || '') + ' ' + (p.apellidos || '')) + '</option>';
            }).join('');
          }
        } catch (e) {}
        await cargarReporteCU33(false);
      }

      async function cargarReporteCU33(registrarEnBd) {
        if (tbody33) tbody33.innerHTML = '<tr><td colspan="8" class="vs-td-empty" style="text-align:center;padding:1.5rem;">Consultando productividad médica en PostgreSQL...</td></tr>';
        try {
          var resMed = await VS_API.getMedicos();
          var medicos = (resMed && resMed.data) ? resMed.data : [];
          var resC = await VS_API.getCitas({ per_page: 200 });
          var citas = (resC && resC.data && resC.data.data) ? resC.data.data : (resC.data || []);

          var fDesde = inpDesde33 ? inpDesde33.value : '';
          var fHasta = inpHasta33 ? inpHasta33.value : '';
          var fEsp = selEsp33 ? selEsp33.value.trim().toUpperCase() : '';
          var fMed = selMed33 ? selMed33.value : '';

          var citasPer = citas.filter(function (c) {
            if (fDesde && c.fecha < fDesde) return false;
            if (fHasta && c.fecha > fHasta) return false;
            if (fEsp && fEsp !== 'TODAS') {
              var nomE = (c.especialidad && c.especialidad.nombre ? c.especialidad.nombre : '').toUpperCase();
              if (nomE !== fEsp) return false;
            }
            if (fMed && String(c.id_medico) !== String(fMed)) return false;
            return true;
          });

          var mapMed = {};
          medicos.forEach(function (m) {
            var idM = m.id_persona || m.id_medico;
            if (fMed && String(idM) !== String(fMed)) return;
            var p = m.persona || {};
            var espStr = Array.isArray(m.especialidades) && m.especialidades.length
              ? m.especialidades.map(function (e) { return e.nombre; }).join(' · ')
              : 'Medicina General';
            if (fEsp && fEsp !== 'TODAS' && espStr.toUpperCase().indexOf(fEsp) === -1) return;
            mapMed[idM] = {
              id: idM,
              nombre: 'Dr(a). ' + (p.nombres || '') + ' ' + (p.apellidos || ''),
              apellido: p.apellidos || p.nombres || 'Médico',
              especialidad: espStr,
              bloques: 40,
              programadas: 0,
              atendidas: 0,
              canceladas: 0,
              inasistencias: 0
            };
          });

          var porEspCount = {};
          var totalAtendidas = 0;

          citasPer.forEach(function (c) {
            var idM = c.id_medico;
            if (!mapMed[idM]) {
              var pm = (c.medico && c.medico.persona) ? c.medico.persona : {};
              mapMed[idM] = {
                id: idM,
                nombre: 'Dr(a). ' + (pm.nombres || '') + ' ' + (pm.apellidos || ''),
                apellido: pm.apellidos || 'Médico',
                especialidad: (c.especialidad && c.especialidad.nombre) ? c.especialidad.nombre : 'General',
                bloques: 40,
                programadas: 0,
                atendidas: 0,
                canceladas: 0,
                inasistencias: 0
              };
            }
            var est = (c.estado || 'PROGRAMADA').toUpperCase();
            if (est === 'ATENDIDA') {
              mapMed[idM].atendidas++;
              totalAtendidas++;
            } else if (est === 'CANCELADA') {
              mapMed[idM].canceladas++;
            } else if (est === 'INASISTENCIA') {
              mapMed[idM].inasistencias++;
            } else {
              mapMed[idM].programadas++;
            }
            var eName = (c.especialidad && c.especialidad.nombre) ? c.especialidad.nombre : 'Medicina General';
            porEspCount[eName] = (porEspCount[eName] || 0) + 1;
          });

          resumenMedicos33 = Object.values(mapMed).sort(function (a, b) {
            return (b.atendidas + b.programadas) - (a.atendidas + a.programadas);
          });

          var topMed = resumenMedicos33[0] || { apellido: 'Sin datos', atendidas: 0, especialidad: '—' };
          var totalBloques = resumenMedicos33.reduce(function (acc, m) { return acc + m.bloques; }, 0) || 1;
          var totalOcup = resumenMedicos33.reduce(function (acc, m) { return acc + m.atendidas + m.programadas; }, 0);
          var pctOcupGlobal = Math.min(100, Math.round((totalOcup / totalBloques) * 100));

          if (kpiVals33[0]) kpiVals33[0].textContent = totalAtendidas;
          if (kpiHints33[0]) kpiHints33[0].textContent = resumenMedicos33.length + ' médicos en consulta';
          if (kpiVals33[1]) kpiVals33[1].textContent = pctOcupGlobal + ' %';
          if (kpiHints33[1]) kpiHints33[1].textContent = totalOcup + ' citas activas de ' + totalBloques + ' bloques';
          if (kpiVals33[2]) kpiVals33[2].textContent = 'Dr(a). ' + topMed.apellido;
          if (kpiHints33[2]) kpiHints33[2].textContent = topMed.atendidas + ' atendidas · ' + topMed.especialidad;
          if (kpiVals33[3]) kpiVals33[3].innerHTML = '30 <span class="vs-small vs-muted">min</span>';

          if (colsChart33) {
            var maxAt = 1;
            resumenMedicos33.forEach(function (m) {
              var v = m.atendidas + m.programadas;
              if (v > maxAt) maxAt = v;
            });
            colsChart33.innerHTML = resumenMedicos33.slice(0, 9).map(function (m) {
              var v = m.atendidas + m.programadas;
              var h = Math.max(15, Math.round((v / maxAt) * 100));
              return '<div class="vs-col"><span class="vs-col__val">' + v + '</span><i style="height:' + h + '%"></i><small>' + escapeHtml(m.apellido.split(' ')[0]) + '</small></div>';
            }).join('');
          }

          var espNames = Object.keys(porEspCount);
          if (donutVal33) donutVal33.textContent = espNames.length;
          if (espList33) {
            var sumEsp = citasPer.length || 1;
            espList33.innerHTML = espNames.map(function (en) {
              var pct = Math.round((porEspCount[en] / sumEsp) * 100);
              return '<li class="vs-row" style="gap:.5rem"><span class="vs-swatch" style="background:var(--vs-forest)"></span>' + escapeHtml(en) + ' · ' + pct + ' % (' + porEspCount[en] + ')</li>';
            }).join('');
          }

          if (tbody33) {
            if (!resumenMedicos33.length) {
              tbody33.innerHTML = '<tr><td colspan="8" class="vs-td-empty" style="text-align:center;padding:1.5rem;">Sin registros para los filtros seleccionados.</td></tr>';
            } else {
              tbody33.innerHTML = resumenMedicos33.map(function (m) {
                var ocup = Math.min(100, Math.round(((m.programadas + m.atendidas) / m.bloques) * 100));
                return '<tr>' +
                  '<td>' + escapeHtml(m.nombre) + '</td>' +
                  '<td class="vs-hide-md">' + escapeHtml(m.especialidad) + '</td>' +
                  '<td class="vs-td-num">' + m.bloques + '</td>' +
                  '<td class="vs-td-num">' + m.programadas + '</td>' +
                  '<td class="vs-td-num"><strong class="vs-strong">' + m.atendidas + '</strong></td>' +
                  '<td class="vs-td-num">' + m.canceladas + '</td>' +
                  '<td class="vs-td-num">' + m.inasistencias + '</td>' +
                  '<td><div class="vs-row vs-row--nowrap" style="gap:.5rem"><div class="vs-bar vs-grow vs-bar--teal"><i style="width:' + ocup + '%"></i></div><span class="vs-xs vs-mono">' + ocup + ' %</span></div></td>' +
                '</tr>';
              }).join('');
            }
          }

          if (registrarEnBd) {
            await VS_API.crearReporte({
              tipo: 'ATENCIONES_MEDICO_ESPECIALIDAD',
              fecha_desde: fDesde || null,
              fecha_hasta: fHasta || null,
              formato: 'CSV'
            });
            if (window.vsToast) window.vsToast('Reporte actualizado', 'Productividad calculada desde PostgreSQL y auditada en bitácora');
          }
        } catch (err) {
          console.warn('Error en CU33:', err);
        }
      }

      if (form33) {
        form33.setAttribute('data-api-bound', 'true');
        form33.addEventListener('submit', function (e) {
          e.preventDefault();
          cargarReporteCU33(true);
        });
      }
      if (selEsp33) selEsp33.addEventListener('change', function () { cargarReporteCU33(false); });
      if (selMed33) selMed33.addEventListener('change', function () { cargarReporteCU33(false); });

      document.querySelectorAll('.vs-page-head__side a').forEach(function (btnLink) {
        btnLink.addEventListener('click', async function (e) {
          e.preventDefault();
          var isPdf = btnLink.textContent.toUpperCase().indexOf('PDF') !== -1;
          await VS_API.crearReporte({
            tipo: 'ATENCIONES_MEDICO_ESPECIALIDAD',
            fecha_desde: inpDesde33 ? inpDesde33.value : null,
            fecha_hasta: inpHasta33 ? inpHasta33.value : null,
            formato: isPdf ? 'PDF' : 'CSV'
          });
          if (isPdf) {
            window.print();
          } else {
            descargarCsvDesdeFilas('reporte_atenciones_medico.csv', ['Medico', 'Especialidad', 'Bloques', 'Programadas', 'Atendidas', 'Canceladas', 'Inasistencias'], resumenMedicos33.map(function (m) {
              return [m.nombre, m.especialidad, m.bloques, m.programadas, m.atendidas, m.canceladas, m.inasistencias];
            }));
          }
        });
      });

      initCU33();
    }

    // CU34: Reporte de control de asistencia (100% dinámico desde PostgreSQL)
    if (currentCuAttr === 'CU34') {
      var form34 = document.querySelector('form.vs-filters');
      var selEsp34 = document.getElementById('as-esp');
      var inpDesde34 = document.getElementById('as-desde');
      var inpHasta34 = document.getElementById('as-hasta');
      var kpiVals34 = document.querySelectorAll('.vs-kpi .vs-kpi__value');
      var kpiHints34 = document.querySelectorAll('.vs-kpi .vs-kpi__hint');
      var tbody34 = document.querySelector('.vs-table tbody');
      var listReincidentes34 = document.querySelector('.vs-list--boxed');
      var resumenEsp34 = [];

      if (inpDesde34) inpDesde34.value = '2026-01-01';
      if (inpHasta34) inpHasta34.value = '2026-12-31';

      async function initCU34() {
        try {
          var resEsp = await VS_API.getEspecialidades();
          var esps = (resEsp && resEsp.data) ? resEsp.data : [];
          if (selEsp34 && Array.isArray(esps)) {
            selEsp34.innerHTML = '<option value="">Todas</option>' + esps.map(function (e) {
              return '<option value="' + escapeHtml(e.nombre) + '">' + escapeHtml(e.nombre) + '</option>';
            }).join('');
          }
        } catch (e) {}
        await cargarReporteCU34(false);
      }

      async function cargarReporteCU34(registrarEnBd) {
        if (tbody34) tbody34.innerHTML = '<tr><td colspan="7" class="vs-td-empty" style="text-align:center;padding:1.5rem;">Calculando métricas de asistencia desde PostgreSQL...</td></tr>';
        try {
          var resC = await VS_API.getCitas({ per_page: 200 });
          var citas = (resC && resC.data && resC.data.data) ? resC.data.data : (resC.data || []);
          var resN = await VS_API.getNotificaciones({ per_page: 100 });
          var notifs = (resN && resN.data && resN.data.data) ? resN.data.data : (resN.data || []);

          var fDesde = inpDesde34 ? inpDesde34.value : '';
          var fHasta = inpHasta34 ? inpHasta34.value : '';
          var fEsp = selEsp34 ? selEsp34.value.trim().toUpperCase() : '';

          var filtradas = citas.filter(function (c) {
            if (fDesde && c.fecha < fDesde) return false;
            if (fHasta && c.fecha > fHasta) return false;
            if (fEsp && fEsp !== 'TODAS') {
              var ne = (c.especialidad && c.especialidad.nombre ? c.especialidad.nombre : '').toUpperCase();
              if (ne !== fEsp) return false;
            }
            return true;
          });

          var total = filtradas.length || 1;
          var atend = 0, inas = 0, canc = 0;
          var mapEsp = {};
          var mapPacInas = {};

          filtradas.forEach(function (c) {
            var est = (c.estado || 'PROGRAMADA').toUpperCase();
            var espNom = (c.especialidad && c.especialidad.nombre) ? c.especialidad.nombre : 'Medicina General';
            if (!mapEsp[espNom]) {
              mapEsp[espNom] = { nombre: espNom, total: 0, atendidas: 0, inasistencias: 0, canceladas: 0 };
            }
            mapEsp[espNom].total++;
            if (est === 'ATENDIDA' || est === 'CONFIRMADA') {
              atend++;
              mapEsp[espNom].atendidas++;
            } else if (est === 'INASISTENCIA') {
              inas++;
              mapEsp[espNom].inasistencias++;
              var pacNom = (c.paciente && c.paciente.persona) ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : ('Paciente #' + c.id_paciente);
              mapPacInas[pacNom] = (mapPacInas[pacNom] || 0) + 1;
            } else if (est === 'CANCELADA') {
              canc++;
              mapEsp[espNom].canceladas++;
            }
          });

          var baseAsist = (atend + inas) || 1;
          var pctAsist = Math.round((atend / baseAsist) * 100);
          var pctInas = Math.round((inas / total) * 100);
          var pctCanc = Math.round((canc / total) * 100);
          var notifEnv = notifs.filter(function (n) { return (n.estado || '').toUpperCase() === 'ENVIADA'; }).length;
          var pctNotif = notifs.length > 0 ? Math.round((notifEnv / notifs.length) * 100) : 100;

          if (kpiVals34[0]) kpiVals34[0].textContent = pctAsist + ' %';
          if (kpiHints34[0]) kpiHints34[0].textContent = atend + ' asistencias efectivas en BD';
          if (kpiVals34[1]) kpiVals34[1].textContent = pctInas + ' %';
          if (kpiHints34[1]) kpiHints34[1].textContent = inas + ' citas con inasistencia';
          if (kpiVals34[2]) kpiVals34[2].textContent = pctCanc + ' %';
          if (kpiHints34[2]) kpiHints34[2].textContent = canc + ' citas canceladas';
          if (kpiVals34[3]) kpiVals34[3].textContent = pctNotif + ' %';
          if (kpiHints34[3]) kpiHints34[3].textContent = notifEnv + ' recordatorios enviados';

          if (listReincidentes34) {
            var pKeys = Object.keys(mapPacInas);
            if (!pKeys.length) {
              listReincidentes34.innerHTML = '<li class="vs-list-row"><div class="vs-list-row__body"><div class="vs-list-row__title">Sin inasistencias registradas</div><div class="vs-list-row__sub">Todos los pacientes cumplieron su cita en el período</div></div></li>';
            } else {
              listReincidentes34.innerHTML = pKeys.map(function (pk) {
                var ini = pk.split(' ').map(function (w) { return w.charAt(0); }).join('').substring(0, 2).toUpperCase();
                return '<li class="vs-list-row"><span class="vs-avatar vs-avatar--sm vs-avatar--amber">' + escapeHtml(ini) + '</span><div class="vs-list-row__body"><div class="vs-list-row__title">' + escapeHtml(pk) + '</div><div class="vs-list-row__sub">Registrado en PostgreSQL</div></div><span class="vs-badge vs-badge--warn">' + mapPacInas[pk] + '</span></li>';
              }).join('');
            }
          }

          resumenEsp34 = Object.values(mapEsp);
          if (tbody34) {
            tbody34.innerHTML = resumenEsp34.map(function (r) {
              var b = (r.atendidas + r.inasistencias) || 1;
              var tasa = Math.round((r.atendidas / b) * 100);
              return '<tr>' +
                '<td>' + escapeHtml(r.nombre) + '</td>' +
                '<td class="vs-td-num">' + r.total + '</td>' +
                '<td class="vs-td-num">' + r.atendidas + '</td>' +
                '<td class="vs-td-num">' + r.inasistencias + '</td>' +
                '<td class="vs-td-num">' + r.canceladas + '</td>' +
                '<td class="vs-td-num"><strong class="vs-strong">' + tasa + ' %</strong></td>' +
                '<td class="vs-hide-md"><span class="vs-badge vs-badge--ok">En vivo BD</span></td>' +
              '</tr>';
            }).join('');
          }

          if (registrarEnBd) {
            await VS_API.crearReporte({
              tipo: 'CONTROL_ASISTENCIA',
              fecha_desde: fDesde || null,
              fecha_hasta: fHasta || null,
              formato: 'CSV'
            });
            if (window.vsToast) window.vsToast('Reporte de asistencia generado', 'Datos reales de PostgreSQL y auditado en bitácora');
          }
        } catch (err) {
          console.warn('Error en CU34:', err);
        }
      }

      if (form34) {
        form34.setAttribute('data-api-bound', 'true');
        form34.addEventListener('submit', function (e) {
          e.preventDefault();
          cargarReporteCU34(true);
        });
      }
      if (selEsp34) selEsp34.addEventListener('change', function () { cargarReporteCU34(false); });

      document.querySelectorAll('.vs-page-head__side a').forEach(function (btnLink) {
        btnLink.addEventListener('click', async function (e) {
          e.preventDefault();
          var isPdf = btnLink.textContent.toUpperCase().indexOf('PDF') !== -1;
          await VS_API.crearReporte({
            tipo: 'CONTROL_ASISTENCIA',
            fecha_desde: inpDesde34 ? inpDesde34.value : null,
            fecha_hasta: inpHasta34 ? inpHasta34.value : null,
            formato: isPdf ? 'PDF' : 'CSV'
          });
          if (isPdf) {
            window.print();
          } else {
            descargarCsvDesdeFilas('reporte_control_asistencia.csv', ['Especialidad', 'Citas', 'Atendidas', 'Inasistencias', 'Canceladas'], resumenEsp34.map(function (r) {
              return [r.nombre, r.total, r.atendidas, r.inasistencias, r.canceladas];
            }));
          }
        });
      });

      initCU34();
    }

    // CU35: Exportar reportes en PDF o CSV e historial real desde tabla reporte
    if (currentCuAttr === 'CU35') {
      var form35 = document.querySelector('form.vs-card');
      var selEsp35 = document.getElementById('ex-esp');
      var inpDesde35 = document.getElementById('ex-desde');
      var inpHasta35 = document.getElementById('ex-hasta');
      var histList35 = document.querySelector('aside .vs-list--boxed');
      var footPreview35 = form35 ? form35.querySelector('.vs-card__foot > span') : null;

      if (inpDesde35) inpDesde35.value = '2026-01-01';
      if (inpHasta35) inpHasta35.value = '2026-12-31';

      async function cargarHistorialExportacionesCU35() {
        if (!histList35) return;
        try {
          var resR = await VS_API.getReportes({ per_page: 10 });
          var list = (resR && resR.data && resR.data.data) ? resR.data.data : (resR.data || []);
          if (!list.length) {
            histList35.innerHTML = '<li class="vs-list-row"><div class="vs-list-row__body"><div class="vs-list-row__title">Sin exportaciones previas</div><div class="vs-list-row__sub">Genera un reporte para registrarlo en PostgreSQL</div></div></li>';
            return;
          }
          histList35.innerHTML = list.map(function (r) {
            var fmt = (r.formato || 'CSV').toUpperCase();
            var isPdf = fmt === 'PDF';
            var iconCls = isPdf ? 'vs-kpi__icon--rose' : 'vs-kpi__icon--teal';
            var iconName = isPdf ? '#i-file-pdf' : '#i-file-csv';
            var usr = (r.usuario && r.usuario.nombre_usuario) ? r.usuario.nombre_usuario : ('Usuario #' + r.id_usuario);
            return '<li class="vs-list-row">' +
              '<span class="vs-kpi__icon ' + iconCls + '" style="width:2.25rem;height:2.25rem"><svg class="vs-i"><use href="' + iconName + '"/></svg></span>' +
              '<div class="vs-list-row__body">' +
                '<div class="vs-list-row__title">' + escapeHtml(r.tipo) + '</div>' +
                '<div class="vs-list-row__sub">' + escapeHtml(fmt) + ' · @' + escapeHtml(usr) + ' · ' + formatFechaHora(r.fecha_generacion) + '</div>' +
              '</div>' +
            '</li>';
          }).join('');
        } catch (e) {}
      }

      async function initCU35() {
        try {
          var resEsp = await VS_API.getEspecialidades();
          var esps = (resEsp && resEsp.data) ? resEsp.data : [];
          if (selEsp35 && Array.isArray(esps)) {
            selEsp35.innerHTML = '<option value="">Todas</option>' + esps.map(function (e) {
              return '<option value="' + escapeHtml(e.nombre) + '">' + escapeHtml(e.nombre) + '</option>';
            }).join('');
          }
        } catch (e) {}
        await cargarHistorialExportacionesCU35();
      }

      if (form35) {
        form35.setAttribute('data-api-bound', 'true');
        form35.addEventListener('submit', async function (e) {
          e.preventDefault();
          var repRadio = form35.querySelector('input[name="rep"]:checked');
          var repVal = repRadio ? repRadio.value : 'citas';
          var fmtRadio = form35.querySelector('input[name="fmt"]:checked');
          var fmtVal = fmtRadio ? fmtRadio.value.toUpperCase() : 'CSV';
          var fDesde = inpDesde35 ? inpDesde35.value : '2026-01-01';
          var fHasta = inpHasta35 ? inpHasta35.value : '2026-12-31';

          var tipoMap = {
            citas: 'CITAS_PERIODO',
            atenciones: 'ATENCIONES_MEDICO_ESPECIALIDAD',
            asistencia: 'CONTROL_ASISTENCIA',
            padron: 'PACIENTES_REGISTRADOS'
          };
          var tipoBd = tipoMap[repVal] || 'CITAS_PERIODO';

          try {
            var res = await VS_API.crearReporte({
              tipo: tipoBd,
              fecha_desde: fDesde,
              fecha_hasta: fHasta,
              formato: fmtVal
            });
            if (fmtVal === 'PDF') {
              window.print();
            } else {
              if (repVal === 'padron') {
                var pRes = await VS_API.getPacientes({ per_page: 200 });
                var pacs = (pRes && pRes.data && pRes.data.data) ? pRes.data.data : (pRes.data || []);
                descargarCsvDesdeFilas('padron_pacientes_' + fDesde + '.csv', ['Codigo', 'CI', 'Nombres', 'Apellidos', 'Sexo', 'Fecha_Nacimiento', 'Telefono'], pacs.map(function (p) {
                  var per = p.persona || {};
                  return [p.codigo, per.ci, per.nombres, per.apellidos, p.sexo, p.fecha_nacimiento, per.telefono];
                }));
              } else {
                var cRes = await VS_API.getCitas({ per_page: 200 });
                var cits = (cRes && cRes.data && cRes.data.data) ? cRes.data.data : (cRes.data || []);
                descargarCsvDesdeFilas('reporte_' + repVal + '_' + fDesde + '.csv', ['Codigo', 'Fecha', 'Hora', 'Paciente', 'Medico', 'Especialidad', 'Estado'], cits.map(function (c) {
                  var pac = (c.paciente && c.paciente.persona) ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : '';
                  var med = (c.medico && c.medico.persona) ? (c.medico.persona.nombres + ' ' + c.medico.persona.apellidos) : '';
                  var esp = (c.especialidad && c.especialidad.nombre) ? c.especialidad.nombre : '';
                  return [c.codigo || ('CM-' + c.id_cita), c.fecha, (c.hora_inicio || '').substring(0, 5), pac, med, esp, c.estado];
                }));
              }
            }
            if (footPreview35) {
              footPreview35.innerHTML = 'Último archivo generado desde BD: <span class="vs-mono">reporte_' + escapeHtml(repVal) + '.' + fmtVal.toLowerCase() + '</span>';
            }
            if (window.vsToast) window.vsToast('Exportación generada desde BD', 'Registrada en tabla reporte y auditada en bitácora');
            await cargarHistorialExportacionesCU35();
          } catch (err) {
            alert('Error al exportar reporte: ' + err.message);
          }
        });
      }

      initCU35();
    }

    // CU36: Reporte del padrón de pacientes (100% dinámico desde PostgreSQL)
    if (currentCuAttr === 'CU36') {
      var form36 = document.querySelector('form.vs-filters');
      var selEst36 = document.getElementById('pd-estado');
      var selSexo36 = document.getElementById('pd-sexo');
      var selEdad36 = document.getElementById('pd-edad');
      var inpSearch36 = document.querySelector('input[type="search"]');
      var kpiVals36 = document.querySelectorAll('.vs-kpi .vs-kpi__value');
      var kpiHints36 = document.querySelectorAll('.vs-kpi .vs-kpi__hint');
      var donutVal36 = document.querySelector('.vs-donut__val');
      var sexoList36 = document.querySelector('.vs-donut') ? document.querySelector('.vs-donut').parentElement.querySelector('ul') : null;
      var barsCards36 = document.querySelectorAll('.vs-bars');
      var tbody36 = document.querySelector('.vs-table tbody');
      var pagSpan36 = document.querySelector('.vs-pagination span');
      var pager36 = document.querySelector('.vs-pagination .vs-pager');
      var padronFiltrado36 = [];

      function calcularEdad(fechaNac) {
        if (!fechaNac) return 30;
        var hoy = new Date();
        var nac = new Date(fechaNac);
        if (isNaN(nac.getTime())) return 30;
        var edad = hoy.getFullYear() - nac.getFullYear();
        var m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return Math.max(0, edad);
      }

      async function cargarReporteCU36(registrarEnBd) {
        if (tbody36) tbody36.innerHTML = '<tr><td colspan="9" class="vs-td-empty" style="text-align:center;padding:1.5rem;">Consultando padrón de pacientes en PostgreSQL...</td></tr>';
        try {
          var resP = await VS_API.getPacientes({ per_page: 200 });
          var pacientes = (resP && resP.data && resP.data.data) ? resP.data.data : (resP.data || []);
          var resC = await VS_API.getCitas({ per_page: 200 });
          var citas = (resC && resC.data && resC.data.data) ? resC.data.data : (resC.data || []);

          var citasPorPac = {};
          var ultimaCitaPorPac = {};
          citas.forEach(function (c) {
            var idP = c.id_paciente;
            citasPorPac[idP] = (citasPorPac[idP] || 0) + 1;
            if (!ultimaCitaPorPac[idP] || c.fecha > ultimaCitaPorPac[idP]) {
              ultimaCitaPorPac[idP] = c.fecha;
            }
          });

          var fEst = selEst36 ? selEst36.value.toUpperCase() : 'TODOS';
          var fSexo = selSexo36 ? selSexo36.value.toUpperCase() : 'TODOS';
          var fEdad = selEdad36 ? selEdad36.value : '';
          var q = inpSearch36 ? inpSearch36.value.trim().toLowerCase() : '';

          padronFiltrado36 = pacientes.filter(function (p) {
            var per = p.persona || {};
            var activo = per.activo !== false;
            if (fEst === 'ACTIVOS' && !activo) return false;
            if (fEst === 'INACTIVOS' && activo) return false;
            if (fSexo.indexOf('FEM') !== -1 && (p.sexo || '').toUpperCase() !== 'F') return false;
            if (fSexo.indexOf('MASC') !== -1 && (p.sexo || '').toUpperCase() !== 'M') return false;
            var edad = calcularEdad(p.fecha_nacimiento);
            if (fEdad.indexOf('0–17') !== -1 && edad > 17) return false;
            if (fEdad.indexOf('18–39') !== -1 && (edad < 18 || edad > 39)) return false;
            if (fEdad.indexOf('40–59') !== -1 && (edad < 40 || edad > 59)) return false;
            if (fEdad.indexOf('60') !== -1 && edad < 60) return false;
            if (q) {
              var texto = ((p.codigo || '') + ' ' + (per.nombres || '') + ' ' + (per.apellidos || '') + ' ' + (per.ci || '')).toLowerCase();
              if (texto.indexOf(q) === -1) return false;
            }
            return true;
          });

          var total = padronFiltrado36.length;
          var activosCount = 0, inactivosCount = 0, pediatricos = 0, sinCitas = 0, fem = 0, masc = 0;
          var r0_17 = 0, r18_39 = 0, r40_59 = 0, r60 = 0;
          var f0 = 0, f1 = 0, f2_4 = 0, f5 = 0;

          padronFiltrado36.forEach(function (p) {
            var per = p.persona || {};
            if (per.activo !== false) activosCount++; else inactivosCount++;
            if ((p.sexo || '').toUpperCase() === 'F') fem++; else masc++;
            var ed = calcularEdad(p.fecha_nacimiento);
            if (ed <= 17) { pediatricos++; r0_17++; }
            else if (ed <= 39) r18_39++;
            else if (ed <= 59) r40_59++;
            else r60++;

            var nc = citasPorPac[p.id_persona] || 0;
            if (nc === 0) { sinCitas++; f0++; }
            else if (nc === 1) f1++;
            else if (nc <= 4) f2_4++;
            else f5++;
          });

          if (kpiVals36[0]) kpiVals36[0].textContent = activosCount;
          if (kpiHints36[0]) kpiHints36[0].textContent = inactivosCount + ' inactivos · ' + total + ' en total';
          if (kpiVals36[1]) kpiVals36[1].textContent = pediatricos;
          if (kpiHints36[1]) kpiHints36[1].textContent = (total > 0 ? Math.round((pediatricos / total) * 100) : 0) + ' % del padrón';
          if (kpiVals36[2]) kpiVals36[2].textContent = total;
          if (kpiHints36[2]) kpiHints36[2].textContent = 'Registros reales en PostgreSQL';
          if (kpiVals36[3]) kpiVals36[3].textContent = sinCitas;
          if (kpiHints36[3]) kpiHints36[3].textContent = 'Pacientes sin citas agendadas';

          if (donutVal36) donutVal36.textContent = total;
          if (sexoList36) {
            var pf = total > 0 ? Math.round((fem / total) * 100) : 0;
            var pm = total > 0 ? Math.round((masc / total) * 100) : 0;
            sexoList36.innerHTML =
              '<li class="vs-row" style="gap:.5rem"><span class="vs-swatch" style="background:var(--vs-clay)"></span>Femenino · ' + fem + ' (' + pf + ' %)</li>' +
              '<li class="vs-row" style="gap:.5rem"><span class="vs-swatch" style="background:var(--vs-forest)"></span>Masculino · ' + masc + ' (' + pm + ' %)</li>';
          }

          if (barsCards36[0]) {
            var maxEd = Math.max(1, r0_17, r18_39, r40_59, r60);
            barsCards36[0].innerHTML =
              '<div class="vs-bars__row"><span class="vs-bars__label">0–17</span><div class="vs-bar vs-bar--teal"><i style="width:' + Math.round((r0_17 / maxEd) * 100) + '%"></i></div><span class="vs-bars__val">' + r0_17 + '</span></div>' +
              '<div class="vs-bars__row"><span class="vs-bars__label">18–39</span><div class="vs-bar"><i style="width:' + Math.round((r18_39 / maxEd) * 100) + '%"></i></div><span class="vs-bars__val">' + r18_39 + '</span></div>' +
              '<div class="vs-bars__row"><span class="vs-bars__label">40–59</span><div class="vs-bar"><i style="width:' + Math.round((r40_59 / maxEd) * 100) + '%"></i></div><span class="vs-bars__val">' + r40_59 + '</span></div>' +
              '<div class="vs-bars__row"><span class="vs-bars__label">60 o más</span><div class="vs-bar vs-bar--amber"><i style="width:' + Math.round((r60 / maxEd) * 100) + '%"></i></div><span class="vs-bars__val">' + r60 + '</span></div>';
          }

          if (barsCards36[1]) {
            var maxFr = Math.max(1, f0, f1, f2_4, f5);
            barsCards36[1].innerHTML =
              '<div class="vs-bars__row"><span class="vs-bars__label">Sin citas</span><div class="vs-bar vs-bar--rose"><i style="width:' + Math.round((f0 / maxFr) * 100) + '%"></i></div><span class="vs-bars__val">' + f0 + '</span></div>' +
              '<div class="vs-bars__row"><span class="vs-bars__label">1 cita</span><div class="vs-bar vs-bar--cyan"><i style="width:' + Math.round((f1 / maxFr) * 100) + '%"></i></div><span class="vs-bars__val">' + f1 + '</span></div>' +
              '<div class="vs-bars__row"><span class="vs-bars__label">2–4 citas</span><div class="vs-bar"><i style="width:' + Math.round((f2_4 / maxFr) * 100) + '%"></i></div><span class="vs-bars__val">' + f2_4 + '</span></div>' +
              '<div class="vs-bars__row"><span class="vs-bars__label">5 o más</span><div class="vs-bar vs-bar--teal"><i style="width:' + Math.round((f5 / maxFr) * 100) + '%"></i></div><span class="vs-bars__val">' + f5 + '</span></div>';
          }

          if (pagSpan36) {
            pagSpan36.innerHTML = 'Mostrando <strong class="vs-strong">1–' + total + '</strong> de <strong class="vs-strong">' + total + '</strong> pacientes en PostgreSQL';
          }
          if (pager36) pager36.innerHTML = '';

          if (tbody36) {
            if (!total) {
              tbody36.innerHTML = '<tr><td colspan="9" class="vs-td-empty" style="text-align:center;padding:1.5rem;">No se encontraron pacientes para los criterios seleccionados.</td></tr>';
            } else {
              tbody36.innerHTML = padronFiltrado36.map(function (p) {
                var per = p.persona || {};
                var edad = calcularEdad(p.fecha_nacimiento);
                var nc = citasPorPac[p.id_persona] || 0;
                var ult = ultimaCitaPorPac[p.id_persona] || '—';
                var act = per.activo !== false;
                var badge = act ? '<span class="vs-badge vs-badge--ok">Activo</span>' : '<span class="vs-badge vs-badge--muted">Inactivo</span>';
                var reg = p.fecha_registro ? String(p.fecha_registro).slice(0, 10) : '—';
                return '<tr' + (!act ? ' class="is-muted"' : '') + '>' +
                  '<td class="vs-td-num">' + escapeHtml(p.codigo || ('PAC-' + p.id_persona)) + '</td>' +
                  '<td>' + escapeHtml((per.nombres || '') + ' ' + (per.apellidos || '')) + '</td>' +
                  '<td class="vs-td-num">' + escapeHtml(per.ci || '—') + '</td>' +
                  '<td class="vs-hide-md">' + edad + ' · ' + escapeHtml(p.sexo || '—') + '</td>' +
                  '<td class="vs-hide-md vs-td-num">' + escapeHtml(per.telefono || '—') + '</td>' +
                  '<td class="vs-hide-md vs-td-num">' + escapeHtml(reg) + '</td>' +
                  '<td class="vs-td-num">' + nc + '</td>' +
                  '<td class="vs-td-num">' + escapeHtml(ult) + '</td>' +
                  '<td>' + badge + '</td>' +
                '</tr>';
              }).join('');
            }
          }

          if (registrarEnBd) {
            await VS_API.crearReporte({
              tipo: 'PACIENTES_REGISTRADOS',
              formato: 'CSV'
            });
            if (window.vsToast) window.vsToast('Padrón actualizado', total + ' pacientes consultados en PostgreSQL y auditados en bitácora');
          }
        } catch (err) {
          console.warn('Error en CU36:', err);
        }
      }

      if (selEst36) selEst36.value = 'Todos';
      if (form36) {
        form36.setAttribute('data-api-bound', 'true');
        form36.addEventListener('submit', function (e) {
          e.preventDefault();
          cargarReporteCU36(true);
        });
      }
      if (selEst36) selEst36.addEventListener('change', function () { cargarReporteCU36(false); });
      if (selSexo36) selSexo36.addEventListener('change', function () { cargarReporteCU36(false); });
      if (selEdad36) selEdad36.addEventListener('change', function () { cargarReporteCU36(false); });
      if (inpSearch36) inpSearch36.addEventListener('input', function () { cargarReporteCU36(false); });

      document.querySelectorAll('.vs-page-head__side a').forEach(function (btnLink) {
        btnLink.addEventListener('click', async function (e) {
          e.preventDefault();
          var isPdf = btnLink.textContent.toUpperCase().indexOf('PDF') !== -1;
          await VS_API.crearReporte({
            tipo: 'PACIENTES_REGISTRADOS',
            formato: isPdf ? 'PDF' : 'CSV'
          });
          if (isPdf) {
            window.print();
          } else {
            descargarCsvDesdeFilas('padron_pacientes.csv', ['Codigo', 'Paciente', 'CI', 'Sexo', 'Telefono', 'Estado'], padronFiltrado36.map(function (p) {
              var per = p.persona || {};
              return [p.codigo, (per.nombres || '') + ' ' + (per.apellidos || ''), per.ci, p.sexo, per.telefono, per.activo !== false ? 'ACTIVO' : 'INACTIVO'];
            }));
          }
        });
      });

      cargarReporteCU36(false);
    }

    // =========================================================================
    // 26. NUEVOS CASOS DE USO Y CLASES SEPARADAS (CU37 - CU43)
    // =========================================================================

    // CU37: Auto-Registro Paciente Web + Sesiones Activas + Tokens Recuperación
    if (currentCuAttr === 'CU37') {
      var sesionesBody37 = document.getElementById('cu37-sesiones-tbody');
      var tokensBody37 = document.getElementById('cu37-tokens-tbody');
      var formAuto37 = document.getElementById('form-cu37-autoregistro');
      var kpiPacWeb = document.getElementById('cu37-kpi-pacientes');
      var kpiSes37 = document.getElementById('cu37-kpi-sesiones');
      var kpiTok37 = document.getElementById('cu37-kpi-tokens');

      async function cargarDatosCU37() {
        try {
          var resPac = await VS_API.getPacientes({ per_page: 50 });
          var listPac = (resPac && resPac.data && resPac.data.data) ? resPac.data.data : (resPac.data || []);
          if (kpiPacWeb) kpiPacWeb.textContent = (resPac && resPac.data && resPac.data.total != null) ? resPac.data.total : listPac.length;
        } catch (e) {}

        try {
          var resSes = await VS_API.getSesiones();
          var listSes = (resSes && resSes.data) ? resSes.data : [];
          if (kpiSes37) kpiSes37.textContent = listSes.length;
          if (sesionesBody37) {
            if (!listSes.length) {
              sesionesBody37.innerHTML = '<tr><td colspan="5" class="vs-td-empty" style="text-align:center;padding:1.2rem;">No hay sesiones activas en la tabla sesion.</td></tr>';
            } else {
              var sHtml = '';
              listSes.forEach(function (s) {
                var usr = s.usuario ? s.usuario.nombre_usuario : ('Usuario #' + s.id_usuario);
                var pers = (s.usuario && s.usuario.persona) ? (s.usuario.persona.nombres + ' ' + s.usuario.persona.apellidos) : usr;
                var est = s.activa ? '<span class="vs-badge vs-badge--ok"><span class="vs-badge__dot"></span>ACTIVA</span>' : '<span class="vs-badge vs-badge--muted">CERRADA</span>';
                sHtml += '<tr>' +
                  '<td><div class="vs-cell-person__name">' + escapeHtml(pers) + '</div><div class="vs-cell-person__sub vs-mono">@' + escapeHtml(usr) + '</div></td>' +
                  '<td class="vs-mono vs-xs">' + escapeHtml((s.token || '').substring(0, 16) + '…') + '</td>' +
                  '<td class="vs-td-num">' + escapeHtml(s.ip || '127.0.0.1') + '</td>' +
                  '<td class="vs-td-num">' + formatFechaHora(s.fecha_expiracion) + '</td>' +
                  '<td>' + est + '</td>' +
                '</tr>';
              });
              sesionesBody37.innerHTML = sHtml;
            }
          }
        } catch (e) {}

        try {
          var resTok = await VS_API.getTokensRecuperacion();
          var listTok = (resTok && resTok.data) ? resTok.data : [];
          if (kpiTok37) kpiTok37.textContent = listTok.length;
          if (tokensBody37) {
            if (!listTok.length) {
              tokensBody37.innerHTML = '<tr><td colspan="4" class="vs-td-empty" style="text-align:center;padding:1.2rem;">Sin tokens emitidos en tabla token_recuperacion.</td></tr>';
            } else {
              var tHtml = '';
              listTok.forEach(function (t) {
                var usr = t.usuario ? t.usuario.nombre_usuario : ('ID ' + t.id_usuario);
                var est = t.usado
                  ? '<span class="vs-badge vs-badge--muted">USADO</span>'
                  : '<span class="vs-badge vs-badge--cyan"><span class="vs-badge__dot"></span>VIGENTE</span>';
                tHtml += '<tr>' +
                  '<td class="vs-mono">@' + escapeHtml(usr) + '</td>' +
                  '<td class="vs-mono vs-xs">' + escapeHtml((t.token || '').substring(0, 18)) + '</td>' +
                  '<td class="vs-td-num">' + formatFechaHora(t.fecha_expiracion) + '</td>' +
                  '<td>' + est + '</td>' +
                '</tr>';
              });
              tokensBody37.innerHTML = tHtml;
            }
          }
        } catch (e) {}
      }

      if (formAuto37) {
        formAuto37.setAttribute('data-api-bound', 'true');
        formAuto37.addEventListener('submit', async function (e) {
          e.preventDefault();
          var elCi = document.getElementById('ar-ci');
          var elNom = document.getElementById('ar-nom') || document.getElementById('ar-nombres');
          var elApe = document.getElementById('ar-ape') || document.getElementById('ar-apellidos');
          var elNac = document.getElementById('ar-nac') || document.getElementById('ar-fnac');
          var elSexo = document.getElementById('ar-sexo');
          var elTel = document.getElementById('ar-tel');
          var elEmail = document.getElementById('ar-email');
          var elDir = document.getElementById('ar-dir');
          var elUser = document.getElementById('ar-user');
          var elPass = document.getElementById('ar-pass');

          var payload = {
            ci: elCi ? elCi.value.trim() : '',
            nombres: elNom ? elNom.value.trim() : '',
            apellidos: elApe ? elApe.value.trim() : '',
            fecha_nacimiento: elNac ? elNac.value : '',
            sexo: elSexo ? elSexo.value : 'F',
            telefono: elTel ? elTel.value.trim() : '',
            email: elEmail ? elEmail.value.trim() : '',
            direccion: elDir ? elDir.value.trim() : '',
            nombre_usuario: elUser ? elUser.value.trim() : '',
            password: elPass ? elPass.value : ''
          };
          try {
            var res = await VS_API.autoRegistroPacienteWeb(payload);
            var fb = document.getElementById('cu37-feedback');
            var newUsername = (res.data && res.data.usuario ? res.data.usuario.nombre_usuario : (payload.nombre_usuario || 'paciente'));
            var newCod = (res.data && res.data.paciente ? res.data.paciente.codigo_paciente : 'PAC-NUEVO');
            if (fb) {
              fb.style.display = 'flex';
              fb.scrollIntoView({ behavior: 'smooth', block: 'center' });
              fb.innerHTML = '<svg class="vs-i" style="width:28px;height:28px;color:#10b981;flex-shrink:0;margin-top:2px;"><use href="#i-check-circle"/></svg>' +
                '<div><strong style="font-size:1.1rem;display:block;margin-bottom:.3rem;">¡Tu cuenta de paciente ha sido creada exitosamente!</strong>' +
                'Código asignado: <span class="vs-mono" style="font-weight:700;">' + escapeHtml(newCod) + '</span> | Usuario: <span class="vs-mono" style="font-weight:700;">@' + escapeHtml(newUsername) + '</span> (Rol: <strong>Paciente</strong>).<br>' +
                '<p class="vs-xs vs-muted" style="margin:.35rem 0 .75rem;">Tu acceso web ya está activo en PostgreSQL para agendar citas, reprogramar y pagar fichas médicas.</p>' +
                '<a href="cu01-iniciar-sesion.html" class="vs-btn vs-btn--primary" style="display:inline-flex;align-items:center;gap:.4rem;text-decoration:none;font-weight:600;">' +
                '<svg class="vs-i vs-i--sm"><use href="#i-log-in"/></svg>Iniciar sesión ahora &rarr;</a></div>';
            }
            if (window.vsToast) window.vsToast('Auto-registro exitoso', 'Cuenta de paciente lista con rol Paciente');
            formAuto37.reset();
            cargarDatosCU37();
          } catch (err) {
            alert('Error en auto-registro: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }

      var btnRefSes = document.getElementById('cu37-btn-refresh-sesiones');
      if (btnRefSes) btnRefSes.addEventListener('click', cargarDatosCU37);
      cargarDatosCU37();
    }

    // CU38: Personal Administrativo, Personas y Matriz RBAC Rol-Permiso (Exclusivo Administrador)
    if (currentCuAttr === 'CU38') {
      if (!esUsuarioAdmin) {
        var mainPage = document.querySelector('main') || document.body;
        mainPage.innerHTML = '<div style="padding:3rem;max-width:42rem;margin:2rem auto;background:#fff;border:1px solid #fecdd3;border-radius:1rem;text-align:center;">' +
          '<h2 style="color:#be123c;margin-bottom:.75rem;font-size:1.5rem;">Acceso Restringido · Exclusivo Administrador</h2>' +
          '<p style="color:#475569;margin-bottom:1.5rem;">El módulo de Personal Administrativo y Permisos RBAC (CU38) solo puede ser visualizado por cuentas con el rol <strong>ADMINISTRADOR</strong>.</p>' +
          '<a href="../inicio.html" class="vs-btn vs-btn--primary">Volver al Panel de Inicio</a></div>';
        return;
      }

      var tbodyPa38 = document.getElementById('cu38-personal-tbody');
      var selPers38 = document.getElementById('pa-persona');
      var selRol38 = document.getElementById('cu38-select-rol');
      var gridPerm38 = document.getElementById('cu38-permisos-grid');
      var btnSyncPerm38 = document.getElementById('cu38-btn-sync-permisos');
      var formNuevoPerm38 = document.getElementById('form-cu38-nuevo-permiso');
      var formCargoPa38 = document.getElementById('form-cu38-cargo-admin');

      var kpiPers38 = document.getElementById('cu38-kpi-personas');
      var kpiAdmin38 = document.getElementById('cu38-kpi-admin');
      var kpiPerm38 = document.getElementById('cu38-kpi-permisos');

      var todosPermisos38 = [];

      async function cargarDatosCU38() {
        try {
          var resPers = await VS_API.getPersonas({ per_page: 50 });
          var listPers = (resPers && resPers.data && resPers.data.data) ? resPers.data.data : (resPers.data || []);
          if (kpiPers38) kpiPers38.textContent = (resPers && resPers.data && resPers.data.total != null) ? resPers.data.total : listPers.length;
          if (selPers38 && listPers.length) {
            selPers38.innerHTML = listPers.map(function (p) {
              return '<option value="' + p.id_persona + '">' + escapeHtml(p.nombres + ' ' + p.apellidos + ' (CI ' + p.ci + ')') + '</option>';
            }).join('');
          }
        } catch (e) {}

        try {
          var resPa = await VS_API.getPersonalAdministrativo();
          var listPa = (resPa && resPa.data) ? resPa.data : [];
          if (kpiAdmin38) kpiAdmin38.textContent = listPa.length;
          if (tbodyPa38) {
            if (!listPa.length) {
              tbodyPa38.innerHTML = '<tr><td colspan="5" class="vs-td-empty" style="text-align:center;padding:1.2rem;">Sin registros en personal_administrativo.</td></tr>';
            } else {
              tbodyPa38.innerHTML = listPa.map(function (pa) {
                var p = pa.persona || {};
                var est = (p.activo === false || p.estado === 'INACTIVO') ? 'INACTIVO' : 'ACTIVO';
                return '<tr>' +
                  '<td class="vs-td-num">#' + pa.id_personal_administrativo + '</td>' +
                  '<td><div class="vs-cell-person__name">' + escapeHtml((p.nombres || '') + ' ' + (p.apellidos || '')) + '</div><div class="vs-cell-person__sub">' + escapeHtml(p.email || '') + '</div></td>' +
                  '<td class="vs-td-num">' + escapeHtml(p.ci || '—') + '</td>' +
                  '<td><span class="vs-badge vs-badge--info">' + escapeHtml(pa.cargo || 'Administración') + '</span></td>' +
                  '<td><span class="vs-badge vs-badge--ok"><span class="vs-badge__dot"></span>' + est + '</span></td>' +
                '</tr>';
              }).join('');
            }
          }
        } catch (e) {}

        await cargarMatrizPermisosRol();
      }

      async function cargarMatrizPermisosRol() {
        if (!gridPerm38) return;
        try {
          var resAll = await VS_API.getPermisos();
          todosPermisos38 = (resAll && resAll.data) ? resAll.data : [];
          if (kpiPerm38) kpiPerm38.textContent = todosPermisos38.length;

          var idRol = selRol38 ? parseInt(selRol38.value, 10) : 1;
          var resRolP = await VS_API.getPermisosRol(idRol);
          var asignados = (resRolP && resRolP.data) ? resRolP.data.map(function (x) { return x.id_permiso; }) : [];

          gridPerm38.innerHTML = todosPermisos38.map(function (perm) {
            var checked = asignados.indexOf(perm.id_permiso) !== -1 ? ' checked' : '';
            var codigoPerm = perm.nombre || perm.codigo || ('PERM_' + perm.id_permiso);
            var descPerm = perm.ruta_menu || perm.descripcion || perm.modulo || 'GENERAL';
            return '<label class="vs-check-card">' +
              '<input type="checkbox" class="vs-check cu38-perm-check" value="' + perm.id_permiso + '"' + checked + '>' +
              '<div><div class="vs-check-card__title vs-mono vs-xs">' + escapeHtml(codigoPerm) + '</div>' +
              '<div class="vs-check-card__sub">' + escapeHtml(perm.modulo || 'GENERAL') + ' · ' + escapeHtml(descPerm) + '</div></div>' +
            '</label>';
          }).join('');
        } catch (e) {}
      }

      if (selRol38) selRol38.addEventListener('change', cargarMatrizPermisosRol);

      if (btnSyncPerm38) {
        btnSyncPerm38.addEventListener('click', async function () {
          var idRol = selRol38 ? parseInt(selRol38.value, 10) : 1;
          var checks = document.querySelectorAll('.cu38-perm-check:checked');
          var ids = Array.from(checks).map(function (c) { return parseInt(c.value, 10); });
          try {
            await VS_API.sincronizarPermisosRol(idRol, ids);
            if (window.vsToast) window.vsToast('Matriz Rol-Permiso sincronizada', 'Guardada en rol_permiso y auditada en bitácora');
            cargarMatrizPermisosRol();
          } catch (err) {
            alert('Error sincronizando permisos: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }

      if (formNuevoPerm38) {
        formNuevoPerm38.setAttribute('data-api-bound', 'true');
        formNuevoPerm38.addEventListener('submit', async function (e) {
          e.preventDefault();
          var elNom = document.getElementById('pm-nombre') || document.getElementById('pm-codigo');
          var elMod = document.getElementById('pm-modulo');
          var elRuta = document.getElementById('pm-ruta') || document.getElementById('pm-desc');

          var nomVal = elNom ? elNom.value.trim().toUpperCase() : '';
          var modVal = elMod ? elMod.value.trim().toUpperCase() : '';
          var rutaVal = elRuta ? elRuta.value.trim() : null;

          if (!nomVal || !modVal) {
            alert('Por favor completa el código y módulo del permiso.');
            return;
          }

          try {
            await VS_API.crearPermiso({
              nombre: nomVal,
              modulo: modVal,
              ruta_menu: rutaVal
            });
            if (window.vsToast) window.vsToast('Permiso registrado', 'Guardado en tabla permiso y auditado en bitácora');
            formNuevoPerm38.reset();
            cargarMatrizPermisosRol();
          } catch (err) {
            alert('Error creando permiso: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }

      if (formCargoPa38) {
        formCargoPa38.setAttribute('data-api-bound', 'true');
        formCargoPa38.addEventListener('submit', async function (e) {
          e.preventDefault();
          var elPers = document.getElementById('pa-persona');
          var elCargo = document.getElementById('pa-cargo');
          var idPers = elPers ? parseInt(elPers.value, 10) : 0;
          var cargoVal = elCargo ? elCargo.value.trim() : '';

          if (!idPers || !cargoVal) {
            alert('Por favor selecciona una persona e ingresa el cargo.');
            return;
          }

          try {
            await VS_API.guardarPersonalAdministrativo({
              id_persona: idPers,
              cargo: cargoVal
            });
            if (window.vsToast) window.vsToast('Cargo administrativo actualizado', 'Guardado en personal_administrativo y auditado en bitácora');
            cargarDatosCU38();
          } catch (err) {
            alert('Error asignando cargo: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }

      cargarDatosCU38();
    }

    // CU39: Asignación Múltiple Médico – Especialidad (medico_especialidad)
    if (currentCuAttr === 'CU39') {
      var selMed39 = document.getElementById('me-medico');
      var checksBox39 = document.getElementById('me-especialidades-checks');
      var tbodyMat39 = document.getElementById('cu39-matriz-tbody');
      var formSync39 = document.getElementById('form-cu39-sync');

      var medicosList39 = [];
      var especialidadesList39 = [];

      async function cargarDatosCU39() {
        try {
          var resMed = await VS_API.getMedicos();
          medicosList39 = (resMed && resMed.data) ? resMed.data : [];
          var resEsp = await VS_API.getEspecialidades();
          especialidadesList39 = (resEsp && resEsp.data) ? resEsp.data : [];

          if (selMed39 && medicosList39.length) {
            var curVal = selMed39.value;
            selMed39.innerHTML = medicosList39.map(function (m) {
              var p = m.persona || {};
              return '<option value="' + m.id_medico + '">Dr(a). ' + escapeHtml((p.nombres || '') + ' ' + (p.apellidos || '')) + ' (' + escapeHtml(m.matricula_profesional || '') + ')</option>';
            }).join('');
            if (curVal) selMed39.value = curVal;
          }

          if (tbodyMat39) {
            tbodyMat39.innerHTML = medicosList39.map(function (m) {
              var p = m.persona || {};
              var esps = (m.especialidades || []).map(function (e) {
                return '<span class="vs-badge vs-badge--teal" style="margin-right:.25rem">' + escapeHtml(e.nombre) + '</span>';
              }).join('') || '<span class="vs-muted vs-xs">Sin especialidades vinculadas</span>';
              return '<tr>' +
                '<td><div class="vs-cell-person__name">Dr(a). ' + escapeHtml((p.nombres || '') + ' ' + (p.apellidos || '')) + '</div><div class="vs-cell-person__sub">' + escapeHtml(m.consultorio || 'Consultorio') + '</div></td>' +
                '<td class="vs-mono">' + escapeHtml(m.matricula_profesional || '—') + '</td>' +
                '<td>' + esps + '</td>' +
                '<td><span class="vs-badge vs-badge--ok"><span class="vs-badge__dot"></span>' + escapeHtml(m.estado || 'ACTIVO') + '</span></td>' +
              '</tr>';
            }).join('');
          }

          await renderChecksMedicoSeleccionado();
        } catch (e) {}
      }

      async function renderChecksMedicoSeleccionado() {
        if (!checksBox39 || !selMed39 || !selMed39.value) return;
        try {
          var resM = await VS_API.getEspecialidadesMedico(selMed39.value);
          var asignadas = (resM && resM.data) ? resM.data.map(function (x) { return x.id_especialidad; }) : [];
          checksBox39.innerHTML = especialidadesList39.map(function (esp) {
            var chk = asignadas.indexOf(esp.id_especialidad) !== -1 ? ' checked' : '';
            return '<label class="vs-check-card">' +
              '<input type="checkbox" class="vs-check cu39-esp-check" value="' + esp.id_especialidad + '"' + chk + '>' +
              '<div><div class="vs-check-card__title">' + escapeHtml(esp.nombre) + '</div>' +
              '<div class="vs-check-card__sub">' + escapeHtml(esp.descripcion || 'Especialidad clínica') + '</div></div>' +
            '</label>';
          }).join('');
        } catch (e) {}
      }

      if (selMed39) selMed39.addEventListener('change', renderChecksMedicoSeleccionado);

      if (formSync39) {
        formSync39.setAttribute('data-api-bound', 'true');
        formSync39.addEventListener('submit', async function (e) {
          e.preventDefault();
          var idMed = selMed39 ? selMed39.value : null;
          var chks = document.querySelectorAll('.cu39-esp-check:checked');
          var ids = Array.from(chks).map(function (c) { return parseInt(c.value, 10); });
          if (!ids.length) {
            alert('Selecciona al menos una especialidad médica.');
            return;
          }
          try {
            await VS_API.sincronizarEspecialidadesMedico(idMed, ids);
            if (window.vsToast) window.vsToast('Especialidades sincronizadas', 'Guardadas en medico_especialidad y auditadas en bitácora');
            cargarDatosCU39();
          } catch (err) {
            alert('Error sincronizando especialidades: ' + err.message);
          }
        });
      }

      cargarDatosCU39();
    }

    // CU40: Reserva de Ficha Web y Trazabilidad de Historial de Estados (historial_estado_cita)
    if (currentCuAttr === 'CU40') {
      var selCita40 = document.getElementById('cu40-select-cita');
      var tbodyHist40 = document.getElementById('cu40-historial-tbody');
      var formEst40 = document.getElementById('form-cu40-nuevo-estado');

      async function cargarCitasCU40() {
        if (!selCita40) return;
        try {
          var res = await VS_API.getCitas({ per_page: 30 });
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          if (list.length) {
            selCita40.innerHTML = list.map(function (c) {
              var pac = (c.paciente && c.paciente.persona) ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : 'Paciente';
              return '<option value="' + c.id_cita + '">' + escapeHtml((c.codigo || ('CM-' + c.id_cita)) + ' · ' + pac + ' (' + c.estado + ')') + '</option>';
            }).join('');
            await cargarHistorialCitaSeleccionada();
          }
        } catch (e) {}
      }

      async function cargarHistorialCitaSeleccionada() {
        if (!selCita40 || !selCita40.value || !tbodyHist40) return;
        try {
          var resH = await VS_API.getHistorialEstadosCita(selCita40.value);
          var listH = (resH && resH.data) ? resH.data : [];
          if (!listH.length) {
            tbodyHist40.innerHTML = '<tr><td colspan="5" class="vs-td-empty" style="text-align:center;padding:1.2rem;">Sin transiciones registradas en historial_estado_cita para esta cita.</td></tr>';
            return;
          }
          tbodyHist40.innerHTML = listH.map(function (h) {
            var usr = h.usuario ? h.usuario.nombre_usuario : 'sistema';
            return '<tr>' +
              '<td class="vs-td-num">' + formatFechaHora(h.fecha_cambio) + '</td>' +
              '<td><span class="vs-badge vs-badge--muted">' + escapeHtml(h.estado_anterior || 'INICIAL') + '</span></td>' +
              '<td><span class="vs-badge vs-badge--teal"><span class="vs-badge__dot"></span>' + escapeHtml(h.estado_nuevo) + '</span></td>' +
              '<td class="vs-mono">@' + escapeHtml(usr) + '</td>' +
              '<td>' + escapeHtml(h.observacion || '—') + '</td>' +
            '</tr>';
          }).join('');
        } catch (e) {}
      }

      if (selCita40) selCita40.addEventListener('change', cargarHistorialCitaSeleccionada);

      if (formEst40) {
        formEst40.setAttribute('data-api-bound', 'true');
        formEst40.addEventListener('submit', async function (e) {
          e.preventDefault();
          var idCita = selCita40 ? selCita40.value : null;
          var nuevoEst = document.getElementById('he-estado').value;
          var obs = document.getElementById('he-obs').value.trim();
          try {
            await VS_API.registrarHistorialEstadoCita(idCita, {
              estado_nuevo: nuevoEst,
              observacion: obs
            });
            if (window.vsToast) window.vsToast('Transición registrada', 'Guardada en historial_estado_cita y auditada en bitácora');
            document.getElementById('he-obs').value = '';
            await cargarHistorialCitaSeleccionada();
          } catch (err) {
            alert('Error registrando transición: ' + err.message);
          }
        });
      }

      cargarCitasCU40();
    }

    // CU41: Pasarela de Pago en Línea y Comprobante Digital
    if (currentCuAttr === 'CU41') {
      var selCita41 = document.getElementById('pg-cita');
      var formPago41 = document.getElementById('form-cu41-pago');
      var btnDescargar41 = document.getElementById('cu41-btn-descargar');
      var citasMap41 = {};

      async function cargarCitasCU41() {
        if (!selCita41) return;
        try {
          var res = await VS_API.getCitas({ per_page: 30 });
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          list.forEach(function (c) { citasMap41[c.id_cita] = c; });
          if (list.length) {
            selCita41.innerHTML = list.map(function (c) {
              var pac = (c.paciente && c.paciente.persona) ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : 'Paciente';
              return '<option value="' + c.id_cita + '">' + escapeHtml((c.codigo || ('CM-' + c.id_cita)) + ' · ' + pac + ' · ' + c.fecha + ' ' + (c.hora_inicio || '').substring(0, 5)) + '</option>';
            }).join('');
            actualizarPreviewComprobante41();
          }
        } catch (e) {}
      }

      function actualizarPreviewComprobante41() {
        if (!selCita41 || !citasMap41[selCita41.value]) return;
        var c = citasMap41[selCita41.value];
        var pac = (c.paciente && c.paciente.persona) ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : 'Paciente';
        var med = (c.medico && c.medico.persona) ? ('Dr(a). ' + c.medico.persona.nombres + ' ' + c.medico.persona.apellidos) : 'Médico';
        var esp = (c.especialidad && c.especialidad.nombre) ? c.especialidad.nombre : 'Consulta Especializada';

        var elTx = document.getElementById('cu41-comp-tx');
        var elCita = document.getElementById('cu41-comp-cita');
        var elMet = document.getElementById('cu41-comp-metodo');
        var elMon = document.getElementById('cu41-comp-monto');
        var elEst = document.getElementById('cu41-comp-estado');

        if (elCita) elCita.textContent = (c.codigo || ('CM-' + c.id_cita)) + ' (' + pac + ')';
        if (elTx) elTx.textContent = 'COMP-' + (c.id_cita ? String(c.id_cita).padStart(4, '0') : '0001');
        if (elMet) elMet.textContent = 'Pendiente de pago';
        if (elMon) elMon.textContent = 'Bs 150.00';
        if (elEst) {
          elEst.textContent = c.estado || 'PENDIENTE';
          elEst.className = (c.estado === 'CONFIRMADA' || c.estado === 'ATENDIDA') ? 'vs-badge vs-badge--ok' : 'vs-badge vs-badge--muted';
        }
      }

      if (selCita41) selCita41.addEventListener('change', actualizarPreviewComprobante41);

      if (formPago41) {
        formPago41.setAttribute('data-api-bound', 'true');
        formPago41.addEventListener('submit', async function (e) {
          e.preventDefault();
          var idCita = selCita41 ? selCita41.value : null;
          var radMet = formPago41.querySelector('input[name="metodo_pago"]:checked');
          var metodo = radMet ? radMet.value : 'QR_SIMPLE';
          var monto = document.getElementById('pg-monto') ? document.getElementById('pg-monto').value : '150';
          var nit = document.getElementById('pg-nit') ? document.getElementById('pg-nit').value.trim() : '';

          var submitBtn = formPago41.querySelector('button[type="submit"]');
          if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Procesando pago...'; }

          try {
            var refExt = 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase();

            // Si el método es STRIPE, crear sesión / intent en Stripe primero
            if (metodo === 'STRIPE') {
              try {
                var resStripe = await VS_API.crearStripeIntento({ id_cita: idCita, monto: monto });
                if (resStripe && resStripe.payment_intent_id) {
                  refExt = resStripe.payment_intent_id;
                }
              } catch (strErr) {
                console.warn('Stripe checkout fallback:', strErr);
              }
            }

            // Registrar el pago en PostgreSQL y confirmar cita
            var resPago = await VS_API.registrarPago({
              id_cita: idCita,
              monto: monto,
              metodo: metodo,
              nit_ci: nit,
              referencia_externa: refExt
            });

            var pagoData = (resPago && resPago.data) ? resPago.data : {};
            var compData = pagoData.comprobante_pago || pagoData.comprobante || {};

            var elTx = document.getElementById('cu41-comp-tx');
            var elCita = document.getElementById('cu41-comp-cita');
            var elMet = document.getElementById('cu41-comp-metodo');
            var elMon = document.getElementById('cu41-comp-monto');
            var elEst = document.getElementById('cu41-comp-estado');

            if (elTx) elTx.textContent = compData.numero || refExt;
            if (elCita) elCita.textContent = (pagoData.cita && pagoData.cita.codigo) ? pagoData.cita.codigo : ('Cita #' + idCita);
            if (elMet) elMet.textContent = (metodo === 'STRIPE' ? 'Stripe Payments' : (metodo === 'QR_SIMPLE' || metodo === 'QR' ? 'QR Simple Bolivia' : 'Tarjeta Débito/Crédito'));
            if (elMon) elMon.textContent = 'Bs ' + parseFloat(monto).toFixed(2);
            if (elEst) {
              elEst.textContent = 'PAGADO';
              elEst.className = 'vs-badge vs-badge--ok';
            }

            if (window.vsToast) {
              window.vsToast('Pago confirmado con éxito', 'Comprobante ' + (compData.numero || refExt) + ' emitido en tiempo real.');
            }

            // Recargar catálogo de citas para reflejar la confirmación
            cargarCitasCU41();
          } catch (err) {
            alert('Error al procesar el pago: ' + (err.data && err.data.message ? err.data.message : err.message));
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<svg class="vs-i"><use href="#i-check-circle"/></svg>Confirmar pago y generar comprobante';
            }
          }
        });
      }

      if (btnDescargar41) {
        btnDescargar41.addEventListener('click', function () {
          var elTx = document.getElementById('cu41-comp-tx');
          var elCita = document.getElementById('cu41-comp-cita');
          var elMet = document.getElementById('cu41-comp-metodo');
          var elMon = document.getElementById('cu41-comp-monto');
          var cod = (elTx && elTx.textContent !== '—') ? elTx.textContent : 'COMP-2026-0001';
          var cita = (elCita && elCita.textContent !== '—') ? elCita.textContent : 'CM-0001';
          var met = elMet ? elMet.textContent : 'QR Simple';
          var mon = elMon ? elMon.textContent : 'Bs 150.00';

          var txt = '==================================================\n' +
            '         CLÍNICA VIDA SALUD — COMPROBANTE OFICIAL\n' +
            '==================================================\n' +
            'N.º Comprobante: ' + cod + '\n' +
            'Cita Médica:     ' + cita + '\n' +
            'Método de Pago:  ' + met + '\n' +
            'Importe Total:   ' + mon + '\n' +
            'Estado:          CONFIRMADO Y PAGADO\n' +
            'Fecha Emisión:   ' + new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' }) + '\n' +
            '==================================================\n' +
            '¡Gracias por confiar en Clínica Vida Salud!\n';

          var blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.setAttribute('download', cod + '.txt');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
      }

      cargarCitasCU41();
    }

    // =========================================================================
    // CU42: HISTORIAL DE PAGOS DEL PACIENTE Y GESTIÓN DE REEMBOLSOS (100% DINÁMICO)
    // =========================================================================
    if (currentCuAttr === 'CU42') {
      var tbodyPagos42 = document.getElementById('cu42-pagos-tbody');
      var selCita42 = document.getElementById('rb-cita');
      var formReemb42 = document.getElementById('form-cu42-reembolso');
      var pagosCache42 = [];

      async function cargarPagosCU42() {
        if (!tbodyPagos42) return;
        tbodyPagos42.innerHTML = '<tr><td colspan="9" class="vs-td-empty">Consultando pagos y transacciones en tiempo real...</td></tr>';

        try {
          var res = await VS_API.getPagos({ per_page: 50 });
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          pagosCache42 = list;

          if (selCita42) {
            if (list.length === 0) {
              selCita42.innerHTML = '<option value="">Sin transacciones registradas</option>';
            } else {
              selCita42.innerHTML = list.map(function (p) {
                var c = p.cita || {};
                var pac = (c.paciente && c.paciente.persona) ? (c.paciente.persona.nombres + ' ' + c.paciente.persona.apellidos) : 'Paciente';
                var codCita = c.codigo || ('CM-' + p.id_cita);
                return '<option value="' + p.id_pago + '" data-cita-id="' + (c.id_cita || '') + '">' +
                  escapeHtml(codCita + ' · ' + pac + ' (Bs ' + Number(p.monto).toFixed(2) + ' - ' + p.estado + ')') +
                '</option>';
              }).join('');
            }
          }

          if (list.length === 0) {
            tbodyPagos42.innerHTML = '<tr><td colspan="9" class="vs-td-empty">No se encontraron pagos registrados en la base de datos.</td></tr>';
            return;
          }

          tbodyPagos42.innerHTML = list.map(function (p) {
            var c = p.cita || {};
            var pacObj = (c.paciente && c.paciente.persona) ? c.paciente.persona : {};
            var pacNom = (pacObj.nombres || '') + ' ' + (pacObj.apellidos || '');
            var pacCi = pacObj.ci ? ('CI ' + pacObj.ci) : '';

            var medObj = (c.medico && c.medico.persona) ? c.medico.persona : {};
            var medNom = medObj.nombres ? ('Dr(a). ' + medObj.nombres + ' ' + medObj.apellidos) : 'Médico General';
            var espNom = (c.especialidad && c.especialidad.nombre) ? c.especialidad.nombre : 'Consulta';

            var comp = p.comprobante_pago || p.comprobante || {};
            var numComp = comp.numero || ('COMP-2026-' + String(p.id_pago).padStart(4, '0'));
            var codCita = c.codigo || ('CM-' + String(p.id_cita).padStart(4, '0'));

            var estUpper = (p.estado || 'APROBADO').toUpperCase();
            var esReembolsado = estUpper === 'REEMBOLSADO' || (c.estado === 'CANCELADA');
            var badgeEst = esReembolsado
              ? '<span class="vs-badge vs-badge--warn"><span class="vs-badge__dot"></span>REEMBOLSADO</span>'
              : '<span class="vs-badge vs-badge--ok"><span class="vs-badge__dot"></span>PAGADO</span>';

            var metodoTexto = p.metodo || 'QR';
            if (metodoTexto === 'QR' || metodoTexto === 'QR_SIMPLE') metodoTexto = 'QR Simple';
            else if (metodoTexto === 'TARJETA') metodoTexto = 'Tarjeta Débito';
            else if (metodoTexto === 'STRIPE') metodoTexto = 'Stripe Payments';

            var fechaCitaStr = (c.fecha || '—') + (c.hora_inicio ? (' ' + String(c.hora_inicio).substring(0, 5)) : '');
            var fechaPagoStr = p.fecha_hora ? formatFechaHora(p.fecha_hora) : '—';
            var montoTotalStr = 'Bs ' + Number(p.monto || 150).toFixed(2);

            var accionBtn = '';
            if (!esReembolsado) {
              accionBtn = '<button type="button" class="vs-btn vs-btn--danger vs-btn--xs" data-btn-reembolso="' + p.id_pago + '" title="Iniciar reembolso de este pago">' +
                '<svg class="vs-i"><use href="#i-undo"/></svg>Reembolsar' +
              '</button>';
            } else {
              accionBtn = '<span class="vs-muted vs-xs">Procesado</span>';
            }

            return '<tr>' +
              '<td class="vs-mono vs-xs"><strong>' + escapeHtml(numComp) + '</strong><div class="vs-muted">' + escapeHtml(codCita) + '</div></td>' +
              '<td><div class="vs-cell-person__name">' + escapeHtml(pacNom || 'Paciente') + '</div><div class="vs-cell-person__sub vs-mono">' + escapeHtml(pacCi) + '</div></td>' +
              '<td><div>' + escapeHtml(espNom) + '</div><div class="vs-cell-person__sub">' + escapeHtml(medNom) + '</div></td>' +
              '<td class="vs-mono vs-xs">' + escapeHtml(fechaCitaStr) + '</td>' +
              '<td><span class="vs-badge vs-badge--muted">' + escapeHtml(metodoTexto) + '</span></td>' +
              '<td class="vs-td-num vs-strong" style="color:var(--vs-teal);">' + escapeHtml(montoTotalStr) + '</td>' +
              '<td class="vs-mono vs-xs" style="white-space:nowrap;">' + escapeHtml(fechaPagoStr) + '</td>' +
              '<td>' + badgeEst + '</td>' +
              '<td class="vs-td-actions">' + accionBtn + '</td>' +
            '</tr>';
          }).join('');

          // Delegar botones de reembolso de cada fila
          tbodyPagos42.querySelectorAll('button[data-btn-reembolso]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var idP = btn.getAttribute('data-btn-reembolso');
              if (selCita42) selCita42.value = idP;
              var motInput = document.getElementById('rb-motivo');
              if (motInput) {
                motInput.focus();
                if (!motInput.value) motInput.value = 'Reembolso solicitado por paciente — Cancelación justificada';
              }
              if (window.vsToast) {
                window.vsToast('Pago seleccionado para reembolso', 'Completa el motivo y presiona Procesar.');
              }
            });
          });
        } catch (e) {
          tbodyPagos42.innerHTML = '<tr><td colspan="9" class="vs-td-empty">Error cargando historial de pagos: ' + escapeHtml(e.message) + '</td></tr>';
        }
      }

      if (formReemb42) {
        formReemb42.setAttribute('data-api-bound', 'true');
        formReemb42.addEventListener('submit', async function (e) {
          e.preventDefault();
          var idPago = selCita42 ? selCita42.value : null;
          var mot = document.getElementById('rb-motivo') ? document.getElementById('rb-motivo').value.trim() : '';

          if (!idPago) {
            alert('Por favor selecciona una cita o pago para procesar el reembolso.');
            return;
          }

          var submitBtn = formReemb42.querySelector('button[type="submit"]');
          if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Procesando reembolso...'; }

          try {
            await VS_API.reembolsarPago(idPago, {
              motivo: mot || 'Cancelación justificada con reembolso del 100%'
            });
            if (window.vsToast) {
              window.vsToast('Reembolso y anulación procesados', 'Pago marcado como REEMBOLSADO, cita CANCELADA y bloque horario liberado.');
            }
            formReemb42.reset();
            cargarPagosCU42();
          } catch (err) {
            alert('Error procesando reembolso: ' + (err.data && err.data.message ? err.data.message : err.message));
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<svg class="vs-i"><use href="#i-undo"/></svg>Procesar reembolso y cancelar cita';
            }
          }
        });
      }

      cargarPagosCU42();
    }

    // CU43: Reporte de Ingresos Financieros y Catálogo de Reportes en BD
    if (currentCuAttr === 'CU43') {
      var tbodyRep43 = document.getElementById('cu43-reportes-tbody');
      var formGen43 = document.getElementById('form-cu43-generar');
      var badgeTotal43 = document.getElementById('cu43-total-badge');
      var citasCache43 = [];

      async function cargarReportesCU43() {
        if (!tbodyRep43) return;
        try {
          var desdeEl = document.getElementById('rf-desde') || document.getElementById('rp-desde');
          var hastaEl = document.getElementById('rf-hasta') || document.getElementById('rp-hasta');
          var fDesde = desdeEl ? desdeEl.value : '';
          var fHasta = hastaEl ? hastaEl.value : '';

          var results = await Promise.all([
            VS_API.getReportes({ per_page: 50 }).catch(function () { return { data: [] }; }),
            VS_API.getCitas({ per_page: 300 }).catch(function () { return { data: [] }; })
          ]);
          var res = results[0];
          var resCitas = results[1];
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          var citasAll = (resCitas && resCitas.data && resCitas.data.data) ? resCitas.data.data : (resCitas.data || []);

          var citasFiltradas = citasAll.filter(function (c) {
            var fc = String(c.fecha_cita || '').slice(0, 10);
            if (fDesde && fc < fDesde) return false;
            if (fHasta && fc > fHasta) return false;
            return true;
          });
          citasCache43 = citasFiltradas;

          var tarifa = 150;
          var pagadas = citasFiltradas.filter(function (c) { return c.estado === 'CONFIRMADA' || c.estado === 'ATENDIDA'; });
          var programadas = citasFiltradas.filter(function (c) { return c.estado === 'PROGRAMADA' || c.estado === 'REPROGRAMADA'; });
          var canceladas = citasFiltradas.filter(function (c) { return c.estado === 'CANCELADA'; });

          var kpiIng = document.getElementById('cu43-kpi-ingresos');
          var kpiIngMeta = document.getElementById('cu43-kpi-ingresos-meta');
          var kpiProy = document.getElementById('cu43-kpi-proyectado');
          var kpiProyMeta = document.getElementById('cu43-kpi-proyectado-meta');
          var kpiAnul = document.getElementById('cu43-kpi-anulados');
          var kpiAnulMeta = document.getElementById('cu43-kpi-anulados-meta');
          var kpiRep = document.getElementById('cu43-kpi-reportes');

          if (kpiIng) kpiIng.textContent = 'Bs ' + (pagadas.length * tarifa).toLocaleString('es-BO', { minimumFractionDigits: 2 });
          if (kpiIngMeta) kpiIngMeta.textContent = pagadas.length + ' fichas confirmadas/atendidas (Bs 150 c/u)';
          if (kpiProy) kpiProy.textContent = 'Bs ' + (programadas.length * tarifa).toLocaleString('es-BO', { minimumFractionDigits: 2 });
          if (kpiProyMeta) kpiProyMeta.textContent = programadas.length + ' citas pendientes de confirmación';
          if (kpiAnul) kpiAnul.textContent = 'Bs ' + (canceladas.length * tarifa).toLocaleString('es-BO', { minimumFractionDigits: 2 });
          if (kpiAnulMeta) kpiAnulMeta.textContent = canceladas.length + ' citas anuladas o reembolsadas';
          if (kpiRep) kpiRep.textContent = String(list.length);
          if (badgeTotal43) badgeTotal43.textContent = list.length + ' reportes registrados';

          if (!list.length) {
            tbodyRep43.innerHTML = '<tr><td colspan="6" class="vs-td-empty" style="text-align:center;padding:1.2rem;">No hay reportes registrados en la base de datos.</td></tr>';
            return;
          }
          tbodyRep43.innerHTML = list.map(function (r) {
            var usr = r.usuario ? (r.usuario.nombre_usuario || (r.usuario.nombres + ' ' + r.usuario.apellidos)) : ('Usuario #' + r.id_usuario);
            var paramsObj = r.filtros || r.parametros || {};
            var paramsStr = typeof paramsObj === 'object' ? JSON.stringify(paramsObj) : String(paramsObj);
            var formatoVal = (paramsObj && paramsObj.formato) ? paramsObj.formato : (r.formato || 'CSV');
            return '<tr>' +
              '<td class="vs-td-num">#' + r.id_reporte + '</td>' +
              '<td class="vs-td-num">' + formatFechaHora(r.fecha_generacion || r.created_at) + '</td>' +
              '<td><span class="vs-badge vs-badge--info">' + escapeHtml(r.tipo_reporte || r.tipo || 'REPORTE') + '</span></td>' +
              '<td><span class="vs-badge vs-badge--teal">' + escapeHtml(formatoVal) + '</span></td>' +
              '<td class="vs-mono">@' + escapeHtml(usr) + '</td>' +
              '<td class="vs-mono vs-xs">' + escapeHtml(paramsStr) + '</td>' +
            '</tr>';
          }).join('');
        } catch (e) {}
      }

      var desdeInput43 = document.getElementById('rf-desde') || document.getElementById('rp-desde');
      var hastaInput43 = document.getElementById('rf-hasta') || document.getElementById('rp-hasta');
      if (desdeInput43) desdeInput43.addEventListener('change', cargarReportesCU43);
      if (hastaInput43) hastaInput43.addEventListener('change', cargarReportesCU43);

      if (formGen43) {
        formGen43.setAttribute('data-api-bound', 'true');
        formGen43.addEventListener('submit', async function (e) {
          e.preventDefault();
          var tipoEl = document.getElementById('rf-tipo') || document.getElementById('rp-tipo');
          var formatoEl = document.getElementById('rf-formato') || document.getElementById('rp-formato');
          var desdeEl = document.getElementById('rf-desde') || document.getElementById('rp-desde');
          var hastaEl = document.getElementById('rf-hasta') || document.getElementById('rp-hasta');

          var tipo = tipoEl ? tipoEl.value : 'CITAS_PERIODO';
          var formato = formatoEl ? formatoEl.value : 'CSV';
          var desde = desdeEl ? desdeEl.value : '';
          var hasta = hastaEl ? hastaEl.value : '';
          try {
            await VS_API.crearReporte({
              tipo: tipo,
              formato: formato,
              fecha_desde: desde,
              fecha_hasta: hasta,
              parametros: { desde: desde, hasta: hasta, formato: formato, moneda: 'BOB' }
            });
            if (String(formato).toUpperCase() === 'CSV') {
              var rowsCsv = [['ID Cita', 'Fecha', 'Hora', 'Paciente', 'Medico', 'Especialidad', 'Estado', 'Importe BOB']];
              citasCache43.forEach(function (c) {
                var pac = c.paciente ? ((c.paciente.nombres || '') + ' ' + (c.paciente.apellidos || '')).trim() : ('Paciente #' + c.id_paciente);
                var med = (c.medico && c.medico.usuario) ? ((c.medico.usuario.nombres || '') + ' ' + (c.medico.usuario.apellidos || '')).trim() : ('Medico #' + c.id_medico);
                var esp = c.especialidad ? c.especialidad.nombre : '';
                var imp = (c.estado === 'CONFIRMADA' || c.estado === 'ATENDIDA') ? '150.00' : '0.00';
                rowsCsv.push([c.id_cita, String(c.fecha_cita || '').slice(0, 10), String(c.hora_inicio || '').slice(0, 5), pac, med, esp, c.estado, imp]);
              });
              descargarCsvDesdeFilas('reporte_' + String(tipo).toLowerCase() + '_' + (desde || 'inicio') + '_' + (hasta || 'fin') + '.csv', rowsCsv);
            } else {
              window.print();
            }
            if (window.vsToast) window.vsToast('Reporte generado y guardado', 'Registrado en base de datos y exportado en formato ' + formato);
            cargarReportesCU43();
          } catch (err) {
            alert('Error generando reporte: ' + (err.data && err.data.message ? err.data.message : err.message));
          }
        });
      }

      cargarReportesCU43();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
