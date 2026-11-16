---
name: sky-design
description: Sistema de diseño "Sky" — paleta azul cielo serena sobre blanco hueso, con tipografía editorial (DM Serif Display + DM Sans + IBM Plex Mono). Úsalo siempre que el usuario pida una landing, sección, componente HTML/CSS o cualquier UI con este estilo, o cuando mencione "estilo sky", "estilo KC", "estilo de mi proyecto base" o similar. También úsalo por defecto para sitios de servicios profesionales (inmobiliaria, legal, salud, consultoría) cuando no se especifique otro estilo.
---

# Sky Design System

Sistema visual basado en `base-de-proyecto.html`. La sensación buscada es: **sereno, editorial, profesional, con aire** — nada estridente, nada brutalista. Inspirado en cielo despejado a las 10am.

## Cuándo usar este skill

- El usuario menciona "estilo sky", "estilo del proyecto base", "como el de KC".
- Pide construir landing, sección, formulario, tarjeta, header, footer en HTML+CSS y no especifica otro sistema visual.
- Es un negocio profesional/de servicios (inmobiliaria, legal, arquitectura, salud, consultoría, asesoría) y no hay una guía de marca distinta.

## Cuándo NO usar este skill

- El usuario pide expresamente otro estilo (dark mode, brutalist, neón, retro, etc.).
- El proyecto ya tiene un sistema de diseño activo (Tailwind config propio, design tokens distintos, librería UI).

---

## Reglas no negociables

1. **Siempre carga las tres fuentes** desde Google Fonts en el `<head>`: DM Sans (300-700), DM Serif Display (con itálica), IBM Plex Mono (300-500).
2. **Siempre define el `:root`** con los tokens del archivo `reference/tokens.css`. No inventes colores: usa solo las variables.
3. **El acento de marca es la cursiva**: dentro de títulos `<h1>`/`<h2>`, envuelve la palabra clave en `<em>` para que tome `font-style: italic` y `color: var(--sky-deep)`. Es la firma del sistema.
4. **Las "eyebrows" son obligatorias** arriba de cada sección/título importante: texto en mono, mayúsculas, `letter-spacing: 0.26em`, color `--dim`, con una rayita horizontal `--sky` de 24×2px antes.
5. **Animaciones suaves**: nada de bounces ni rotaciones agresivas. Solo `translateY` pequeños (max 4px), `opacity`, easing `cubic-bezier(0.22, 1, 0.36, 1)` para reveals, duraciones 0.25s para hover y 0.8s para reveals. Respeta `prefers-reduced-motion`.
6. **No uses sombras duras**: solo las tres tiers definidas (`--shadow-sm/md/lg`) que son todas con `rgba(26, 45, 61, 0.06-0.10)`, muy difusas.
7. **Border-radius en escala**: 8px (chips, días de calendario, inputs pequeños), 10px (botones), 12px (contenedores de icono), 16px (tarjetas grandes), 99px (pills/badges).

---

## Paleta (memorízala)

| Token | Hex / valor | Uso |
|---|---|---|
| `--bg` | `#f7fbff` | Fondo de página, blanco con tinte cielo |
| `--bg-card` | `#ffffff` | Tarjetas y superficies elevadas |
| `--bg-glass` | `rgba(255,255,255,0.72)` | Header al hacer scroll (con backdrop-filter blur 16px) |
| `--fg` | `#1a2d3d` | Texto principal, azul tinta |
| `--fg-soft` | `#3d5a73` | Texto secundario, párrafos largos |
| `--dim` | `#7a99b5` | Texto de eyebrows, labels, captions |
| `--sky` | `#5ba3d9` | Acento principal (botones, bordes activos) |
| `--sky-deep` | `#3b7dbf` | Acento intenso (hover, palabras en cursiva) |
| `--sky-light` | `#a0d0f0` | Acento claro (gradientes, divisores) |
| `--sky-pale` | `#dceefb` | Fondo de gradientes muy suaves |

**Regla mental**: el azul nunca debe sentirse agresivo. Si una composición se ve "demasiado azul", baja la saturación con `--sky-dim` (`rgba(91,163,217,0.10)`) para fondos y deja `--sky` solo para CTAs y bordes activos.

---

## Tipografía (la jerarquía)

- **`--display`** = `'DM Serif Display'`. Solo para títulos grandes (`h1`, `h2`, `.brand-name`, `.cal-month`). Peso 400. Aprovecha la itálica para acentos.
- **`--sans`** = `'DM Sans'`. Todo el cuerpo de texto, botones, navegación general. Pesos 400 (texto), 500 (CTAs nav), 600 (botones principales).
- **`--mono`** = `'IBM Plex Mono'`. Eyebrows, labels, badges, días de calendario, números, micro-copy. Casi siempre con `text-transform: uppercase` y `letter-spacing` entre `0.14em` y `0.26em`.

**Escala de títulos**:
- Hero: `clamp(2.4rem, 6vw, 3.8rem)`, line-height 1.1
- Section: `clamp(1.8rem, 3.8vw, 2.8rem)`, line-height 1.12
- Card title: `1.05rem` a `1.25rem`, peso 400 (display) o 600 (sans)
- Eyebrow: `0.66rem`, letter-spacing `0.26em`, uppercase, mono
- Badge: `0.62rem` a `0.64rem`, letter-spacing `0.18em` a `0.24em`

---

## Patrones reutilizables

Cuando construyas, **consulta primero `reference/patterns.html`** para copiar el patrón exacto. Los más usados:

- **`.section-eyebrow`** — la etiqueta mono uppercase con rayita azul antes del título de sección.
- **`.hero-badge`** — pill con `border-radius: 99px`, fondo `rgba(91,163,217,0.10)`, borde sutil, texto mono uppercase + icono opcional.
- **`.btn` + `.btn-sky`** — botón principal sky con hover que sube 1-2px y proyecta glow.
- **`.service-card`** — tarjeta blanca con borde sutil que en hover sube 4px, muestra una franja superior degradada (3px) `var(--sky) → var(--sky-light)` y la sombra `--shadow-lg`.
- **`.sky-divider`** — divisor de 48×3px con gradient `--sky` a `--sky-light`.
- **`.ambient` + `.cloud`** — capa de fondo `position: fixed` con nubes circulares en gradient radial muy tenue, animadas con `cloudDrift` 40-80s. Solo si la página tiene "espacio respirable".
- **`.dot-pattern`** — opcional, capa fixed con patrón de puntos cada 32px en `--sky` a opacidad 0.35.
- **`.reveal` + `.in`** — reveal on scroll vía `IntersectionObserver`, con delays escalonados `.d1`/`.d2`/`.d3`/`.d4` (80/180/280/380ms).

---

## Estructura de página típica

```
<body>
  <div class="ambient" id="ambient"></div>      <!-- nubes -->
  <div class="dot-pattern"></div>               <!-- opcional -->
  <header class="site-header" id="siteHeader">…</header>

  <section class="hero">
    <div class="hero-content">
      <span class="hero-badge">…</span>
      <h1 class="hero-title">… <em>palabra clave</em> …</h1>
      <p class="hero-sub">…</p>
      <a class="hero-cta btn btn-sky">…</a>
    </div>
    <div class="scroll-hint">…</div>
  </section>

  <section class="servicios">
    <div class="container">
      <div class="section-header reveal">
        <div class="section-eyebrow">Servicios</div>
        <h2 class="section-title">… <em>frase</em> …</h2>
        <p class="section-lead">…</p>
      </div>
      <div class="services-grid">
        <div class="service-card reveal d1">…</div>
        …
      </div>
    </div>
  </section>

  …más secciones…

  <script>/* header scrolled + IntersectionObserver reveals + ambient clouds */</script>
</body>
```

---

## Espaciado y layout

- **Container**: `max-width: 1200px`, padding lateral `2.5rem`.
- **Padding vertical de sección**: `7rem 0` por defecto, `6rem 0` para secciones más densas.
- **Gap entre tarjetas**: `1.5rem`.
- **Margen bajo `section-header`**: `3.5rem`.
- **Grid de servicios**: `repeat(2, 1fr)` desktop. En mobile (`<720px`): `1fr`.

---

## Accesibilidad — no negociable

- `:focus-visible` siempre con `outline: 2px solid var(--sky); outline-offset: 3px;`.
- Respeta `prefers-reduced-motion`: si está activo, NO animes nubes, NO animes reveals (muestra todo de una vez).
- Contraste: `--fg` sobre `--bg` da ~13:1, perfecto. `--fg-soft` sobre `--bg` da ~7:1, ok. `--dim` solo para texto pequeño no esencial. Nunca uses `--dim-2` para texto legible.

---

## Archivos de referencia

- `reference/tokens.css` — bloque `:root` completo + reset + body base. Cópialo tal cual al inicio de cualquier `<style>`.
- `reference/patterns.html` — fragmentos HTML+CSS de cada patrón listo para pegar.

Cuando vayas a construir algo: primero `view` los dos archivos, luego ensambla.
