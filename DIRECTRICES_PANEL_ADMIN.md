# Directrices visuales para el Panel Admin

Refactor visual de **toda la sección `/admin` y `/login`** para que tenga la misma identidad del sitio público (`/`). El sitio público NO se toca.

---

## El problema actual

El panel admin se construyó con una estética genérica (fuentes del sistema, sin jerarquía editorial, popups planos, formularios sin contenedores, tipografía inconsistente con el sitio público). Visualmente parece otra aplicación distinta del sitio web.

## La meta

Que `/admin` se sienta como **una extensión natural del sitio público**: mismas fuentes, misma paleta, mismo lenguaje editorial (eyebrows en mono, títulos serif con itálica en palabra clave, cards blancas con bordes sutiles, iconos en cuadritos sky-pale).

## El archivo de referencia

`DEMO_SISTEMA_VISUAL_PANEL.html` contiene 6 pantallas completas que definen el sistema. Antigravity debe **abrirlo en navegador, ver cada pantalla, y replicar el markup + CSS** en los componentes React existentes.

Las 6 pantallas son:
1. **Login** — reemplaza la pantalla actual de `/admin/login`
2. **Dashboard** — reemplaza `/admin` (Inicio)
3. **Tabla** — reemplaza `/admin/tesoreria` y aplica a TODAS las listas (Citas, Leads, Ventas, etc.)
4. **Formulario** — reemplaza "Registrar Compra" y aplica a TODOS los formularios
5. **Modal** — reemplaza el popup de Carga Masiva y aplica a TODOS los modales del panel
6. **Empty state** — patrón para cuando las tablas no tienen datos

---

## Reglas no negociables

**Fuentes** (igual que el sitio público — instalar con `next/font/google`):
- `DM Sans` — cuerpo, botones, UI general
- `DM Serif Display` (incluir variante `italic`) — títulos grandes
- `IBM Plex Mono` — eyebrow labels, metadata pequeña, números monoespaciados

Todas las páginas del panel deben usar estas tres y **nada más**. Ni Inter, ni system-ui, ni fuentes del navegador por defecto.

**Paleta** — extraer del `:root` del archivo HTML demo. Los tokens críticos:
- `--bg: #f3f9fd` (NUNCA blanco puro de fondo, siempre este sky tinted)
- `--bg-card: #ffffff` (las cards SÍ son blancas, eso da el contraste)
- `--sky-deep: #3d7fb8` (color de la itálica y de los CTAs)
- `--border: #dce8f0` (todos los bordes — TODO se separa con borde 1px, NO con sombras pesadas)

**Tipografía editorial** — el patrón de cada page header es siempre:
1. `eyebrow` (mono pequeño con dash al inicio, color sky-deep, uppercase)
2. `display-title` (DM Serif Display 32-42px) con **una palabra en itálica** en color sky-deep
3. `page-sub` (DM Sans, gris suave, max-width 540px)

Ejemplo: `— TESORERÍA` / `Compras y *gastos*` / `Gestiona las cuentas por pagar...`

**Iconos** — todos SVG inline estilo Lucide (`stroke-width: 1.7-2`, esquinas redondeadas). En contenedores `.icon-box` que son cuadrados sky-pale con esquinas redondeadas. **PROHIBIDO**: emojis, iconos de WhatsApp, iconos de Material Design, mezclar sets distintos.

**Bordes vs sombras** — la jerarquía se construye con **bordes 1px sky-tinted**, no con sombras pesadas. Las sombras existen pero son casi invisibles (`--shadow-xs`, `--shadow-sm`).

**Botones**:
- Primario: `--sky-deep` sólido con texto blanco, border-radius 10px
- Secundario: blanco con border `--border`
- Ghost: transparente, solo texto
- NUNCA gradientes saturados ni sombras 3D

---

## Lo que NO se debe hacer

❌ **No neumorfismo.** El sistema es plano, editorial, con bordes finos. Cualquier sombra doble (light + dark) tipo neumorfismo está fuera.

❌ **No tocar el sitio público** (`/`, `/servicios`, etc.). Solo `/admin/*` y `/login`.

❌ **No mantener nada del estilo actual del panel.** Reemplazar componente por componente: sidebar, login card, KPI cards, tablas, formularios, modales, badges, botones.

❌ **No usar Tailwind utilities sueltas** para reemplazar el sistema. Las variables CSS y clases utility del demo son la fuente de verdad. Tailwind puede usarse para spacing/layout pero NO para colores ni tipografía.

❌ **No improvisar.** Si una pantalla no está cubierta exactamente en el demo, combinar los patrones existentes (card + form + table + modal) — no inventar estilos nuevos.

---

## Orden de aplicación sugerido

1. **CSS global**: copiar los `:root` tokens, primitivas (`.card`, `.btn`, `.input`, `.badge`, `.icon-box`, `.eyebrow`, `.display-title`) y fuentes al `globals.css` del proyecto Next.
2. **Login** (la peor pantalla actual): aplicar el patrón de pantalla 1.
3. **Layout `/admin`** (sidebar + main): aplicar el patrón compartido en las pantallas 2-6.
4. **Página Inicio**: aplicar pantalla 2.
5. **Tesorería (tabla)**: aplicar pantalla 3.
6. **Formularios** (Registrar Compra, Nueva Cita, Nueva Venta, etc.): aplicar pantalla 4.
7. **Modales** (Carga Masiva, confirmaciones, edición rápida): aplicar pantalla 5.
8. **Empty states** en todas las tablas vacías: aplicar pantalla 6.
9. **Resto de módulos** (Leads, Ventas, Proveedores, Cajas Menores, KPIs, Usuarios, Auditoría): aplicar combinando los patrones de las pantallas 3-6 según corresponda.

---

## Validación final

Cuando termine, abrir el sitio público (`/`) en una pestaña y el panel (`/admin`) en otra. **Debe parecer la misma marca, el mismo producto**. Si se siente como dos sitios distintos, falta refactor.
