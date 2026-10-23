# Vida Salud — guía visual (Ciclo 1)

Referencia rápida para no repetir la plantilla “admin teal + Inter + sidebar oscuro”.

## Stack frontend (Laravel)

El backend será **Laravel**. En interfaz usamos **solo HTML, CSS y JavaScript** (vanilla):

- **Vistas:** plantillas Blade (`*.blade.php`) con el markup de las pantallas Stitch como base.
- **Estilos:** CSS del proyecto (`vida-salud-theme.css`, `vida-salud-shell.css`) y utilidades Tailwind vía CDN en prototipos; en Laravel, el mismo CSS compilado o enlazado desde `public/`.
- **Comportamiento:** JS plano (`vida-salud-app-shell.js`, etc.) — menú móvil, logout demo, validaciones ligeras. **Sin** React, Vue, Angular, Svelte ni SPA separada para este parcial.
- **No introducir** bundlers obligatorios (Vite solo si el curso lo pide para assets mínimos); priorizar lo que Blade puede servir directamente.

Los HTML en `Frontend/stitch/html/` son **prototipos estáticos** para diseño y copy; al integrar en Laravel se migran a Blade y las rutas/formularios apuntan a controladores Laravel.

## Identidad (paleta médica)

| Token | Valor | Uso |
|-------|--------|-----|
| `--vs-paper` | `#f4f9fc` | Fondo general |
| `--vs-forest` | `#0369a1` | Primario, marca, botones |
| `--vs-moss` | `#0d9488` | Salud, estados activos |
| `--vs-clay` | `#0891b2` | Enlaces, acentos |
| `--vs-ink` | `#1e293b` | Texto principal |
| `--vs-muted` | `#64748b` | Texto secundario |
| `--vs-line` | `#cbd5e1` | Bordes |

## Tipografía

- **Títulos:** Fraunces (`font-display`)
- **UI:** Plus Jakarta Sans (`font-sans`)

## Layout autenticado

- Rail **claro** (`vs-rail`), navegación en una línea por ítem (sin subtítulos de casos de uso).
- Topbar compacta; usuario ficticio de demo: Ana Soto.
- Componentes: `vs-card`, `vs-btn-primary`, `vs-btn-ghost`.

## Login

- Split: panel azul clínico + formulario sobre fondo papel.
- Sin badges TLS, sedes múltiples ni chips de roles en pantalla.

## Archivos

- `Frontend/stitch/css/vida-salud-theme.css` — tokens y componentes
- `Frontend/stitch/css/vida-salud-shell.css` — menú y animación del panel
- `Frontend/stitch/js/vida-salud-tailwind-config.js` — colores Tailwind `vs-*`
- `Frontend/stitch/js/vida-salud-app-shell.js` — menú móvil e interacciones
- `Frontend/stitch/html/` — pantallas prototipo
- `_apply_shell.py` — regenerar sidebar/header en las 3 pantallas internas

## Copy

- En UI: lenguaje operativo (“Nuevo usuario”, “Bitácora”).
- Referencias **CU** solo en documentación PHP/informe, no en etiquetas visibles.
