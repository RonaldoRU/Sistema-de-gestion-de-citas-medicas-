/**
 * Vida Salud — Cliente API REST para Nueva Interfaz
 * Conexión completa y dinámica con backend Laravel / PostgreSQL / MySQL.
 * Sin datos hardcodeados ni mocks.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.VS_API = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TOKEN_KEY = 'vs_token';
  var USER_KEY = 'vs_user';

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

  var client = {
    base: API_BASE,

    getToken: function () {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
    },

    setToken: function (token, remember) {
      if (!token) {
        this.clearAuth();
        return;
      }
      if (remember) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
    },

    getUser: function () {
      try {
        var u = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
        if (!u) return null;
        return JSON.parse(u);
      } catch (e) {
        return null;
      }
    },

    setUser: function (user, remember) {
      if (!user) {
        this.clearAuth();
        return;
      }
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

    isAuthenticated: function () {
      return !!(this.getToken() && this.getUser());
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
      }

      var body = options.body;
      if (body && typeof body === 'object' && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
      }

      var fetchOptions = {
        method: options.method || 'GET',
        headers: headers,
        body: body
      };

      var response = await fetch(url, fetchOptions);
      var json = null;
      var text = await response.text();
      try {
        json = text ? JSON.parse(text) : {};
      } catch (e) {
        json = { message: text || 'Respuesta no válida del servidor' };
      }

      if (!response.ok) {
        if (response.status === 401) {
          client.clearAuth();
          if (typeof window !== 'undefined' && window.$ && window.$('#login') && window.$('#app')) {
            window.$('#login').style.display = 'grid';
            window.$('#app').style.display = 'none';
          }
        }
        var errMsg = (json && (json.message || json.error)) || ('Error HTTP ' + response.status);
        if (json && json.errors && typeof json.errors === 'object') {
          var details = Object.values(json.errors).flat().join(' ');
          if (details) errMsg += ': ' + details;
        }
        var error = new Error(errMsg);
        error.status = response.status;
        error.response = json;
        throw error;
      }

      return json;
    },

    // ---------- P1: Autenticación ----------
    auth: {
      login: async function (identificador, password, remember) {
        var res = await client.request('/auth/login', {
          method: 'POST',
          body: { identificador: identificador, password: password, remember: !!remember }
        });
        if (res.token) client.setToken(res.token, remember);
        if (res.usuario) client.setUser(res.usuario, remember);
        return res;
      },
      logout: async function () {
        var res = null;
        try {
          var u = client.getUser();
          res = await client.request('/auth/logout', {
            method: 'POST',
            body: u ? { id_usuario: u.id_usuario, usuario: u.nombre_usuario } : {}
          });
        } catch (e) {
        } finally {
          client.clearAuth();
        }
        return res;
      },
      me: function () {
        return client.request('/auth/me');
      },
      solicitarRecuperacion: function (identificador) {
        return client.request('/auth/recuperar-clave/solicitar', {
          method: 'POST',
          body: { identificador: identificador }
        });
      },
      restablecer: function (codigo, password, password_confirmation) {
        return client.request('/auth/recuperar-clave/restablecer', {
          method: 'POST',
          body: { token: codigo, codigo: codigo, password: password, password_confirmation: password_confirmation }
        });
      },
      autoregistro: function (data) {
        return client.request('/auth/autoregistro-paciente', {
          method: 'POST',
          body: data
        });
      }
    },

    // ---------- P2: Usuarios y Roles ----------
    usuarios: {
      listar: function (params) {
        var q = params ? '?' + new URLSearchParams(params).toString() : '';
        return client.request('/usuarios' + q);
      },
      obtener: function (id) {
        return client.request('/usuarios/' + id);
      },
      crear: function (data) {
        return client.request('/usuarios', { method: 'POST', body: data });
      },
      actualizar: function (id, data) {
        return client.request('/usuarios/' + id, { method: 'PUT', body: data });
      },
      cambiarRol: function (id, id_rol, motivo) {
        return client.request('/usuarios/' + id + '/cambiar-rol', {
          method: 'PUT',
          body: { id_rol: id_rol, motivo: motivo || 'Cambio de rol administrativo' }
        });
      },
      inactivar: function (id, motivo) {
        return client.request('/usuarios/' + id + '/inactivar', {
          method: 'PUT',
          body: { motivo: motivo || 'Inactivación de cuenta' }
        });
      },
      reactivar: function (id) {
        return client.request('/usuarios/' + id + '/reactivar', { method: 'PUT' });
      }
    },

    roles: {
      listar: function () {
        return client.request('/roles');
      },
      permisos: function (id) {
        return client.request('/roles/' + id + '/permisos');
      },
      listarPermisos: function () {
        return client.request('/permisos');
      },
      sincronizarPermisos: function (idRol, permisosIds) {
        return client.request('/roles/' + idRol + '/permisos', {
          method: 'PUT',
          body: { permisos: permisosIds }
        });
      }
    },

    // ---------- P3: Auditoría y Bitácora ----------
    bitacora: {
      listar: function (params) {
        var q = params ? '?' + new URLSearchParams(params).toString() : '';
        return client.request('/bitacora' + q);
      },
      live: function (params) {
        var q = params ? '?' + new URLSearchParams(params).toString() : '';
        return client.request('/bitacora/live' + q);
      },
      resumen: function () {
        return client.request('/bitacora/resumen');
      }
    },

    // ---------- P4: Pacientes ----------
    pacientes: {
      listar: function (params) {
        var q = params ? '?' + new URLSearchParams(params).toString() : '';
        return client.request('/pacientes' + q);
      },
      obtener: function (id) {
        return client.request('/pacientes/' + id);
      },
      crear: function (data) {
        return client.request('/pacientes', { method: 'POST', body: data });
      },
      actualizar: function (id, data) {
        return client.request('/pacientes/' + id, { method: 'PUT', body: data });
      },
      inactivar: function (id, motivo) {
        return client.request('/pacientes/' + id + '/inactivar', {
          method: 'PUT',
          body: { motivo: motivo || 'Baja lógica' }
        });
      },
      reactivar: function (id) {
        return client.request('/pacientes/' + id + '/reactivar', { method: 'PUT' });
      },
      getInfoMedica: function (id) {
        return client.request('/pacientes/' + id + '/informacion-medica');
      },
      guardarInfoMedica: function (id, data) {
        return client.request('/pacientes/' + id + '/informacion-medica', { method: 'POST', body: data });
      },
      getContactos: function (id) {
        return client.request('/pacientes/' + id + '/contactos-emergencia');
      },
      agregarContacto: function (id, data) {
        return client.request('/pacientes/' + id + '/contactos-emergencia', { method: 'POST', body: data });
      },
      eliminarContacto: function (id, contactoId) {
        return client.request('/pacientes/' + id + '/contactos-emergencia/' + contactoId, { method: 'DELETE' });
      },
      historialCitas: function (id) {
        return client.request('/pacientes/' + id + '/historial-citas');
      }
    },

    // ---------- P5: Gestión Médica y Horarios ----------
    especialidades: {
      listar: function (params) {
        var q = params ? '?' + new URLSearchParams(params).toString() : '';
        return client.request('/especialidades' + q);
      },
      crear: function (data) {
        return client.request('/especialidades', { method: 'POST', body: data });
      },
      actualizar: function (id, data) {
        return client.request('/especialidades/' + id, { method: 'PUT', body: data });
      },
      eliminar: function (id) {
        return client.request('/especialidades/' + id, { method: 'DELETE' });
      }
    },

    medicos: {
      listar: function (params) {
        var q = params ? '?' + new URLSearchParams(params).toString() : '';
        return client.request('/medicos' + q);
      },
      obtener: function (id) {
        return client.request('/medicos/' + id);
      },
      crear: function (data) {
        return client.request('/medicos', { method: 'POST', body: data });
      },
      actualizar: function (id, data) {
        return client.request('/medicos/' + id, { method: 'PUT', body: data });
      },
      inactivar: function (id, motivo) {
        return client.request('/medicos/' + id + '/inactivar', {
          method: 'PUT',
          body: { motivo: motivo || 'Baja médica' }
        });
      },
      reactivar: function (id) {
        return client.request('/medicos/' + id + '/reactivar', { method: 'PUT' });
      },
      getHorarios: function (id) {
        return client.request('/medicos/' + id + '/horarios');
      },
      guardarHorarios: function (id, data) {
        return client.request('/medicos/' + id + '/horarios', {
          method: 'POST',
          body: data
        });
      },
      eliminarHorario: function (id, horarioId) {
        return client.request('/medicos/' + id + '/horarios/' + horarioId, {
          method: 'DELETE'
        });
      }
    },

    bloqueos: {
      listar: function () {
        return client.request('/bloqueos-agenda');
      },
      crear: function (data) {
        return client.request('/bloqueos-agenda', { method: 'POST', body: data });
      },
      eliminar: function (id) {
        return client.request('/bloqueos-agenda/' + id, { method: 'DELETE' });
      }
    },

    // ---------- P6: Citas Médicas ----------
    citas: {
      listar: function (params) {
        var q = params ? '?' + new URLSearchParams(params).toString() : '';
        return client.request('/citas' + q);
      },
      disponibilidad: function (params) {
        var q = params ? '?' + new URLSearchParams(params).toString() : '';
        return client.request('/citas/disponibilidad' + q);
      },
      proximoLibre: function (params) {
        var q = params ? '?' + new URLSearchParams(params).toString() : '';
        return client.request('/citas/proximo-libre' + q);
      },
      crear: function (data) {
        return client.request('/citas', { method: 'POST', body: data });
      },
      reprogramar: function (id, data) {
        return client.request('/citas/' + id + '/reprogramar', { method: 'PUT', body: data });
      },
      cancelar: function (id, motivo) {
        return client.request('/citas/' + id + '/cancelar', {
          method: 'PUT',
          body: { motivo: motivo || 'Cancelación justificada' }
        });
      },
      atender: function (id, data) {
        return client.request('/citas/' + id + '/atender', { method: 'PUT', body: data || {} });
      },
      cambiarEstado: function (id, estado, observaciones) {
        return client.request('/citas/' + id + '/estado', {
          method: 'PUT',
          body: { estado: estado, observaciones: observaciones || '' }
        });
      },
      historialEstados: function (id) {
        return client.request('/citas/' + id + '/historial-estados');
      }
    },

    notificaciones: {
      listar: function () {
        return client.request('/notificaciones');
      },
      regenerar: function () {
        return client.request('/notificaciones/regenerar', { method: 'POST' });
      },
      gestionar: function (id, accion) {
        return client.request('/notificaciones/' + id + '/gestion', {
          method: 'PUT',
          body: { accion: accion }
        });
      }
    },

    // ---------- P8: Pagos y Reembolsos ----------
    pagos: {
      listar: function (params) {
        var q = params ? '?' + new URLSearchParams(params).toString() : '';
        return client.request('/pagos' + q);
      },
      obtener: function (id) {
        return client.request('/pagos/' + id);
      },
      crear: function (data) {
        return client.request('/pagos', { method: 'POST', body: data });
      },
      reembolsar: function (id, motivo) {
        return client.request('/pagos/' + id + '/reembolso', {
          method: 'POST',
          body: { motivo: motivo || 'Reembolso por cancelación justificada' }
        });
      },
      crearSesionStripe: function (idCita, monto) {
        return client.request('/pagos/stripe/crear-sesion', {
          method: 'POST',
          body: { id_cita: idCita, monto: monto }
        });
      }
    },

    // ---------- Reportes Administrativos ----------
    reportes: {
      obtener: function (tipo, params) {
        var data = Object.assign({ tipo: tipo, tipo_reporte: tipo }, params || {});
        return client.request('/reportes', { method: 'POST', body: data }).then(function (res) {
          return res.resultado || res.data || res;
        });
      }
    }
  };

  return client;
}));

