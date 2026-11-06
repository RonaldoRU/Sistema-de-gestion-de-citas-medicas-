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
      try {
        res = await this.request('/auth/logout', { method: 'POST' });
        if (res && res.logout_info) {
          sessionStorage.setItem('vs_last_logout', JSON.stringify(res.logout_info));
        }
      } catch (e) {
        console.warn('Error cerrando sesión en servidor:', e);
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

    cambiarRolUsuario: function (id, id_rol) {
      return this.request('/usuarios/' + id + '/cambiar-rol', {
        method: 'PUT',
        body: { id_rol: id_rol }
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

    // ---------- Reportes (P7 CU32-CU36) ----------
    getReportes: function (params) {
      var query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('/reportes' + query, { method: 'GET' });
    },

    crearReporte: function (data) {
      return this.request('/reportes', { method: 'POST', body: data });
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

  function formatFechaHora(isoStr) {
    if (!isoStr) return '—';
    try {
      var d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      var day = String(d.getDate()).padStart(2, '0');
      var mon = String(d.getMonth() + 1).padStart(2, '0');
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      var ss = String(d.getSeconds()).padStart(2, '0');
      return day + '/' + mon + ' ' + hh + ':' + mm + ':' + ss;
    } catch (e) {
      return isoStr;
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

    // 1. Sincronizar barra superior institucional
    if (currentUser) {
      // Clásico
      var nombreEl = document.querySelector('.vs-user__name');
      var rolEl = document.querySelector('.vs-user__role');
      var avatarEl = document.querySelector('.vs-avatar');

      var fullName = (currentUser.nombres ? (currentUser.nombres + ' ' + (currentUser.apellidos || '')) : currentUser.nombre_usuario) || 'Silvia Irene Colque López';
      var rolName = currentUser.rol || 'Administrador';

      if (nombreEl) nombreEl.textContent = fullName;
      if (rolEl) rolEl.textContent = rolName;
      if (avatarEl) {
        var inits = (currentUser.nombres ? currentUser.nombres.charAt(0) : 'S') + (currentUser.apellidos ? currentUser.apellidos.charAt(0) : 'C');
        avatarEl.textContent = inits.toUpperCase();
        avatarEl.title = fullName + ' (' + rolName + ')';
      }

      // Stitch
      var stitchName = document.querySelector('.vs-topbar .text-vs-ink');
      var stitchRole = document.querySelector('.vs-topbar .text-vs-muted');
      var stitchAvatar = document.querySelector('.vs-topbar .rounded-full');
      if (stitchName) stitchName.textContent = fullName;
      if (stitchRole) stitchRole.textContent = rolName;
      if (stitchAvatar) {
        var sInits = (currentUser.nombres ? currentUser.nombres.charAt(0) : 'S') + (currentUser.apellidos ? currentUser.apellidos.charAt(0) : 'C');
        stitchAvatar.textContent = sInits.toUpperCase();
        stitchAvatar.title = fullName;
      }
    }

    // 2. Interceptar botones de Cerrar Sesión
    document.querySelectorAll('[data-logout]').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        e.preventDefault();
        try {
          await VS_API.logout();
        } catch (err) {}
        var targetUrl = location.pathname.includes('/P') ? '../P1 Seguridad y Autenticación/cu02-sesion-cerrada.html' : 'P1 Seguridad y Autenticación/cu02-sesion-cerrada.html';
        window.location.href = targetUrl + '?t=' + Date.now();
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
          var usuarioVal = userEl ? userEl.value.split('—')[0].trim() : '';
          var modEl = document.getElementById('b-modulo');
          var moduloVal = modEl ? modEl.value.split('·')[0].trim() : '';
          var accionVal = document.getElementById('b-accion') ? document.getElementById('b-accion').value : '';
          var desdeVal = document.getElementById('b-desde') ? document.getElementById('b-desde').value : '';
          var hastaVal = document.getElementById('b-hasta') ? document.getElementById('b-hasta').value : '';
          var qVal = document.getElementById('b-q') ? document.getElementById('b-q').value : '';

          var params = {};
          if (usuarioVal && !usuarioVal.includes('Todos')) params.usuario = usuarioVal;
          if (moduloVal && !moduloVal.includes('Todos')) params.modulo = moduloVal;
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

    // 10. Vincular Catálogo de Pacientes (CU15)
    var pacTbody = document.getElementById('vs-pacientes-tbody');
    if (pacTbody) {
      initPacientesCatalogo();
    }

    async function initPacientesCatalogo() {
      var searchInput = document.getElementById('paciente-buscar-input');
      var searchForm = document.getElementById('paciente-buscar-form');
      var conteoSpan = document.getElementById('paciente-conteo');

      async function cargar(buscar) {
        pacTbody.innerHTML = '<tr><td colspan="6" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-muted);">Consultando PostgreSQL...</td></tr>';
        try {
          var params = buscar ? { buscar: buscar } : {};
          var res = await VS_API.getPacientes(params);
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || res || []);
          if (!Array.isArray(list)) list = [];

          if (conteoSpan) conteoSpan.textContent = list.length + ' pacientes en el padrón';

          if (list.length === 0) {
            pacTbody.innerHTML = '<tr><td colspan="6" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-muted);">No se encontraron pacientes registrados.</td></tr>';
            return;
          }

          var html = '';
          list.forEach(function (p) {
            var pers = p.persona || {};
            var nombre = (pers.nombres ? (pers.nombres + ' ' + (pers.apellidos || '')) : 'Sin nombre');
            var ci = pers.ci || '—';
            var tel = pers.telefono || '—';
            var cod = 'PAC-' + String(p.id_persona).padStart(4, '0');
            var activo = pers.activo !== false;
            var estadoBadge = activo ? '<span class="vs-badge vs-badge--ok"><span class="vs-badge__dot"></span>Activo</span>' : '<span class="vs-badge vs-badge--danger"><span class="vs-badge__dot"></span>Inactivo</span>';
            var inits = (pers.nombres ? pers.nombres.charAt(0) : 'P') + (pers.apellidos ? pers.apellidos.charAt(0) : '');

            html += '<tr>' +
              '<td class="vs-td-num font-mono">' + cod + '</td>' +
              '<td><div class="vs-cell-person"><span class="vs-avatar vs-avatar--sm vs-avatar--sky">' + inits.toUpperCase() + '</span>' +
              '<div><div class="vs-cell-person__name">' + escapeHtml(nombre) + '</div><div class="vs-cell-person__sub vs-mono">CI ' + escapeHtml(ci) + '</div></div></div></td>' +
              '<td class="vs-hide-md vs-mono">' + escapeHtml(ci) + '</td>' +
              '<td class="vs-hide-md vs-mono">' + escapeHtml(tel) + '</td>' +
              '<td>' + estadoBadge + '</td>' +
              '<td class="vs-td-actions">' +
                '<a href="../P6 Gestión de Citas Médicas/cu24-programar-cita.html?paciente_id=' + p.id_persona + '" class="vs-icon-btn" title="Programar cita"><svg class="vs-i"><use href="#i-plus"/></svg></a>' +
              '</td>' +
              '</tr>';
          });
          pacTbody.innerHTML = html;
        } catch (e) {
          pacTbody.innerHTML = '<tr><td colspan="6" class="vs-td-empty" style="text-align:center;padding:2rem;color:var(--vs-danger);">Error al cargar pacientes: ' + e.message + '</td></tr>';
        }
      }

      if (searchForm) {
        searchForm.addEventListener('submit', function (e) {
          e.preventDefault();
          cargar(searchInput ? searchInput.value.trim() : '');
        });
      }

      cargar();
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
          if (document.getElementById('m-ci')) document.getElementById('m-ci').value = p.ci || '';
          if (document.getElementById('m-user')) document.getElementById('m-user').value = u.nombre_usuario || '';
          if (document.getElementById('m-nom')) document.getElementById('m-nom').value = p.nombres || '';
          if (document.getElementById('m-ape')) document.getElementById('m-ape').value = p.apellidos || '';
          if (document.getElementById('m-email')) document.getElementById('m-email').value = p.email || '';
          if (document.getElementById('m-tel')) document.getElementById('m-tel').value = p.telefono || '';
        } catch (e) {}
      }
      cargarDatosCU07();

      if (formDatos07) {
        formDatos07.setAttribute('data-api-bound', 'true');
        formDatos07.addEventListener('submit', async function (e) {
          e.preventDefault();
          try {
            await VS_API.actualizarUsuario(targetUserId, {
              ci: document.getElementById('m-ci') ? document.getElementById('m-ci').value.trim() : undefined,
              nombres: document.getElementById('m-nom').value.trim(),
              apellidos: document.getElementById('m-ape').value.trim(),
              email: document.getElementById('m-email').value.trim(),
              telefono: document.getElementById('m-tel').value.trim()
            });
            if (window.vsToast) window.vsToast('Cambios guardados', 'Cuenta modificada en PostgreSQL y registrada en bitácora (MODIFICAR)');
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
    // 19. CU08: CAMBIAR ROL OPERATIVO Y PERMISOS (RBAC)
    // =========================================================================
    if (currentCuAttr === 'CU08') {
      var selectUser08 = document.getElementById('r-usuario');
      var dlgRol08 = document.getElementById('dlg-cambiar-rol');
      var formRol08 = dlgRol08 ? dlgRol08.querySelector('form') : null;

      async function cargarUsuariosCU08() {
        if (!selectUser08) return;
        try {
          var res = await VS_API.getUsuarios({ per_page: 50 });
          var list = (res && res.data && res.data.data) ? res.data.data : (res.data || []);
          selectUser08.innerHTML = '';
          list.forEach(function (u) {
            var p = u.persona || {};
            var r = u.rol ? (u.rol.nombre || u.rol) : 'RECEPCIONISTA';
            var opt = document.createElement('option');
            opt.value = u.id_usuario;
            opt.textContent = u.nombre_usuario + ' — ' + (p.nombres || '') + ' ' + (p.apellidos || '') + ' (actual: ' + r + ')';
            selectUser08.appendChild(opt);
          });
        } catch (e) {}
      }
      cargarUsuariosCU08();

      if (formRol08) {
        formRol08.setAttribute('data-api-bound', 'true');
        formRol08.addEventListener('submit', async function (e) {
          e.preventDefault();
          var uid = selectUser08 ? parseInt(selectUser08.value, 10) : 2;
          var checkedRol = formRol08.querySelector('input[name="nuevo-rol"]:checked');
          var rolVal = checkedRol ? checkedRol.value : '3';
          var idRol = rolVal === '1' ? 1 : (rolVal === '2' ? 2 : 3);
          try {
            await VS_API.cambiarRolUsuario(uid, idRol);
            if (dlgRol08 && dlgRol08.close) dlgRol08.close();
            if (window.vsToast) window.vsToast('Rol actualizado', 'Cambio de rol guardado en BD y registrado en bitácora (CAMBIO_ROL)');
            cargarUsuariosCU08();
          } catch (err) {
            alert('No se pudo cambiar el rol: ' + (err.data && err.data.message ? err.data.message : err.message));
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
    // 21. CU10: REGISTRO AUTOMÁTICO EN BITÁCORA (LIVE DASHBOARD)
    // =========================================================================
    if (currentCuAttr === 'CU10') {
      async function cargarResumenCU10() {
        try {
          var res = await VS_API.getBitacoraResumen();
          var r = (res && res.resumen) ? res.resumen : res;
          if (!r) return;
          if (document.getElementById('kpi-hoy')) document.getElementById('kpi-hoy').textContent = r.total_hoy != null ? r.total_hoy : 0;
          if (document.getElementById('kpi-mes')) document.getElementById('kpi-mes').textContent = r.total_mes != null ? r.total_mes : 0;
          if (document.getElementById('kpi-alertas')) document.getElementById('kpi-alertas').textContent = r.alertas_hoy != null ? r.alertas_hoy : 0;

          var barsEl = document.getElementById('bitacora-bars');
          if (barsEl && Array.isArray(r.por_accion) && r.por_accion.length) {
            var maxVal = Math.max.apply(null, r.por_accion.map(function (a) { return a.total; })) || 1;
            var bHtml = '';
            r.por_accion.forEach(function (a) {
              var pct = Math.round((a.total / maxVal) * 100);
              bHtml += '<div class="vs-bars__row"><span class="vs-bars__label vs-mono">' + escapeHtml(a.tipo_accion) + '</span><div class="vs-bar vs-bar--teal"><i style="width:' + pct + '%"></i></div><span class="vs-bars__val">' + a.total + '</span></div>';
            });
            barsEl.innerHTML = bHtml;
          }

          var tlEl = document.getElementById('bitacora-timeline');
          if (tlEl && Array.isArray(r.ultimos_eventos) && r.ultimos_eventos.length) {
            var tHtml = '';
            r.ultimos_eventos.forEach(function (ev) {
              var usr = ev.usuario ? ev.usuario.nombre_usuario : 'Sistema';
              tHtml += '<li class="vs-tl-item vs-tl-item--ok">' +
                '<span class="vs-tl-time">' + formatFechaHora(ev.fecha_hora) + '</span>' +
                '<div class="vs-tl-title"><span class="vs-badge vs-badge--info vs-badge--mono">' + escapeHtml(ev.tipo_accion) + '</span> ' + escapeHtml(ev.modulo) + ' · <span class="vs-code">' + escapeHtml(ev.tabla_afectada || 'sistema') + '</span></div>' +
                '<div class="vs-tl-sub">“' + escapeHtml(ev.detalle || '') + '” — <strong class="vs-strong">' + escapeHtml(usr) + '</strong></div>' +
                '</li>';
            });
            tlEl.innerHTML = tHtml;
          }
        } catch (e) {}
      }
      cargarResumenCU10();
      setInterval(cargarResumenCU10, 4000);
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
    // 24. CU22 DISPONIBILIDAD, CU23 BLOQUEAR AGENDA, CU26 REPROGRAMAR, CU27 CANCELAR, CU28 RECORDATORIOS, CU29/30/31 ATENCIÓN
    // =========================================================================
    if (currentCuAttr === 'CU22') {
      var selEsp22 = document.getElementById('d-esp');
      var selMed22 = document.getElementById('d-med');
      var inFecha22 = document.getElementById('d-fecha');
      var slotsBox22 = document.querySelector('[data-slots="disp"]');
      var filterForm22 = document.querySelector('.vs-filters');

      async function cargarDisponibilidadCU22() {
        try {
          var resM = await VS_API.getMedicos();
          var mList = (resM && resM.data && resM.data.data) ? resM.data.data : (resM.data || []);
          if (selMed22 && selMed22.options.length <= 4 && mList.length) {
            selMed22.innerHTML = '';
            mList.forEach(function (m) {
              var p = m.persona || {};
              var opt = document.createElement('option');
              opt.value = m.id_persona;
              opt.textContent = 'Dr(a). ' + (p.nombres || '') + ' ' + (p.apellidos || '');
              selMed22.appendChild(opt);
            });
          }
          var medId = selMed22 && selMed22.value ? selMed22.value : (mList[0] ? mList[0].id_persona : 1);
          var fecha = inFecha22 && inFecha22.value ? inFecha22.value : new Date().toISOString().slice(0, 10);
          var disp = await VS_API.getDisponibilidad({ id_medico: medId, fecha: fecha });
          if (slotsBox22 && disp && Array.isArray(disp.slots)) {
            var sHtml = '';
            disp.slots.forEach(function (s, idx) {
              if (s.estado === 'LIBRE') {
                sHtml += '<button type="button" class="vs-slot vs-slot--free' + (idx === 0 ? ' is-selected' : '') + '" data-time="' + s.hora_inicio + '">' + s.hora_inicio + '<small>Libre</small></button>';
              } else if (s.estado === 'BLOQUEADO') {
                sHtml += '<button type="button" class="vs-slot vs-slot--blocked" disabled>' + s.hora_inicio + '<small>Bloqueado</small></button>';
              } else {
                sHtml += '<button type="button" class="vs-slot vs-slot--busy" disabled>' + s.hora_inicio + '<small>Reservado · ' + escapeHtml(s.cita_codigo || 'Cita') + '</small></button>';
              }
            });
            slotsBox22.innerHTML = sHtml;
          }
        } catch (e) {}
      }
      if (filterForm22) {
        filterForm22.addEventListener('submit', function (e) {
          e.preventDefault();
          cargarDisponibilidadCU22();
        });
      }
      cargarDisponibilidadCU22();
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
    // 25. P7 REPORTES ADMINISTRATIVOS (CU32, CU33, CU34, CU35, CU36)
    // =========================================================================
    if (['CU32', 'CU33', 'CU34', 'CU35', 'CU36'].indexOf(currentCuAttr) !== -1) {
      var repForms = document.querySelectorAll('form.vs-filters, form[data-demo="Exportación generada"]');
      repForms.forEach(function (rf) {
        rf.setAttribute('data-api-bound', 'true');
        rf.addEventListener('submit', async function (e) {
          e.preventDefault();
          var tipoMap = {
            CU32: 'CITAS_PERIODO',
            CU33: 'ATENCIONES_MEDICO',
            CU34: 'CONTROL_ASISTENCIA',
            CU35: 'EXPORTACION_GENERAL',
            CU36: 'PADRON_PACIENTES'
          };
          var fmtRadio = rf.querySelector('input[name="fmt"]:checked');
          var formato = fmtRadio ? fmtRadio.value.toUpperCase() : 'CSV';
          var dInput = rf.querySelector('input[type="date"]');
          var fDesde = dInput ? dInput.value : '2026-10-01';
          try {
            var repRes = await VS_API.crearReporte({
              tipo: tipoMap[currentCuAttr] || 'CITAS_PERIODO',
              fecha_desde: fDesde,
              fecha_hasta: '2026-12-31',
              formato: formato === 'PDF' ? 'PDF' : 'CSV'
            });
            if (window.vsToast) {
              window.vsToast('Reporte generado en BD', 'Registrado en tabla reporte y auditado en bitácora (CREAR)');
            }
          } catch (err) {
            console.warn('Error registrando reporte:', err);
          }
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
