# Vida Salud — guía visual (Ciclo 2)

Referencia rápida para mantener la armonía del frontend y no volver a la plantilla “admin teal + Inter + sidebar oscuro”.

## Stack frontend (Laravel)

El backend será **Laravel**. En interfaz usamos **solo HTML, CSS y JavaScript** (vanilla):

- **Vistas:** plantillas Blade (`*.blade.php`) con el markup de las pantallas de `Frontend/stitch/html/` como base.
- **Estilos:** CSS propio del proyecto (`vida-salud-theme.css` + `vida-salud-shell.css`). **Sin Tailwind** ni frameworks CSS externos; en Laravel el mismo CSS se sirve desde `public/`.
- **Comportamiento:** JS plano (`vida-salud-nav.js`, `vida-salud-app-shell.js`, `vida-salud-ui.js`): menú, diálogos, pestañas, selección de bloques, validaciones ligeras. **Sin** React, Vue, Angular, Svelte ni SPA separada.
- **No introducir** bundlers obligatorios; priorizar lo que Blade puede servir directamente.

Los HTML en `Frontend/stitch/html/` son **prototipos estáticos**: datos de ejemplo embebidos (tomados de `Docs/DDL/poblacion.sql`), formularios que no envían nada y acciones que muestran un *toast*. Al integrar en Laravel se migran a Blade y los formularios apuntan a controladores.

## Identidad (paleta clínica)

| Token | Valor | Uso |
|-------|--------|-----|
| `--vs-paper` | `#f4f9fc` | Fondo general |
| `--vs-rail` | `#e3f0f7` | Fondo del menú lateral |
| `--vs-forest` | `#0369a1` | Primario, marca, botones |
| `--vs-moss` | `#0d9488` | Salud, estados OK / atendida |
| `--vs-clay` | `#0891b2` | Enlaces, acentos, estado confirmada |
| `--vs-ink` | `#1e293b` | Texto principal |
| `--vs-muted` | `#64748b` | Texto secundario |
| `--vs-line` | `#cbd5e1` | Bordes |

Semáforo de estados de cita: Programada = info (azul), Confirmada = cyan, Atendida = ok (verde), Cancelada = danger (rosa), Inasistencia = warn (ámbar). Mismos colores en badges, nodos FSM, agenda y gráficos.

## Tipografía

- **Títulos:** Fraunces (`--vs-font-display`)
- **UI:** Plus Jakarta Sans (`--vs-font-sans`)
- **Códigos y datos:** IBM Plex Mono (`--vs-font-mono`) para CU, CI, CM-####, PAC-####, MED-###, horas e IPs.

Cargadas desde Google Fonts en cada página; en Laravel, un único `<link>` en el layout.

## Arquitectura de navegación (regla del parcial)

El menú lateral se organiza **por paquete** (categoría) y, dentro de cada paquete, **sus casos de uso** (subcategoría), con el código CU visible:

| Paquete | CU |
|---------|----|
| P1 Seguridad y Autenticación | CU01–CU04 |
| P2 Administración de Usuarios y Permisos | CU05–CU09 |
| P3 Auditoría, Trazabilidad y Bitácora | CU10–CU11 |
| P4 Gestión de Pacientes | CU12–CU17 |
| P5 Gestión Médica y Horarios | CU18–CU21 |
| P6 Gestión de Citas Médicas | CU22–CU31 |
| P7 Reportes Administrativos | CU32–CU36 |

La numeración sigue el catálogo §4.1 / detalle §4.3 del documento del parcial.

- El menú se renderiza desde **una sola configuración** (`NAV` en `vida-salud-nav.js`) para no duplicarlo en 37 páginas. Cada página declara su CU activo en `<body class="vs-app" data-cu="CU05">`; el *dashboard* usa `data-page="inicio"`.
- Los paquetes son acordeones (`.vs-pkg`); el que contiene el CU activo se abre solo y el estado se recuerda en `sessionStorage`.
- CU01 y CU03 son páginas públicas enlazadas desde el menú (icono de salida); CU02 es una acción (diálogo de confirmación → `cu02-sesion-cerrada.html`).
- En escritorio el menú es fijo y colapsable; bajo 1024 px es un *drawer* con overlay.

## Esqueleto de página autenticada

```html
<body class="vs-app" data-cu="CUxx">
  <div id="sidebar-overlay" class="vs-overlay" aria-hidden="true"></div>
  <aside id="app-sidebar" class="vs-sidebar" aria-label="Menú principal"></aside>
  <div id="app-main">
    <header class="vs-topbar">…hamburguesa · título · <span data-nav-crumb> · usuario · Salir…</header>
    <main class="vs-page"><div class="vs-page-stack">
      <header class="vs-page-head">eyebrow (paquete) · h1 · lead · .vs-trace (CU + actor) · acciones</header>
      …secciones…
    </div></main>
  </div>
  <script src="../js/vida-salud-nav.js"></script>
  <script src="../js/vida-salud-app-shell.js"></script>
  <script src="../js/vida-salud-ui.js"></script>
</body>
```

Patrón de contenido: KPIs (`.vs-grid--4`) → filtros (`.vs-filters`) → `.vs-split` con el bloque principal (tabla/formulario) a la izquierda y un `aside` con reglas del CU (`.vs-rules`), historial (`.vs-timeline`) o ficha (`.vs-dl`) a la derecha. Los flujos alternativos (A1, A2) del documento se muestran como `.vs-alert` o `.vs-rule--danger/--warn`.

## Componentes reutilizables (theme.css)

Cards, KPIs, botones, formularios (`.vs-field`, `.vs-choice`, `.vs-pills`), tablas con `.vs-cell-person`, badges con punto de estado, avatares con iniciales, alertas, reglas, pestañas, pasos, timeline, listas, `.vs-slots` (bloques de 30 min), `.vs-week` (horarios), `.vs-agenda` (cronograma), `.vs-fsm` (estados de cita), gráficos CSS (`.vs-bars`, `.vs-cols`, `.vs-donut`), `<dialog class="vs-modal">`, toast, `.vs-receipt` (comprobante), `.vs-seq` (secuencia de concurrencia) y el layout público `.vs-auth`.

Iconos: sprite SVG inyectado por `vida-salud-nav.js`; uso `<svg class="vs-i"><use href="#i-nombre"/></svg>`.

## Interacciones de prototipo (ui.js, por atributos)

`data-open-dialog` / `data-close-dialog`, `data-toast` + `data-toast-sub`, `form[data-demo]` (valida y muestra toast o abre `data-demo-dialog`), `data-tabs`, `data-slots` + `data-slot-summary` + `data-slot-confirm`, `data-stepper`, `data-pass-rules`, `data-time-range`, `data-confirm-text` + `data-confirm-target`, `data-switch` + `data-show-when`, `data-selectable`, `data-dismiss`, `data-toggle-pass`, `data-role-preview`, `data-pager` + `data-page-size` + `data-page-row`.

## Datos de demostración

Usuario en sesión: **Silvia Irene Colque López** (scolque, Administradora, avatar “SC”). “Hoy” es **lunes 26 de octubre de 2026**. Médicos, pacientes, especialidades, horarios y bloqueos provienen de `Docs/DDL/poblacion.sql`; las citas del día (CM-0281…CM-0290) y el siguiente código (CM-0297) son consistentes entre páginas.

## Archivos

- `Frontend/stitch/css/vida-salud-theme.css` — tokens y componentes
- `Frontend/stitch/css/vida-salud-shell.css` — menú lateral, topbar y layout autenticado
- `Frontend/stitch/js/vida-salud-nav.js` — configuración del menú por paquetes/CU, sprite de iconos, diálogo de cierre de sesión y toast
- `Frontend/stitch/js/vida-salud-app-shell.js` — drawer, colapso y persistencia del menú
- `Frontend/stitch/js/vida-salud-ui.js` — interacciones de prototipo por atributos `data-*`
- `Frontend/stitch/html/index.html` — redirige a CU01
- `Frontend/stitch/html/inicio.html` — dashboard (hub de paquetes)
- `Frontend/stitch/html/P1 Seguridad y Autenticación/` … `P7 Reportes Administrativos/` — una carpeta por paquete, y dentro los `cuNN-slug.html` que le corresponden

## Copy

- Lenguaje operativo en etiquetas (“Nuevo usuario”, “Programar cita”).
- El código **CU** sí es visible, pero acotado: en el menú lateral (subcategoría), en el `.vs-trace` de la cabecera de cada página y en referencias cruzadas (“ver CU26”). No se usa en botones ni en mensajes al usuario.
- Mensajes del sistema en español neutro, sin tecnicismos; los nombres de tablas/columnas van en `.vs-code` y solo en paneles de reglas.
