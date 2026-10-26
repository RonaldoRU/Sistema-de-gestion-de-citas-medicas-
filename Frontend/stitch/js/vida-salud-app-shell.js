/* =====================================================================
   Vida Salud — comportamiento del shell
   Drawer móvil, colapso en escritorio y cierre de sesión (CU02).
   Debe cargarse después de vida-salud-nav.js.
   ===================================================================== */
(function () {
  'use strict';

  var sidebar = document.getElementById('app-sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  var toggle = document.getElementById('sidebar-toggle');
  var closeBtn = document.getElementById('sidebar-close');

  if (!sidebar || !overlay || !toggle) return;

  var mqDesktop = window.matchMedia('(min-width: 1024px)');
  var storageKey = 'vs-sidebar-collapsed';

  function isCollapsed() {
    return sidebar.classList.contains('is-collapsed');
  }

  function isDrawerOpen() {
    return sidebar.classList.contains('is-drawer-open');
  }

  function setToggleLabel(drawerOpen) {
    toggle.setAttribute('aria-expanded', drawerOpen ? 'true' : 'false');
    if (drawerOpen) {
      toggle.setAttribute('aria-label', 'Cerrar menú');
      return;
    }
    toggle.setAttribute('aria-label', mqDesktop.matches && isCollapsed() ? 'Expandir menú' : 'Abrir menú');
  }

  function openDrawer() {
    sidebar.classList.add('is-drawer-open');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('vs-no-scroll');
    setToggleLabel(true);
  }

  function closeDrawer() {
    sidebar.classList.remove('is-drawer-open');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('vs-no-scroll');
    setToggleLabel(false);
  }

  function applyCollapsed(collapsed) {
    sidebar.classList.toggle('is-collapsed', collapsed);
    try {
      sessionStorage.setItem(storageKey, collapsed ? '1' : '0');
    } catch (e) {}
    setToggleLabel(false);
  }

  function syncLayout() {
    if (mqDesktop.matches) {
      closeDrawer();
      var collapsed = false;
      try {
        collapsed = sessionStorage.getItem(storageKey) === '1';
      } catch (e) {}
      sidebar.classList.toggle('is-collapsed', collapsed);
    } else {
      sidebar.classList.remove('is-collapsed');
    }
    setToggleLabel(isDrawerOpen());
  }

  toggle.addEventListener('click', function () {
    if (mqDesktop.matches) {
      applyCollapsed(!isCollapsed());
      return;
    }
    if (isDrawerOpen()) closeDrawer();
    else openDrawer();
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !mqDesktop.matches && isDrawerOpen()) closeDrawer();
  });

  if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', syncLayout);
  else mqDesktop.addListener(syncLayout);

  sidebar.querySelectorAll('nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (!mqDesktop.matches) closeDrawer();
    });
  });

  /* CU02 — Cerrar sesión: confirmación y redirección */
  var logoutDialog = document.getElementById('vs-logout-dialog');
  document.querySelectorAll('[data-logout]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (logoutDialog && typeof logoutDialog.showModal === 'function') {
        if (!mqDesktop.matches) closeDrawer();
        logoutDialog.showModal();
      } else {
        window.location.href = 'cu02-sesion-cerrada.html';
      }
    });
  });

  syncLayout();
})();
