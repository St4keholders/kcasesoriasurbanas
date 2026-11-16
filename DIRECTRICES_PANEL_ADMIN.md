# Directrices Visuales para el Panel Admin — Sistema Sky + Liquid Glass

Guía oficial de diseño para toda la sección `/admin` y `/login` de **KC Asesorías Urbanas S.A.S**.

---

## 1. Arquitectura de estilos unificada

Todo el sistema visual reside en:
- `app/styles/tokens.css` — Variables CSS globales, paleta con contraste **WCAG AA (≥ 4.5:1)** y tokens **Liquid Glass**.
- `app/admin-styles.css` — Primitivas de interfaz (`.card`, `.glass-panel`, `.btn`, `.input`, `.badge`, `.icon-box`, `.eyebrow`, `.display-title`).
- `app/globals.css` — Importa los archivos anteriores y contiene los estilos del sitio público (`/`).

Se eliminaron por completo `neu-forms.css` y todas las clases `neu-*`.

---

## 2. Tipografía editorial (`next/font/google`)

- **DM Sans (`--sans`)**: Cuerpo, tablas, formularios y botones.
- **DM Serif Display (`--display`)**: Títulos principales con palabra clave en *itálica* (`color: var(--sky-deep)`).
- **IBM Plex Mono (`--mono`)**: Eyebrows, consecutivos (`CE-2026-000001`), NITs, códigos PUC, fechas y cifras en COP.

---

## 3. Tokens Liquid Glass y Contraste WCAG AA

Los paneles secundarios (modales, drawers, detalles de compra, ficha 2026 de proveedor, bandeja de ingesta, revisión de borradores y barras de filtros) utilizan `.glass-panel`:

- **Superficie translúcida:** `rgba(255, 255, 255, 0.55)` (~55 % de opacidad blanca).
- **Filtro óptico:** `backdrop-filter: blur(20px) saturate(180%)`.
- **Bordes y brillo interior:** borde claro de `1px` (`rgba(255, 255, 255, 0.78)`), contorno exterior sutil (`rgba(182, 205, 224, 0.65)`), brillo interior (`inset 0 1px 0 rgba(255, 255, 255, 0.88)`) y sombra sky difusa (`0 8px 32px rgba(20, 36, 51, 0.08)`).
- **Respaldo sin `backdrop-filter`:** fondo sólido `rgba(255, 255, 255, 0.96)` mediante `@supports`.
- **Contraste WCAG AA garantizado (≥ 4.5:1):**
  - `--fg: #142433` (15.1:1 sobre `#ffffff`)
  - `--fg-soft: #2c4459` (9.6:1 sobre `#ffffff`)
  - `--dim: #455f75` (6.2:1 sobre `#ffffff` y 5.7:1 sobre `--bg: #f3f9fd`)
  - `--sky-deep: #235d93` (6.8:1 sobre `#ffffff` y con texto blanco en botones primarios)

---

## 4. Convenciones de texto y formato

- **Idioma y tono:** Español con tuteo y tildes ortográficas completas; sin emojis ni textos de relleno.
- **Moneda:** Pesos colombianos (`COP`) sin decimales (`$ 1.250.000`).
- **Fechas:** Formato `dd MMM yyyy` en español (`16 nov 2026`).
- **Estados:** Etiquetas legibles (`Pendiente de pago`, `Pagado`, `Anulado`, `Borrador`, `Contabilizado`).

---

## 5. Animación de carga (`KcLoader`)

- Componente `components/ui/KcLoader.tsx`: SVG inline (< 3 KB) de 1.2 s en bucle donde se traza el monograma **"KC"** y lo recorre un brillo glass.
- Atributo `role="status"` para accesibilidad y degradación a pulso estático suave con `prefers-reduced-motion: reduce`.
- Se activa únicamente cuando la espera supera los `150 ms`.
