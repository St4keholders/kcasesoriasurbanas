# Guía de Migración: HTML → Next.js — KC Asesorías Urbanas (v2)

Documento de trabajo para Claude Code. Define qué hay, qué hay que construir, cómo subdividir el HTML monolítico, y cómo conectar con la infraestructura Supabase ya provisionada.

---

## 0. Repositorio de GitHub

**URL del repositorio**: `https://github.com/St4keholders/kcasesoriasurbanas.git`

La carpeta local `kcasesorias/` ya tiene `.git` inicializado. Falta conectarla al repositorio remoto y hacer el primer push.

### Comandos para conectar y subir
```bash
# Desde la raíz del proyecto kcasesorias/
git remote add origin https://github.com/St4keholders/kcasesoriasurbanas.git
git branch -M main
git add .
git commit -m "chore: estado inicial — Next.js 15 + Tailwind v4 + base HTML de referencia"
git push -u origin main
```

Si `git remote add origin` falla porque ya existe un remoto, hacer:
```bash
git remote set-url origin https://github.com/St4keholders/kcasesoriasurbanas.git
```

### Política de commits para esta migración
- Cada componente nuevo va en su propio commit, con mensaje descriptivo: `feat: Hero section migrada de HTML a Next.js`.
- Cada paso del plan de ejecución (sección 9) cierra con un commit y push.
- **Nunca commitear `.env.local`** (ya está en `.gitignore`).
- Si Claude Code crea archivos sensibles por error, revertir antes del push.

### Verificación antes del primer push
- Revisar que `.env.local` aparezca en `.gitignore`.
- Correr `git status` y confirmar que no se está subiendo el archivo de variables de entorno.
- Si `.env` (sin el `.local`) aparece, también añadirlo al `.gitignore`.

---

## 1. Contexto del proyecto

### 1.1 Lo que ya existe
- **Carpeta del proyecto**: `kcasesorias/` con Next.js 15 + App Router + TypeScript + Tailwind v4 + ESLint ya inicializados.
- **Archivo de referencia visual**: `base-de-proyecto.html` (~1.991 líneas, HTML + CSS + JS en un solo archivo). **Este archivo se desintegrará**: su contenido pasa a componentes React.
- **Base de datos**: ya existe en Supabase (proyecto `vsqtzfkswfhjlrvnksby`). Las tablas, RLS, triggers, vistas de KPIs y buckets de Storage están creados según `supabase_migration.sql`.
- **Variables de entorno**: archivo `.env.local` ya en la raíz con las credenciales de Supabase.
- **Documentación de la base de datos**: `diseno_base_datos.md` en la raíz.

### 1.2 Configuración actual de Supabase Auth
Ya están aplicados estos toggles en el dashboard, no cambiarlos:
- **Confirm email**: OFF (no se manda correo de verificación a nadie).
- **Allow new users to sign up**: OFF (signup público desactivado; nadie se autoregistra).
- **Email provider**: ON (necesario para login con email + contraseña).

Esto significa: **los usuarios solo existen porque un admin los creó**. No hay registro público.

### 1.3 Cómo se crean usuarios (importante para el desarrollo)
El flujo definitivo para crear usuarios es **el botón "Add user" del dashboard de Supabase** (Authentication → Users → "Add user" → "Create new user"). Ahí se define email y contraseña directamente. Por defecto el usuario queda con rol `asesor`.

Para cambiar el rol a `admin` o `tesoreria`, se ejecuta en SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'usuario@correo.com';
```

Esa línea **solo cambia el rol**, no toca la contraseña.

**En Fase 2** (panel admin), construiremos un formulario que internamente llama a `supabase.auth.admin.createUser()` con el rol incluido, así el admin no necesitará entrar al dashboard ni al SQL Editor.

### 1.4 Lo que hay que construir en esta fase
Un sitio web público en Next.js con la **identidad visual idéntica al HTML**, dividido en componentes mantenibles, donde el formulario de agenda guarda la cita en Supabase **además** de abrir WhatsApp. Esta fase **no incluye** el panel administrativo interno (módulos de Citas, Ventas, Compras, KPIs); eso va en una segunda fase.

### 1.5 Cambio de marca (único cambio visual)
| Antes (HTML) | Después (Next.js) |
|---|---|
| `KC Obras` | `KC Asesorías Urbanas` |
| `KC Obras para Vivir Bien` | `KC Asesorías Urbanas` |
| `Para Vivir Bien` (subtítulo) | Mantener o eliminar (definir con el cliente) |
| `KC Obras — Gestión inmobiliaria profesional` | `KC Asesorías Urbanas — Gestión inmobiliaria profesional` |

**Búsqueda global a hacer**: `KC Obras` → `KC Asesorías Urbanas`. También revisar `title`, `meta description` y mensajes de WhatsApp pre-llenados.

---

## 2. Estructura de carpetas propuesta

Propósito: cada sección del HTML es un componente independiente; estilos globales en un solo CSS; lógica de Supabase aislada en `lib/`.

```
kcasesorias/
├── app/
│   ├── layout.tsx                  # Layout raíz: fuentes Google, metadata, ambient bg
│   ├── page.tsx                    # Landing: orquesta las secciones
│   ├── globals.css                 # Estilos globales (CSS variables + clases del HTML)
│   └── api/
│       └── appointments/
│           └── route.ts            # POST: crea lead + appointment en Supabase
├── components/
│   ├── layout/
│   │   ├── Header.tsx              # Nav fija con efecto glass al scroll
│   │   ├── Footer.tsx              # Footer con brand y social
│   │   └── AmbientBackground.tsx   # Nubes flotantes + dot pattern
│   ├── sections/
│   │   ├── Hero.tsx                # Sección hero con SVG y CTA
│   │   ├── Agenda.tsx              # Calendario interactivo + form (Client Component)
│   │   ├── Servicios.tsx           # Grid de 4 service cards
│   │   ├── Horarios.tsx            # Tabla de horarios con highlight del día actual
│   │   ├── Ubicacion.tsx           # Embed de Google Maps + info
│   │   └── CtaFinal.tsx            # CTA final con WhatsApp
│   ├── ui/
│   │   ├── WhatsAppFloat.tsx       # Botón flotante de WhatsApp
│   │   ├── RevealOnScroll.tsx      # Wrapper para animaciones reveal
│   │   └── SkyDivider.tsx          # Divisor decorativo reutilizable
│   └── calendar/
│       ├── Calendar.tsx            # Lógica del calendario interactivo
│       ├── TimeSlots.tsx           # Selección de horarios
│       └── AppointmentForm.tsx     # Form: servicio, nombre, teléfono, confirmación
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Cliente Supabase (browser)
│   │   ├── server.ts               # Cliente Supabase (server, con cookies)
│   │   └── types.ts                # Tipos generados de la BD
│   ├── whatsapp.ts                 # Helper para generar URLs de wa.me
│   ├── constants.ts                # WA_NUMBER, dirección, servicios, etc.
│   └── utils/
│       ├── date.ts                 # formatDate, helpers de calendario
│       └── cn.ts                   # className merger (clsx + tailwind-merge)
├── types/
│   └── database.ts                 # Tipos derivados del esquema Supabase
├── public/
│   └── (assets estáticos si se necesitan)
├── .env.local                      # SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY
└── ...                             # config files ya existentes
```

---

## 3. Mapa de secciones (HTML → Componente)

Cada componente recibe el HTML correspondiente sin cambios de markup salvo:
- Reemplazo de marca (`KC Obras` → `KC Asesorías Urbanas`).
- `class` → `className`.
- Atributos SVG en camelCase donde React lo exige (`stroke-width` → `strokeWidth`, `stroke-linejoin` → `strokeLinejoin`, etc.).
- Eventos `onclick`/`addEventListener` → handlers de React.

| Líneas HTML | Sección | Componente | Tipo |
|---|---|---|---|
| 1312–1313 | Ambient + dot pattern | `AmbientBackground.tsx` | Client (efectos JS) |
| 1318–1339 | Header / Nav | `Header.tsx` | Client (scroll listener) |
| 1344–1409 | Hero | `Hero.tsx` | Server |
| 1413–1473 | Agenda + Calendario | `Agenda.tsx` + `Calendar.tsx` + `AppointmentForm.tsx` | Client |
| 1478–1566 | Servicios | `Servicios.tsx` | Server |
| 1571–1666 | Horarios | `Horarios.tsx` | Client (highlight día actual) |
| 1670–1701 | Ubicación | `Ubicacion.tsx` | Server |
| 1704–1740 | CTA Final | `CtaFinal.tsx` | Server |
| 1744–1758 | Footer | `Footer.tsx` | Server |
| 1761–1763 | Floating WhatsApp | `WhatsAppFloat.tsx` | Server |

---

## 4. Estilos: paleta de colores unificada (sitio público + futuro panel admin)

**Principio fundamental**: el sitio público y el futuro panel administrativo comparten **la misma identidad visual**. Toda interfaz que se construya bajo esta marca (público o interno) usa la misma paleta, las mismas fuentes y las mismas variables CSS. Esto no es opcional — el panel admin no es un dashboard genérico, es KC Asesorías Urbanas vista desde adentro.

### 4.1 Paleta de colores oficial (CSS variables, extraídas del HTML)
```css
--bg:          #f7fbff;   /* fondo principal, azul muy pálido */
--bg-card:     #ffffff;   /* cards y superficies elevadas */
--bg-glass:    rgba(255, 255, 255, 0.72);  /* header glass effect */
--fg:          #1a2d3d;   /* texto principal */
--fg-soft:     #3d5a73;   /* texto secundario */
--dim:         #7a99b5;   /* texto terciario / labels */
--dim-2:       #a8c4d9;   /* bordes suaves */
--sky:         #5ba3d9;   /* color de marca principal */
--sky-deep:    #3b7dbf;   /* acentos y CTAs */
--sky-light:   #a0d0f0;
--sky-pale:    #dceefb;
--sky-glow:    rgba(91, 163, 217, 0.25);
--line:        rgba(91, 163, 217, 0.22);
--line-strong: rgba(91, 163, 217, 0.45);
```

**Tipografía oficial**:
- Serif display: `DM Serif Display` (títulos, hero)
- Sans-serif: `DM Sans` (cuerpo, UI)
- Mono: `IBM Plex Mono` (números, datos técnicos)

**Cualquier componente nuevo** —en el sitio público ahora o en el panel admin después— debe usar estas variables, no hardcodear colores. Si en Fase 2 necesitamos colores adicionales (verde de "pagado", rojo de "anulado", amarillo de "pendiente"), se agregan al `globals.css` como nuevas variables y se documentan ahí.

### 4.2 Estrategia técnica
Mantener el CSS del HTML como `globals.css` con todas sus variables y clases. **No reescribir a Tailwind**, porque el HTML usa muchas reglas custom (gradientes, animaciones, glass effects) que en Tailwind quedarían verbosas o requerirían config compleja. Tailwind se usará solo para utilidades nuevas que aparezcan.

### 4.3 Pasos
1. Copiar **todo el contenido entre `<style>` y `</style>`** (líneas ~11–1308 del HTML) a `app/globals.css`.
2. En `app/layout.tsx`, importar:
   ```ts
   import './globals.css';
   ```
3. Las fuentes de Google (`DM Sans`, `DM Serif Display`, `IBM Plex Mono`) cargarlas con `next/font/google` en `layout.tsx` y exponerlas como CSS variables sustituyendo `var(--sans)`, `var(--display)`, `var(--mono)`.

   ```ts
   import { DM_Sans, DM_Serif_Display, IBM_Plex_Mono } from 'next/font/google';

   const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-sans' });
   const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', style: ['normal','italic'], variable: '--font-display' });
   const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['300','400','500'], variable: '--font-mono' });
   ```

   Luego en `globals.css`, renombrar las variables existentes:
   ```css
   --sans: var(--font-sans), system-ui, sans-serif;
   --display: var(--font-display), 'Georgia', serif;
   --mono: var(--font-mono), monospace;
   ```

   Y aplicar las clases en el `<body>`:
   ```tsx
   <body className={`${dmSans.variable} ${dmSerif.variable} ${ibmMono.variable}`}>
   ```

### 4.4 Compatibilidad Tailwind v4
Tailwind v4 no interfiere con CSS variables. El `globals.css` puede empezar con:
```css
@import "tailwindcss";
```
y debajo todas las reglas del HTML. Las clases custom (`.hero`, `.service-card`, etc.) conviven sin conflictos con utilidades Tailwind.

---

## 5. Conversión de JavaScript → React

El `<script>` del HTML (líneas 1765–1989) tiene 5 piezas que se reparten así:

| Lógica del HTML | Dónde va en Next.js |
|---|---|
| `WA_NUMBER` y `waUrl()` | `lib/constants.ts` + `lib/whatsapp.ts` |
| Header scroll glass effect | `useEffect` en `Header.tsx` |
| Reveal on scroll (IntersectionObserver) | Componente `RevealOnScroll.tsx` (wrapper) |
| Nubes flotantes ambient | `useEffect` en `AmbientBackground.tsx` |
| Calendario interactivo + slots + form | `Calendar.tsx` + `AppointmentForm.tsx` con `useState` |
| Highlight día actual en horarios | `useEffect` en `Horarios.tsx` |

### 5.1 Patrón para Client Components
Cualquier componente con interactividad o estado lleva `"use client";` arriba. Servidores por defecto.

### 5.2 Reveal on Scroll — componente reutilizable
```tsx
// components/ui/RevealOnScroll.tsx
"use client";
import { useEffect, useRef, useState } from "react";

export function RevealOnScroll({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: 1 | 2 | 3 | 4 | 0;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setVisible(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const delayClass = delay ? ` d${delay}` : '';
  return (
    <div ref={ref} className={`reveal${delayClass}${visible ? ' in' : ''} ${className}`}>
      {children}
    </div>
  );
}
```

Uso (reemplaza `<div class="reveal d2">...`):
```tsx
<RevealOnScroll delay={2}>
  <div className="...">...</div>
</RevealOnScroll>
```

### 5.3 Calendario — refactor sugerido
El calendario del HTML tiene `let viewYear`, `let viewMonth`, `selectedDate`, `selectedSlot` como variables globales. En React eso es `useState`. La estructura sugerida:

```tsx
// components/calendar/Calendar.tsx
"use client";
import { useMemo, useState } from "react";

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DOW = ['L','M','X','J','V','S','D'];
const BUSINESS_DAYS = [1,2,3,4,5];
const MAX_MONTHS_AHEAD = 2;

export function Calendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  // ... lógica de renderizado idéntica al HTML pero con JSX
}
```

`AppointmentForm.tsx` orquesta: contiene `selectedDate`, `selectedSlot`, `service`, `name`, `phone`, valida y al hacer click llama al API route **y** abre WhatsApp.

---

## 6. Integración con Supabase

### 6.1 Cliente Supabase
Instalar:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

`lib/supabase/client.ts` (browser):
```ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

`lib/supabase/server.ts` (server, para API routes y Server Components):
```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookies) { cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );
}
```

### 6.2 Tipos de la base de datos
Generar con la CLI de Supabase:
```bash
npx supabase gen types typescript --project-id vsqtzfkswfhjlrvnksby > types/database.ts
```

(Requiere haber hecho `npx supabase login` antes y tener acceso al proyecto.)

### 6.3 API Route para crear citas
`app/api/appointments/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, phone, scheduledAt, serviceName, notes } = body;

  if (!fullName || !phone || !scheduledAt || !serviceName) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  // Sitio público: usa SERVICE_ROLE_KEY server-side para bypasear RLS de leads/appointments
  // (NUNCA exponer esa key al cliente).
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1) Upsert del lead por teléfono
  const { data: lead, error: leadErr } = await admin
    .from('leads')
    .upsert(
      { full_name: fullName, phone, source: 'Web' },
      { onConflict: 'phone' }
    )
    .select()
    .single();

  if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 });

  // 2) Buscar el service_type por nombre
  const { data: service } = await admin
    .from('service_types')
    .select('id')
    .eq('name', serviceName)
    .single();

  // 3) Crear el appointment
  const { data: appt, error: apptErr } = await admin
    .from('appointments')
    .insert({
      lead_id: lead.id,
      service_type_id: service?.id ?? null,
      scheduled_at: scheduledAt,
      status: 'agendada',
      notes: notes ?? 'Solicitud desde sitio web',
    })
    .select()
    .single();

  if (apptErr) return NextResponse.json({ error: apptErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, appointmentId: appt.id });
}
```

**Migración SQL extra requerida** (correr en SQL Editor antes de probar el endpoint):
```sql
create unique index if not exists idx_leads_phone_unique on public.leads(phone);
```

### 6.4 Llamada desde el cliente
En `AppointmentForm.tsx`, al confirmar:

```ts
async function handleConfirm() {
  if (!selectedDate || !selectedSlot || !service || !name || !phone) return;

  const scheduledAt = combineDateAndSlot(selectedDate, selectedSlot);

  // 1) Guardar en Supabase
  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: name,
        phone,
        scheduledAt,
        serviceName: service,
      }),
    });
    if (!res.ok) console.error('Error guardando cita');
  } catch (e) {
    console.error('Error de red', e);
    // No bloqueamos el flujo: aún si falla, abrimos WhatsApp
  }

  // 2) Abrir WhatsApp
  const msg = buildWhatsAppMessage({ date: selectedDate, slot: selectedSlot, service, name, phone });
  window.open(waUrl(msg), '_blank', 'noopener');
}
```

---

## 7. Constantes a centralizar

`lib/constants.ts`:

```ts
export const SITE = {
  name: 'KC Asesorías Urbanas',
  shortName: 'KC Asesorías Urbanas',
  tagline: 'Gestión Inmobiliaria Profesional',
  description: 'KC Asesorías Urbanas: firma especializada en gestión de trámites inmobiliarios, urbanismo y legalización de propiedades en Medellín y el Área Metropolitana.',
  city: 'Medellín',
  region: 'Área Metropolitana',
  address: 'Diagonal 50 # 49 - 84, Oficina 1203',
  whatsappNumber: '573011281492',
  email: '',  // completar si aplica
  mapsEmbedUrl: '...',  // copiar del HTML
} as const;

export const SERVICES = [
  'Legalización de posesiones',
  'Trámites notariales y urbanos',
  'Escrituración y mejoras',
  'Consultoría legal inmobiliaria',
  'Licencia de construcción',
  'Desenglobes',
  'Otro trámite',
] as const;

export const SCHEDULE = [
  { day: 'Lunes',     hours: '8:00 a.m. – 6:00 p.m.' },
  { day: 'Martes',    hours: '8:00 a.m. – 6:00 p.m.' },
  // ... extraer del HTML líneas ~1571–1666
];
```

`lib/whatsapp.ts`:
```ts
import { SITE } from './constants';

export function waUrl(msg: string) {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

export function buildAppointmentMessage(params: {
  date: Date; slot: string; service: string; name: string; phone: string;
}) {
  const { date, slot, service, name, phone } = params;
  return `Hola 👋 Quiero agendar una consulta con *${SITE.name}*

📅 *Fecha:* ${formatDateLong(date)}
🕐 *Hora:* ${slot}
📋 *Servicio:* ${service}

👤 *Nombre:* ${name}
📞 *Contacto:* ${phone}

¡Gracias, quedo atento a confirmación!`;
}
```

---

## 8. Metadata y SEO (`app/layout.tsx`)

```ts
import type { Metadata } from 'next';
import { SITE } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${SITE.name} — Trámites Inmobiliarios en ${SITE.city}`,
  description: SITE.description,
  openGraph: {
    title: `${SITE.name} — Trámites Inmobiliarios en ${SITE.city}`,
    description: SITE.description,
    locale: 'es_CO',
    type: 'website',
  },
};
```

---

## 9. Plan de ejecución paso a paso

Recomendación de orden para Claude Code, mínimo riesgo de regresiones visuales. **Hacer un commit + push al final de cada paso.**

1. **Preparación**
   - [ ] Renombrar `env` → `.env.local` y `gitignore` → `.gitignore` si aún están sin punto.
   - [ ] Verificar que `.env.local` esté en `.gitignore`.
   - [ ] Conectar repositorio remoto: `git remote add origin https://github.com/St4keholders/kcasesoriasurbanas.git`
   - [ ] `npm install @supabase/supabase-js @supabase/ssr clsx tailwind-merge`.
   - [ ] Commit: `chore: setup inicial — env, gitignore, dependencias Supabase`.

2. **Estilos globales**
   - [ ] Mover todo el `<style>` del HTML a `app/globals.css`.
   - [ ] Configurar fuentes con `next/font/google` en `app/layout.tsx`.
   - [ ] Verificar que la app arranque (`npm run dev`) y se vea el fondo `#f7fbff`.
   - [ ] Commit: `feat: estilos globales y fuentes (DM Sans, DM Serif Display, IBM Plex Mono)`.

3. **Layout y componentes estructurales**
   - [ ] `AmbientBackground.tsx`, `Header.tsx`, `Footer.tsx`, `WhatsAppFloat.tsx`, `RevealOnScroll.tsx`.
   - [ ] Componer `app/layout.tsx` con header + footer + ambient.
   - [ ] Commit: `feat: layout — header, footer, ambient background, whatsapp flotante`.

4. **Secciones estáticas**
   - [ ] `Hero.tsx` (sin interactividad).
   - [ ] `Servicios.tsx` (grid de cards desde un array de datos).
   - [ ] `Ubicacion.tsx` (iframe de Google Maps).
   - [ ] `CtaFinal.tsx`.
   - [ ] Commit: `feat: secciones estáticas — Hero, Servicios, Ubicacion, CtaFinal`.

5. **Sección con estado: Horarios**
   - [ ] `Horarios.tsx` con `useEffect` para resaltar el día actual.
   - [ ] Commit: `feat: sección Horarios con highlight del día actual`.

6. **Sección con estado: Agenda**
   - [ ] `Calendar.tsx` con su lógica de mes/grid/días bloqueados.
   - [ ] `TimeSlots.tsx`.
   - [ ] `AppointmentForm.tsx` orquestador (estado + validación + handler).
   - [ ] Commit: `feat: sección Agenda — calendario interactivo + form`.

7. **Conexión Supabase**
   - [ ] `lib/supabase/client.ts`, `lib/supabase/server.ts`.
   - [ ] Generar `types/database.ts`.
   - [ ] `app/api/appointments/route.ts` con la lógica de upsert lead + insert appointment.
   - [ ] Migración SQL extra: índice único en `leads.phone`.
   - [ ] Conectar `AppointmentForm.tsx` al endpoint.
   - [ ] Commit: `feat: integración Supabase — clientes + API route de citas`.

8. **Cambio de marca**
   - [ ] Verificar que `lib/constants.ts` use `KC Asesorías Urbanas`.
   - [ ] Búsqueda global del repo: no debe quedar `KC Obras` en ningún archivo.
   - [ ] Revisar el icono de la marca en el header (actualmente es una casita SVG; conservar a menos que el cliente proporcione logo).
   - [ ] Commit: `refactor: cambio de marca KC Obras → KC Asesorías Urbanas`.

9. **Pulido**
   - [ ] Lighthouse: mobile + desktop.
   - [ ] Verificar responsive en breakpoints 700px y 1024px.
   - [ ] Comprobar `prefers-reduced-motion`.
   - [ ] Verificar que el form se guarde correctamente en Supabase (consultar `select * from appointments order by created_at desc limit 1` después de probar).
   - [ ] Commit: `polish: pulido final + verificación cross-device`.

10. **Limpieza**
    - [ ] Borrar `base-de-proyecto.html` y `MODULOS_KC.docx` de la raíz (mover a `/docs` si se quieren conservar).
    - [ ] Commit final: `chore: limpieza de archivos de referencia` + push.

---

## 10. Lo que queda fuera de esta fase

Para no inflar el alcance, **no implementar todavía**:

- Panel administrativo interno (módulos de Citas internas, Ventas, Compras, KPIs, Admin). Eso es la **Fase 2** y vivirá en rutas tipo `/admin/*` con autenticación de Supabase y RLS activo. **Mantener la misma paleta de colores y tipografía** (ver sección 4).
- Autenticación de usuarios públicos (los visitantes no se logean).
- Envío automático de WhatsApp/email desde el backend (por ahora el usuario manda el mensaje manualmente desde su propio WhatsApp Web).
- Generación de PDFs de cotización/recibo (Fase 2).
- Sistema de comisiones por asesor (Fase 2).

---

## 11. Checklist de validación final

Antes de marcar la migración como completa:

- [ ] El sitio se ve **píxel a píxel idéntico** al HTML original, salvo el cambio de marca.
- [ ] Todas las animaciones funcionan: nubes, reveal, scroll del header, hover de service cards.
- [ ] El calendario solo permite seleccionar días laborales (L-V) dentro de los próximos 2 meses.
- [ ] Al confirmar una cita, **aparece un registro en la tabla `appointments` de Supabase** Y se abre WhatsApp.
- [ ] El botón flotante de WhatsApp y los enlaces del footer apuntan al número correcto.
- [ ] La página tiene `lang="es"` en `<html>` y la metadata correcta.
- [ ] No hay errores en consola del navegador ni en `npm run build`.
- [ ] `npm run lint` pasa sin warnings.
- [ ] Todos los commits están subidos a `https://github.com/St4keholders/kcasesoriasurbanas`.
- [ ] El archivo `.env.local` NO aparece en el repositorio remoto.

---

## 12. Referencia rápida — esquema Supabase relevante

Estas son las tablas que toca el sitio público. Detalles completos en `diseno_base_datos.md`.

**`leads`** (datos del prospecto):
- `id` uuid pk
- `full_name` text
- `phone` text ← índice único agregado en paso 7
- `email` text
- `source` text ← guardar `'Web'`
- `created_at` timestamptz

**`appointments`** (la cita):
- `id` uuid pk
- `lead_id` uuid → leads.id
- `service_type_id` uuid → service_types.id
- `scheduled_at` timestamptz
- `status` enum ← arranca en `'agendada'`
- `notes` text
- `created_at` timestamptz

**`service_types`** (catálogo, lookup por `name`):
- `name` text unique ← coincide con los strings del `<select>` del HTML

---

Fin del documento. Cualquier ambigüedad sobre estilo, marca o flujo de datos: preguntarme antes de inventar.
