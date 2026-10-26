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
    var path = (location.pathname || '').replace(/\\/g, '/');
    var idx = path.indexOf('/citamedicaclinicavidasalud');
    if (idx !== -1) {
      return path.substring(0, idx) + '/citamedicaclinicavidasalud/citamedicaclinicavidasalud/public/api';
    }
    // Si corre en localhost:8000 o servidor raíz
    return '/api';
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
  document.addEventListener('DOMContentLoaded', function () {
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
    var loginForm = document.querySelector('body[data-cu="CU01"] .vs-form, .vs-auth .vs-form');
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

          // Redirección al panel principal
          setTimeout(function () {
            window.location.href = '../inicio.html';
          }, 400);
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

    // 5. Vincular Bitácora de Auditoría (CU11)
    var cu11Page = document.querySelector('body[data-cu="CU11"]');
    if (cu11Page) {
      cargarBitacora();
    }

    async function cargarBitacora() {
      var tableBody = document.querySelector('.vs-table tbody');
      if (!tableBody) return;

      try {
        var res = await VS_API.getBitacora();
        var logs = res.data || res || [];
        if (!Array.isArray(logs) || !logs.length) return;

        var html = '';
        logs.forEach(function (item) {
          var usuario = item.usuario ? (item.usuario.nombre_usuario || 'Sistema') : 'Sistema';
          var accion = item.accion || 'OPERACION';
          var accionBadge = accion.includes('LOGIN') ? 'vs-badge--ok' : (accion.includes('BLOQUEO') ? 'vs-badge--danger' : 'vs-badge--info');

          html += '<tr>' +
            '<td class="vs-td-num">' + (item.fecha_hora || item.created_at || '—') + '</td>' +
            '<td><div class="vs-cell-person__name">' + usuario + '</div><div class="vs-cell-person__sub vs-mono">IP: ' + (item.ip_origen || '127.0.0.1') + '</div></td>' +
            '<td><span class="vs-badge vs-badge--muted">' + (item.modulo || 'GENERAL') + '</span></td>' +
            '<td><span class="vs-badge ' + accionBadge + '">' + accion + '</span></td>' +
            '<td><div class="vs-xs">' + (item.descripcion || '—') + '</div></td>' +
            '</tr>';
        });

        if (html) tableBody.innerHTML = html;
      } catch (e) {
        console.warn('Error cargando bitácora:', e);
      }
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
      } catch (e) {
        console.warn('Citas para dashboard:', e);
      }
    }
  });
})();
