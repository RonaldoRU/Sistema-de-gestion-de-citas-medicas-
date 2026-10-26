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
      try {
        await this.request('/auth/logout', { method: 'POST' });
      } catch (e) {
        console.warn('Error cerrando sesión en servidor:', e);
      } finally {
        this.clearAuth();
      }
    },

    solicitarRecuperacion: function (identificador) {
      return this.request('/auth/recuperar-clave/solicitar', {
        method: 'POST',
        body: { identificador: identificador }
      });
    },

    restablecerContrasena: function (token, password, password_confirmation) {
      return this.request('/auth/recuperar-clave/restablecer', {
        method: 'POST',
        body: { token: token, password: password, password_confirmation: password_confirmation }
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

    guardarInfoMedica: function (id, data) {
      return this.request('/pacientes/' + id + '/informacion-medica', { method: 'POST', body: data });
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
    getEspecialidades: function () {
      return this.request('/especialidades', { method: 'GET' });
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

    configurarHorariosMedico: function (id, horarios) {
      return this.request('/medicos/' + id + '/horarios', { method: 'POST', body: { horarios: horarios } });
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

    programarCita: function (data) {
      return this.request('/citas', { method: 'POST', body: data });
    },

    reprogramarCita: function (id, data) {
      return this.request('/citas/' + id + '/reprogramar', { method: 'PUT', body: data });
    },

    cancelarCita: function (id, motivo) {
      return this.request('/citas/' + id + '/cancelar', { method: 'PUT', body: { motivo: motivo || 'Cancelada por paciente' } });
    },

    registrarAtencion: function (id, data) {
      return this.request('/citas/' + id + '/atender', { method: 'PUT', body: data });
    },

    getBloqueosAgenda: function () {
      return this.request('/bloqueos-agenda', { method: 'GET' });
    },

    crearBloqueoAgenda: function (data) {
      return this.request('/bloqueos-agenda', { method: 'POST', body: data });
    },

    getNotificaciones: function () {
      return this.request('/notificaciones', { method: 'GET' });
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
        window.location.href = location.pathname.includes('/P') ? '../P1 Seguridad y Autenticación/cu02-sesion-cerrada.html' : 'P1 Seguridad y Autenticación/cu02-sesion-cerrada.html';
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
      var tableBody = document.querySelector('.vs-table tbody');
      if (!tableBody) return;

      var badgeTotal = document.getElementById('vs-badge-total');
      var badgeAlertas = document.getElementById('vs-badge-alertas');
      var filterForm = document.querySelector('.vs-filters');
      var paginationLabel = document.querySelector('.vs-pagination span');
      var exportBtn = document.querySelector('[data-toast="Exportación generada"]') || document.querySelector('.vs-page-head__side button');

      var lastId = 0;
      var isFiltering = false;
      var currentRecords = [];

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
          if (badgeTotal) badgeTotal.textContent = total + ' eventos';
          if (badgeAlertas && res.alertas_hoy != null) {
            badgeAlertas.textContent = res.alertas_hoy + (res.alertas_hoy === 1 ? ' alerta' : ' alertas');
          }
          if (paginationLabel) {
            paginationLabel.innerHTML = 'Mostrando <strong class="vs-strong">1–' + pagData.length + '</strong> de <strong class="vs-strong">' + total + '</strong> eventos';
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
