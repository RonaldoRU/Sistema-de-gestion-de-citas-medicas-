/* =====================================================================
   Vida Salud — interacciones ligeras de los prototipos
   Diálogos, pestañas, toasts de demostración, selección de bloques,
   pasos y validaciones inmediatas. Sin dependencias.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- Toast ---------- */
  var toastTimer = null;

  function showToast(title, sub) {
    var toast = document.getElementById('vs-toast');
    if (!toast) return;
    toast.querySelector('[data-toast-title]').textContent = title || 'Listo';
    var subEl = toast.querySelector('[data-toast-sub]');
    subEl.textContent = sub || '';
    subEl.style.display = sub ? '' : 'none';
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 3600);
  }

  window.vsToast = showToast;

  /* ---------- Diálogos ---------- */
  function openDialog(id) {
    var dlg = document.getElementById(id);
    if (dlg && typeof dlg.showModal === 'function' && !dlg.open) dlg.showModal();
  }

  function closeDialog(dlg) {
    if (dlg && dlg.open) dlg.close();
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open-dialog]');
    if (opener) {
      e.preventDefault();
      openDialog(opener.getAttribute('data-open-dialog'));
      return;
    }
    var closer = e.target.closest('[data-close-dialog]');
    if (closer) {
      e.preventDefault();
      closeDialog(closer.closest('dialog'));
      return;
    }
    /* Clic fuera del contenido cierra el diálogo */
    if (e.target instanceof HTMLDialogElement && e.target.open) {
      var r = e.target.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) e.target.close();
    }
  });

  /* Botones que muestran un toast (y cierran el diálogo donde estén) */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-toast]');
    if (!btn) return;
    if (btn.tagName === 'BUTTON' && btn.getAttribute('type') === 'submit') return; /* lo maneja el form */
    e.preventDefault();
    showToast(btn.getAttribute('data-toast'), btn.getAttribute('data-toast-sub'));
    closeDialog(btn.closest('dialog'));
  });

  /* Formularios de demostración: validan lo nativo y muestran el toast */
  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        form.querySelectorAll('.vs-field').forEach(function (f) {
          var ctrl = f.querySelector('input, select, textarea');
          if (ctrl && !ctrl.checkValidity()) f.classList.add('is-invalid');
        });
        return;
      }
      form.querySelectorAll('.vs-field.is-invalid').forEach(function (f) { f.classList.remove('is-invalid'); });
      var open = form.getAttribute('data-demo-dialog');
      if (open) openDialog(open);
      else showToast(form.getAttribute('data-demo'), form.getAttribute('data-demo-sub'));
      closeDialog(form.closest('dialog'));
    });
    form.querySelectorAll('input, select, textarea').forEach(function (ctrl) {
      ctrl.addEventListener('input', function () {
        var f = ctrl.closest('.vs-field');
        if (f && ctrl.checkValidity()) f.classList.remove('is-invalid');
      });
    });
  });

  /* ---------- Pestañas ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = root.querySelectorAll('[role="tab"]');
    var panels = document.querySelectorAll('[data-panel][data-tabs-for="' + root.getAttribute('data-tabs') + '"]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        if (tab.tagName === 'A' && tab.getAttribute('href') && !tab.getAttribute('data-tab')) return;
        e.preventDefault();
        var key = tab.getAttribute('data-tab');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach(function (p) {
          p.hidden = p.getAttribute('data-panel') !== key;
        });
      });
    });
  });

  /* ---------- Bloques de 30 minutos ---------- */
  document.querySelectorAll('[data-slots]').forEach(function (grid) {
    var summary = document.querySelector('[data-slot-summary="' + grid.getAttribute('data-slots') + '"]');
    var confirm = document.querySelector('[data-slot-confirm="' + grid.getAttribute('data-slots') + '"]');
    grid.querySelectorAll('.vs-slot--free').forEach(function (slot) {
      slot.addEventListener('click', function () {
        var was = slot.classList.contains('is-selected');
        grid.querySelectorAll('.vs-slot').forEach(function (s) {
          s.classList.remove('is-selected');
          s.setAttribute('aria-pressed', 'false');
        });
        if (!was) {
          slot.classList.add('is-selected');
          slot.setAttribute('aria-pressed', 'true');
        }
        var time = was ? null : slot.getAttribute('data-time') || slot.firstChild.textContent.trim();
        if (summary) {
          summary.textContent = time ? time : summary.getAttribute('data-empty') || 'Selecciona un bloque';
          summary.classList.toggle('vs-faint', !time);
        }
        if (confirm) {
          if (confirm.tagName === 'A') {
            confirm.classList.toggle('is-disabled', !time);
            confirm.setAttribute('aria-disabled', !time ? 'true' : 'false');
          } else {
            confirm.disabled = !time;
          }
        }
      });
    });
  });

  /* ---------- Pasos (CU03) ---------- */
  document.querySelectorAll('[data-stepper]').forEach(function (root) {
    var steps = root.querySelectorAll('.vs-step');
    var panels = root.querySelectorAll('[data-step-panel]');

    function go(n) {
      steps.forEach(function (s, i) {
        s.classList.toggle('is-done', i < n);
        s.classList.toggle('is-current', i === n);
        var dot = s.querySelector('.vs-step__dot');
        if (dot) dot.innerHTML = i < n ? '<svg class="vs-i" aria-hidden="true"><use href="#i-check"></use></svg>' : String(i + 1);
      });
      panels.forEach(function (p, i) {
        p.hidden = i !== n;
      });
      var first = panels[n] && panels[n].querySelector('input:not([type=hidden]), select, textarea');
      if (first) first.focus({ preventScroll: true });
    }

    root.querySelectorAll('[data-step-next]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var panel = btn.closest('[data-step-panel]');
        var idx = Array.prototype.indexOf.call(panels, panel);
        var form = panel.querySelector('form') || panel.closest('form');
        var controls = panel.querySelectorAll('input, select, textarea');
        var valid = true;
        controls.forEach(function (c) {
          if (!c.checkValidity()) {
            valid = false;
            var f = c.closest('.vs-field');
            if (f) f.classList.add('is-invalid');
          }
        });
        if (!valid) {
          if (form && form.reportValidity) form.reportValidity();
          return;
        }
        if (idx + 1 < panels.length) go(idx + 1);
      });
    });

    root.querySelectorAll('[data-step-prev]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var panel = btn.closest('[data-step-panel]');
        var idx = Array.prototype.indexOf.call(panels, panel);
        if (idx > 0) go(idx - 1);
      });
    });

    go(0);
  });

  /* Código de verificación: salto automático entre casillas */
  document.querySelectorAll('.vs-code-inputs').forEach(function (group) {
    var inputs = group.querySelectorAll('input');
    inputs.forEach(function (inp, i) {
      inp.addEventListener('input', function () {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
        if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) inputs[i - 1].focus();
      });
    });
  });

  /* Reglas de contraseña en vivo */
  document.querySelectorAll('[data-pass-rules]').forEach(function (list) {
    var input = document.getElementById(list.getAttribute('data-pass-rules'));
    if (!input) return;
    var rules = {
      len: function (v) { return v.length >= 8; },
      upper: function (v) { return /[A-ZÁÉÍÓÚÑ]/.test(v); },
      num: function (v) { return /\d/.test(v); },
      sym: function (v) { return /[^\w\s]/.test(v); }
    };
    input.addEventListener('input', function () {
      list.querySelectorAll('li[data-rule]').forEach(function (li) {
        var fn = rules[li.getAttribute('data-rule')];
        li.classList.toggle('is-ok', !!(fn && fn(input.value)));
      });
    });
  });

  /* ---------- Rango horario (CU20): inicio debe ser menor que fin ---------- */
  document.querySelectorAll('[data-time-range]').forEach(function (root) {
    var start = root.querySelector('[data-time-start]');
    var end = root.querySelector('[data-time-end]');
    var out = root.querySelector('[data-time-blocks]');
    var field = end ? end.closest('.vs-field') : null;

    function check() {
      if (!start || !end || !start.value || !end.value) return;
      var a = start.value.split(':'), b = end.value.split(':');
      var mins = (parseInt(b[0], 10) * 60 + parseInt(b[1], 10)) - (parseInt(a[0], 10) * 60 + parseInt(a[1], 10));
      var bad = mins <= 0;
      if (field) field.classList.toggle('is-invalid', bad);
      end.setCustomValidity(bad ? 'La hora de fin debe ser posterior a la de inicio' : '');
      if (out) out.textContent = bad ? '—' : Math.floor(mins / 30) + ' bloques de 30 min';
    }

    if (start) start.addEventListener('input', check);
    if (end) end.addEventListener('input', check);
    check();
  });

  /* ---------- Confirmación escribiendo un texto exacto ---------- */
  document.querySelectorAll('[data-confirm-text]').forEach(function (input) {
    var target = document.getElementById(input.getAttribute('data-confirm-target'));
    var expected = input.getAttribute('data-confirm-text');
    if (!target) return;
    target.disabled = true;
    input.addEventListener('input', function () {
      target.disabled = input.value.trim().toUpperCase() !== expected.toUpperCase();
    });
  });

  /* ---------- Sugerir nombre de usuario (CU05) ---------- */
  var nameInput = document.getElementById('u-nombres');
  var lastInput = document.getElementById('u-apellidos');
  var userInput = document.getElementById('u-usuario');
  if (nameInput && lastInput && userInput) {
    function suggest() {
      if (userInput.getAttribute('data-touched') === '1') return;
      var n = (nameInput.value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      var a = (lastInput.value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!n || !a) return;
      userInput.value = n.charAt(0) + a.split(/\s+/)[0].replace(/[^a-z]/g, '');
    }
    nameInput.addEventListener('input', suggest);
    lastInput.addEventListener('input', suggest);
    userInput.addEventListener('input', function () { userInput.setAttribute('data-touched', '1'); });
  }

  /* ---------- Mostrar / ocultar contraseña ---------- */
  document.querySelectorAll('[data-toggle-pass]').forEach(function (btn) {
    var input = document.getElementById(btn.getAttribute('data-toggle-pass'));
    if (!input) return;
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.textContent = show ? 'Ocultar' : 'Mostrar';
    });
  });

  /* ---------- Alternar bloques según una opción (CU23: general / individual) ---------- */
  document.querySelectorAll('[data-switch]').forEach(function (input) {
    var group = input.getAttribute('name');
    function apply() {
      var checked = document.querySelector('input[name="' + group + '"]:checked');
      var val = checked ? checked.value : '';
      document.querySelectorAll('[data-show-when="' + group + '"]').forEach(function (el) {
        el.hidden = el.getAttribute('data-show-value') !== val;
      });
    }
    input.addEventListener('change', apply);
    apply();
  });

  /* ---------- Paginación de filas (CU23 y listas largas) ---------- */
  document.querySelectorAll('[data-pager]').forEach(function (root) {
    var size = parseInt(root.getAttribute('data-page-size'), 10) || 5;
    var rows = Array.prototype.slice.call(root.querySelectorAll('[data-page-row]'));
    var status = root.querySelector('[data-pager-status]');
    var controls = root.querySelector('[data-pager-controls]');
    if (!rows.length || !controls) return;
    var page = 0;
    var pages = Math.max(1, Math.ceil(rows.length / size));

    function button(label, opts) {
      var b = document.createElement('button');
      b.type = 'button';
      if (opts.html) b.innerHTML = opts.html;
      else b.textContent = label;
      if (opts.aria) b.setAttribute('aria-label', opts.aria);
      if (opts.disabled) b.disabled = true;
      if (opts.current) {
        b.className = 'is-current';
        b.setAttribute('aria-current', 'page');
      }
      b.addEventListener('click', opts.onClick);
      controls.appendChild(b);
    }

    function render() {
      rows.forEach(function (row, i) {
        row.hidden = i < page * size || i >= (page + 1) * size;
      });
      var from = page * size + 1;
      var to = Math.min(rows.length, (page + 1) * size);
      if (status) {
        status.innerHTML = 'Mostrando <strong class="vs-strong">' + from + '–' + to + '</strong> de <strong class="vs-strong">' + rows.length + '</strong>';
      }
      controls.innerHTML = '';
      button('', {
        html: '<svg class="vs-i vs-i--sm" aria-hidden="true"><use href="#i-chevron-left"/></svg>',
        aria: 'Anterior',
        disabled: page === 0,
        onClick: function () { page -= 1; render(); }
      });
      for (var n = 0; n < pages; n += 1) {
        (function (index) {
          button(String(index + 1), {
            current: index === page,
            onClick: function () { page = index; render(); }
          });
        })(n);
      }
      button('', {
        html: '<svg class="vs-i vs-i--sm" aria-hidden="true"><use href="#i-chevron-right"/></svg>',
        aria: 'Siguiente',
        disabled: page >= pages - 1,
        onClick: function () { page += 1; render(); }
      });
    }

    render();
  });

  /* ---------- Filas que se marcan al hacer clic ---------- */
  document.querySelectorAll('[data-selectable] tbody tr').forEach(function (row) {
    row.addEventListener('click', function (e) {
      if (e.target.closest('button, a, input, select')) return;
      row.parentElement.querySelectorAll('tr').forEach(function (r) { r.classList.remove('is-selected'); });
      row.classList.add('is-selected');
    });
  });

  /* ---------- Cerrar alertas ---------- */
  document.querySelectorAll('[data-dismiss]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = btn.closest('.vs-alert');
      if (el) el.remove();
    });
  });

  /* ---------- Vista previa del nuevo rol en el diálogo (CU08) ---------- */
  document.querySelectorAll('[data-role-preview]').forEach(function (ctrl) {
    var out = document.querySelector('[data-role-out]');
    if (!out) return;
    ctrl.addEventListener('change', function () {
      if (ctrl.tagName === 'SELECT') out.textContent = ctrl.options[ctrl.selectedIndex].text;
      else if (ctrl.checked) out.textContent = ctrl.value;
    });
  });
})();
