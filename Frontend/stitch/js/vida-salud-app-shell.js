(function () {
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

  function setToggleLabel(drawerOpen) {
    toggle.setAttribute('aria-expanded', drawerOpen ? 'true' : 'false');
    if (drawerOpen) {
      toggle.setAttribute('aria-label', 'Cerrar menú');
      return;
    }
    toggle.setAttribute('aria-label', mqDesktop.matches && isCollapsed() ? 'Expandir menú' : 'Abrir menú');
  }

  function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('is-drawer-open');
    overlay.classList.add('is-open');
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
    setToggleLabel(true);
  }

  function closeSidebar() {
    if (mqDesktop.matches) return;
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('is-drawer-open');
    overlay.classList.remove('is-open');
    overlay.classList.add('opacity-0', 'pointer-events-none');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
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
      sidebar.classList.remove('-translate-x-full', 'is-drawer-open');
      overlay.classList.remove('is-open');
      overlay.classList.add('opacity-0', 'pointer-events-none');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('overflow-hidden');
      var collapsed = false;
      try {
        collapsed = sessionStorage.getItem(storageKey) === '1';
      } catch (e) {}
      sidebar.classList.toggle('is-collapsed', collapsed);
      setToggleLabel(false);
    } else if (sidebar.classList.contains('-translate-x-full')) {
      sidebar.classList.remove('is-drawer-open');
      setToggleLabel(false);
    }
  }

  toggle.addEventListener('click', function () {
    if (mqDesktop.matches) {
      applyCollapsed(!isCollapsed());
      return;
    }
    if (sidebar.classList.contains('-translate-x-full')) openSidebar();
    else closeSidebar();
  });

  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !mqDesktop.matches && !sidebar.classList.contains('-translate-x-full')) {
      closeSidebar();
    }
  });

  mqDesktop.addEventListener('change', syncLayout);

  sidebar.querySelectorAll('nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (!mqDesktop.matches) closeSidebar();
    });
  });

  document.querySelectorAll('[data-logout]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.location.href = 'login-stitch.html';
    });
  });

  syncLayout();
})();
