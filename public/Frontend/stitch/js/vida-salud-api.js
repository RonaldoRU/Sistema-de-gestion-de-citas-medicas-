/* =====================================================================
   Vida Salud — Conector de API y Enlace de Backend
   Integra el frontend Stitch (P1–P7) con los controladores de Laravel API.
   Compatible con sesiones de navegador y tokens Bearer.
   ===================================================================== */
(function () {
  'use strict';

  var TOKEN_KEY = 'vs_token';
  var USER_KEY = 'vs_user';

  // Detección automática de la URL base de la API
  function resolveApiBase() {
    var origin = location.origin;
    var path = (location.pathname || '').replace(/\\/g, '/');
    var lower = path.toLowerCase();
    var idx = lower.indexOf('/frontend');
    if (idx > 0) {
      return origin + path.substring(0, idx).replace(/\/$/, '') + '/api';
    }
    return origin + '/api';
  }

  var API_BASE = resolveApiBase();

  var VS_API = {
    base: API_BASE,

    getToken: function () {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
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
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
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
          if (res.status === 401 && !location.pathname.includes('cu01-iniciar-sesion')) {
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
        body: { motivo: motivo }
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
      return this.request('/pacientes/' + id + '/inactivar', { method: 'PUT', body: { motivo: motivo } });
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
      return this.request('/medicos/' + id + '/inactivar', { method: 'PUT', body: { motivo: motivo } });
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
      return this.request('/citas/' + id + '/cancelar', { method: 'PUT', body: { motivo: motivo } });
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
     SINCRONIZACIÓN AUTOMÁTICA DE VISTAS (DOM Ready)
     ===================================================================== */
  function initApp() {
    // 1. Sincronizar barra superior con el usuario logueado
    var currentUser = VS_API.getUser();
    if (currentUser) {
      var nombreEl = document.querySelector('.vs-user__name');
      var rolEl = document.querySelector('.vs-user__role');
      var avatarEl = document.querySelector('.vs-avatar');

      var fullName = (currentUser.nombres ? (currentUser.nombres + ' ' + (currentUser.apellidos || '')) : currentUser.nombre_usuario) || 'Usuario';
      var rolName = currentUser.rol || 'Personal';

      if (nombreEl) nombreEl.textContent = fullName;
      if (rolEl) rolEl.textContent = rolName;

      if (avatarEl) {
        var initials = (currentUser.nombres ? currentUser.nombres.charAt(0) : '') + (currentUser.apellidos ? currentUser.apellidos.charAt(0) : '');
        if (!initials) initials = (currentUser.nombre_usuario || 'U').substring(0, 2).toUpperCase();
        avatarEl.textContent = initials.toUpperCase();
        avatarEl.title = fullName + ' (' + rolName + ')';
      }
    }

    // 2. Interceptar botón de cerrar sesión
    document.querySelectorAll('[data-logout]').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        e.preventDefault();
        try {
          await VS_API.logout();
        } catch (err) {}
        // Calcular ruta a cu02-sesion-cerrada.html
        var path = location.pathname.replace(/\\/g, '/');
        var target = path.includes('/P') ? '../P1 Seguridad y Autenticación/cu02-sesion-cerrada.html' : 'P1 Seguridad y Autenticación/cu02-sesion-cerrada.html';
        window.location.href = target;
      });
    });

    // 3. Vincular pantalla de Inicio de Sesión (CU01)
    var loginForm = document.getElementById('form-login') || document.querySelector('body[data-cu="CU01"] .vs-form, .vs-auth .vs-form, form.vs-form');
    if (loginForm && !loginForm.getAttribute('data-bound')) {
      loginForm.setAttribute('data-bound', 'true');
      var userInput = loginForm.querySelector('#usuario, input[name="usuario"], input[name="identificador"]');
      var passInput = loginForm.querySelector('#clave, input[name="clave"], input[name="password"]');
      var remInput = loginForm.querySelector('input[name="recordar"]');
      var alertBox = document.querySelector('.vs-alert--danger');
      var alertBody = alertBox ? alertBox.querySelector('.vs-alert__body') : null;

      // Ocultar la alerta de ejemplo al inicio
      if (alertBox) alertBox.style.display = 'none';

      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var idVal = userInput ? userInput.value.trim() : '';
        var passVal = passInput ? passInput.value : '';
        var remVal = remInput ? remInput.checked : false;

        if (!idVal || !passVal) {
          if (alertBox && alertBody) {
            alertBody.innerHTML = '<span class="vs-alert__title">Campos incompletos</span>Por favor ingresa usuario y contraseña.';
            alertBox.style.display = 'flex';
          }
          return;
        }

        var submitBtn = loginForm.querySelector('button[type="submit"]');
        var origText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Verificando credenciales...';
        }

        try {
          var res = await VS_API.login(idVal, passVal, remVal);
          if (alertBox) alertBox.style.display = 'none';
          
          if (window.vsToast) {
            window.vsToast('Bienvenido al sistema', (res.usuario ? res.usuario.nombres : ''));
          }

          setTimeout(function () {
            var target = location.pathname.includes('/P1') ? '../inicio.html' : 'inicio.html';
            window.location.href = target;
          }, 300);
        } catch (err) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
          if (alertBox && alertBody) {
            var msg = (err.data && err.data.message) ? err.data.message : err.message;
            alertBody.innerHTML = '<span class="vs-alert__title">Error de autenticación</span>' + msg;
            alertBox.style.display = 'flex';
          } else {
            alert(err.message || 'Credenciales inválidas');
          }
        }
      });
    }

    // 4. Vincular Catálogo de Usuarios (CU06)
    var cu06Page = document.querySelector('body[data-cu="CU06"]');
    if (cu06Page) {
      cargarCatalogoUsuarios();
    }

    async function cargarCatalogoUsuarios() {
      var tableBody = document.querySelector('.vs-table tbody');
      if (!tableBody) return;

      try {
        var res = await VS_API.getUsuarios();
        var usuarios = res.data || res || [];
        if (!Array.isArray(usuarios)) return;

        // Actualizar KPIs si existen
        var totalKpi = document.querySelector('.vs-grid--4 article:nth-child(1) .vs-kpi__value');
        var medKpi = document.querySelector('.vs-grid--4 article:nth-child(2) .vs-kpi__value');
        var recepKpi = document.querySelector('.vs-grid--4 article:nth-child(3) .vs-kpi__value');
        var admKpi = document.querySelector('.vs-grid--4 article:nth-child(4) .vs-kpi__value');

        var total = usuarios.length;
        var med = 0, rec = 0, adm = 0;

        var html = '';
        usuarios.forEach(function (u) {
          var rol = (u.rol ? (u.rol.nombre || u.rol) : '').toUpperCase();
          if (rol.includes('MEDIC')) med++;
          else if (rol.includes('RECEP')) rec++;
          else if (rol.includes('ADMIN')) adm++;

          var pers = u.persona || {};
          var nombre = (pers.nombres ? (pers.nombres + ' ' + (pers.apellidos || '')) : u.nombre_usuario) || 'Sin nombre';
          var ci = pers.ci || '—';
          var email = pers.email || '—';
          var tel = pers.telefono || '—';
          var estado = (u.estado || 'ACTIVO').toUpperCase();
          var estadoBadge = estado === 'ACTIVO' ? 'vs-badge--ok' : (estado === 'BLOQUEADO' ? 'vs-badge--danger' : 'vs-badge--muted');
          var rolBadge = rol.includes('ADMIN') ? 'vs-badge--warn' : (rol.includes('RECEP') ? 'vs-badge--info' : 'vs-badge--teal');
          var initials = (pers.nombres ? pers.nombres.charAt(0) : '') + (pers.apellidos ? pers.apellidos.charAt(0) : u.nombre_usuario.charAt(0));

          html += '<tr>' +
            '<td class="vs-td-num">' + ci + '</td>' +
            '<td><div class="vs-cell-person"><span class="vs-avatar vs-avatar--sm">' + initials.toUpperCase() + '</span>' +
            '<div><div class="vs-cell-person__name">' + nombre + '</div><div class="vs-cell-person__sub vs-mono">' + u.nombre_usuario + '</div></div></div></td>' +
            '<td class="vs-hide-md"><div class="vs-xs">' + email + '</div><div class="vs-xs vs-muted vs-mono">' + tel + '</div></td>' +
            '<td><span class="vs-badge ' + rolBadge + '">' + (u.rol?.nombre || rol) + '</span></td>' +
            '<td><span class="vs-badge ' + estadoBadge + '"><span class="vs-badge__dot"></span>' + estado + '</span></td>' +
            '<td class="vs-hide-md vs-td-num">' + (u.ultimo_acceso ? u.ultimo_acceso.substring(0, 16) : 'Nunca') + '</td>' +
            '<td class="vs-td-actions">' +
            '<a href="cu07-modificar-cuenta.html?id=' + u.id_usuario + '" class="vs-icon-btn" title="Modificar cuenta"><svg class="vs-i"><use href="#i-edit"/></svg></a>' +
            '<a href="cu08-roles-permisos.html?id=' + u.id_usuario + '" class="vs-icon-btn vs-icon-btn--warn" title="Cambiar rol"><svg class="vs-i"><use href="#i-shield"/></svg></a>' +
            '<a href="cu09-suspender-cuenta.html?id=' + u.id_usuario + '" class="vs-icon-btn vs-icon-btn--danger" title="Inactivar cuenta"><svg class="vs-i"><use href="#i-ban"/></svg></a>' +
            '</td>' +
            '</tr>';
        });

        if (totalKpi) totalKpi.textContent = total;
        if (medKpi) medKpi.textContent = med;
        if (recepKpi) recepKpi.textContent = rec;
        if (admKpi) admKpi.textContent = adm;

        if (html) tableBody.innerHTML = html;
      } catch (e) {
        console.warn('Error cargando catálogo de usuarios:', e);
      }
    }

    // =========================================================================
    // 5. BITÁCORA DE AUDITORÍA EN VIVO (CU10, CU11 y Stitch)
    // =========================================================================

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

    function getBadgeAccion(accion) {
      var a = (accion || '').toUpperCase();
      if (a.includes('LOGIN')) return '<span class="vs-badge vs-badge--ok vs-badge--mono">LOGIN</span>';
      if (a.includes('LOGOUT')) return '<span class="vs-badge vs-badge--muted vs-badge--mono">LOGOUT</span>';
      if (a.includes('BLOQUEO')) return '<span class="vs-badge vs-badge--danger vs-badge--mono">BLOQUEO</span>';
      if (a.includes('ELIMINAR')) return '<span class="vs-badge vs-badge--warn vs-badge--mono">ELIMINAR</span>';
      if (a.includes('MODIFICAR')) return '<span class="vs-badge vs-badge--cyan vs-badge--mono">MODIFICAR</span>';
      return '<span class="vs-badge vs-badge--info vs-badge--mono">' + (a || 'CREAR') + '</span>';
    }

    function mostrarModalDetalle(rec) {
      var modalId = 'vs-bitacora-modal';
      var oldModal = document.getElementById(modalId);
      if (oldModal) oldModal.remove();

      var usuarioStr = rec.usuario ? (rec.usuario.nombre_usuario || 'Usuario #' + rec.id_usuario) : 'Sistema';
      var rolStr = rec.usuario && rec.usuario.rol ? rec.usuario.rol.nombre : '—';
      var detalleFormateado = rec.detalle || 'Sin detalle adicional';

      var modalHtml = '<div id="' + modalId + '" style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);padding:1rem;">' +
        '<div style="background:#fff;border-radius:14px;max-width:640px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;border:1px solid #e2e8f0;display:flex;flex-direction:column;max-height:90vh;">' +
          '<div style="padding:1.25rem 1.5rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:between;">' +
            '<div style="display:flex;align-items:center;gap:0.75rem;">' +
              '<span class="vs-live"><i></i>En vivo</span>' +
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
            '<button type="button" id="vs-modal-close-btn" class="vs-btn vs-btn--primary" style="padding:0.4rem 1.2rem;font-size:0.875rem;">Cerrar</button>' +
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

    // --- CU11: Consultar bitácora en vivo ---
    var cu11Page = document.querySelector('body[data-cu="CU11"]');
    if (cu11Page) {
      initBitacoraCU11();
    }

    function initBitacoraCU11() {
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
              newRows += buildRowHtml(newItem, true);
            });

            if (newRows) {
              var emptyRow = tableBody.querySelector('.vs-td-empty');
              if (emptyRow) tableBody.innerHTML = '';
              tableBody.insertAdjacentHTML('afterbegin', newRows);
            }

            if (liveRes.kpis) {
              if (badgeTotal && liveRes.kpis.total_hoy != null) {
                badgeTotal.textContent = liveRes.kpis.total_hoy + ' eventos';
              }
              if (badgeAlertas && liveRes.kpis.alertas_hoy != null) {
                badgeAlertas.textContent = liveRes.kpis.alertas_hoy + (liveRes.kpis.alertas_hoy === 1 ? ' alerta' : ' alertas');
              }
            }
          }
        } catch (err) {}
      }, 3000);

      // Ver detalle al hacer click
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

      // Exportar CSV
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
          link.setAttribute('download', 'bitacora_vida_salud_' + new Date().toISOString().slice(0, 10) + '.csv');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      cargarBitacora();
    }

    // --- CU10: Registro automático y Dashboard en vivo ---
    var cu10Page = document.querySelector('body[data-cu="CU10"]');
    if (cu10Page) {
      initBitacoraCU10();
    }

    function initBitacoraCU10() {
      var kpiHoy = document.getElementById('kpi-hoy');
      var kpiHoyHint = document.getElementById('kpi-hoy-hint');
      var kpiMes = document.getElementById('kpi-mes');
      var kpiAlertas = document.getElementById('kpi-alertas');
      var timelineEl = document.getElementById('bitacora-timeline');
      var barsEl = document.getElementById('bitacora-bars');

      async function actualizarCU10() {
        try {
          var liveRes = await VS_API.getBitacoraLive({ limit: 8 });
          var resumenRes = await VS_API.getBitacoraResumen();

          if (liveRes && liveRes.kpis) {
            var k = liveRes.kpis;
            if (kpiHoy) kpiHoy.textContent = k.total_hoy != null ? k.total_hoy : '0';
            if (kpiHoyHint) {
              var seg = k.segundos_desde_ultimo || 0;
              kpiHoyHint.textContent = seg < 60 ? ('Último hace ' + seg + ' segundos') : ('Último hace ' + Math.floor(seg / 60) + ' min');
            }
            if (kpiMes) kpiMes.textContent = k.total_mes != null ? k.total_mes : '0';
            if (kpiAlertas) kpiAlertas.textContent = k.alertas_hoy != null ? k.alertas_hoy : '0';
          }

          var events = (liveRes && liveRes.data && liveRes.data.length) ? liveRes.data : ((resumenRes && resumenRes.resumen && resumenRes.resumen.ultimos_eventos) || []);
          if (timelineEl && events.length) {
            var tlHtml = '';
            events.slice(0, 6).forEach(function (ev) {
              var act = (ev.tipo_accion || 'CREAR').toUpperCase();
              var cls = 'vs-tl-item--info';
              if (act.includes('LOGIN') || act.includes('ATENDIDA') || act.includes('CONFIRMADA')) cls = 'vs-tl-item--ok';
              else if (act.includes('BLOQUEO') || act.includes('ELIMINAR')) cls = 'vs-tl-item--danger';
              else if (act.includes('FALLIDO') || act.includes('CANCEL')) cls = 'vs-tl-item--warn';

              var timeStr = '—';
              try {
                var d = new Date(ev.fecha_hora);
                timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
              } catch (e) {}

              var usr = ev.usuario ? (ev.usuario.nombre_usuario || 'Sistema') : 'Sistema';
              var title = act + (ev.tabla_afectada ? ' · ' + ev.tabla_afectada : '');
              var sub = usr + ' · ' + (ev.detalle || 'Acción registrada');

              tlHtml += '<li class="vs-tl-item ' + cls + '">' +
                '<span class="vs-tl-time">' + timeStr + '</span>' +
                '<div class="vs-tl-title">' + escapeHtml(title) + '</div>' +
                '<div class="vs-tl-sub">' + escapeHtml(sub) + '</div>' +
                '</li>';
            });
            timelineEl.innerHTML = tlHtml;
          }

          if (barsEl && resumenRes && resumenRes.resumen && resumenRes.resumen.por_accion) {
            var arr = resumenRes.resumen.por_accion;
            var maxVal = Math.max.apply(null, arr.map(function (x) { return parseInt(x.total, 10); })) || 1;
            var barsHtml = '';
            var colorMap = {
              'CREAR': '',
              'MODIFICAR': 'vs-bar--cyan',
              'LOGIN': 'vs-bar--teal',
              'LOGOUT': 'vs-bar--teal',
              'ELIMINAR': 'vs-bar--amber',
              'BLOQUEO': 'vs-bar--rose'
            };
            arr.forEach(function (item) {
              var count = parseInt(item.total, 10);
              var pct = Math.min(100, Math.round((count / maxVal) * 100));
              var col = colorMap[item.tipo_accion] || '';
              barsHtml += '<div class="vs-bars__row">' +
                '<span class="vs-bars__label">' + escapeHtml(item.tipo_accion) + '</span>' +
                '<div class="vs-bar ' + col + '"><i style="width:' + pct + '%"></i></div>' +
                '<span class="vs-bars__val">' + count + '</span>' +
                '</div>';
            });
            if (barsHtml) barsEl.innerHTML = barsHtml;
          }
        } catch (e) {
          console.warn('Error sincronizando CU10:', e);
        }
      }

      actualizarCU10();
      setInterval(actualizarCU10, 3000);
    }

    // --- Stitch Bitácora de Auditoría ---
    if (location.pathname.includes('bitacora-auditoria-stitch')) {
      initBitacoraStitch();
    }

    function initBitacoraStitch() {
      var tableBody = document.querySelector('table tbody');
      if (!tableBody) return;

      var kpiCards = document.querySelectorAll('.text-3xl.font-extrabold');
      var badgeTotal = document.querySelector('.bg-teal-50\\/70');

      async function actualizarStitch() {
        try {
          var liveRes = await VS_API.getBitacoraLive({ limit: 15 });
          if (!liveRes) return;

          if (liveRes.kpis && kpiCards.length >= 3) {
            var k = liveRes.kpis;
            if (kpiCards[0]) kpiCards[0].textContent = k.total_hoy || '0';
            if (kpiCards[1]) kpiCards[1].textContent = k.total_mes || '0';
            if (kpiCards[2]) kpiCards[2].textContent = k.alertas_hoy || '0';
            if (badgeTotal) badgeTotal.textContent = (k.total_hoy || 0) + ' eventos hoy';
          }

          if (liveRes.data && liveRes.data.length) {
            var html = '';
            liveRes.data.forEach(function (item) {
              var usr = item.usuario ? (item.usuario.nombre_usuario || 'Sistema') : 'Sistema';
              var rol = item.usuario && item.usuario.rol ? item.usuario.rol.nombre : 'Personal';
              var dt = formatFechaHora(item.fecha_hora);

              html += '<tr class="hover:bg-slate-50/40 transition-colors">' +
                '<td class="py-3 px-4 font-medium text-vs-ink whitespace-nowrap">' + dt + '</td>' +
                '<td class="py-3 px-4"><div class="font-semibold text-vs-ink">' + escapeHtml(usr) + '</div><div class="text-slate-500 text-[11px]">' + escapeHtml(rol) + ' · ' + (item.ip || '127.0.0.1') + '</div></td>' +
                '<td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">' + escapeHtml(item.modulo || 'GENERAL') + '</span></td>' +
                '<td class="py-3 px-4">' + getBadgeAccion(item.tipo_accion) + '</td>' +
                '<td class="py-3 px-4 text-slate-600 max-w-xs truncate" title="' + escapeHtml(item.detalle || '') + '">' + escapeHtml(item.detalle || '—') + '</td>' +
                '</tr>';
            });
            tableBody.innerHTML = html;
          }
        } catch (e) {
          console.warn('Error bitácora stitch:', e);
        }
      }

      actualizarStitch();
      setInterval(actualizarStitch, 3000);
    }

    // 6. Actualizar Dashboard Principal (inicio.html)
    var isInicio = document.body.getAttribute('data-page') === 'inicio';
    if (isInicio) {
      cargarDashboardInicio();
    }

    async function cargarDashboardInicio() {
      try {
        // Cargar citas reales de la base de datos
        var citasRes = await VS_API.getCitas();
        var citasList = citasRes.data || citasRes || [];
        if (Array.isArray(citasList) && citasList.length) {
          var kpiCitas = document.querySelector('.vs-kpi:nth-child(1) .vs-kpi__value');
          if (kpiCitas) kpiCitas.textContent = citasList.length;

          var tableBody = document.querySelector('.vs-table tbody');
          if (tableBody) {
            var html = '';
            citasList.slice(0, 6).forEach(function (c) {
              var pac = c.paciente && c.paciente.persona ? (c.paciente.persona.nombres + ' ' + (c.paciente.persona.apellidos || '')) : 'Paciente';
              var med = c.medico && c.medico.persona ? ('Dr. ' + c.medico.persona.apellidos) : 'Médico General';
              var est = c.estado || 'PROGRAMADA';
              var badgeCls = est === 'CONFIRMADA' ? 'vs-badge--cyan' : (est === 'ATENDIDA' ? 'vs-badge--ok' : 'vs-badge--info');

              html += '<tr>' +
                '<td class="vs-td-num">' + (c.hora_inicio ? c.hora_inicio.substring(0, 5) : '08:30') + '</td>' +
                '<td><div class="vs-cell-person__name">' + pac + '</div><div class="vs-cell-person__sub">CM-' + c.id_cita + ' · ' + (c.motivo_consulta || 'Consulta general') + '</div></td>' +
                '<td class="vs-hide-sm">' + med + '</td>' +
                '<td><span class="vs-badge ' + badgeCls + '"><span class="vs-badge__dot"></span>' + est + '</span></td>' +
                '</tr>';
            });
            if (html) tableBody.innerHTML = html;
          }
        }

        // Cargar últimos movimientos de auditoría en vivo en inicio.html
        var timelineEl = document.querySelector('.vs-timeline');
        if (timelineEl) {
          try {
            var bRes = await VS_API.getBitacoraLive({ limit: 4 });
            if (bRes && bRes.data && bRes.data.length) {
              var tHtml = '';
              bRes.data.slice(0, 4).forEach(function (ev) {
                var act = (ev.tipo_accion || 'CREAR').toUpperCase();
                var cls = 'vs-tl-item--info';
                if (act.includes('LOGIN') || act.includes('ATENDIDA') || act.includes('CONFIRMADA')) cls = 'vs-tl-item--ok';
                else if (act.includes('BLOQUEO') || act.includes('ELIMINAR')) cls = 'vs-tl-item--danger';
                else if (act.includes('FALLIDO') || act.includes('CANCEL')) cls = 'vs-tl-item--warn';

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
              if (tHtml) timelineEl.innerHTML = tHtml;
            }
          } catch (eb) {
            console.warn('Auditoría para inicio:', eb);
          }
        }
      } catch (e) {
        console.warn('Citas para dashboard:', e);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
