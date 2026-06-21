# Guía Fase 2 — Panel Admin Funcional con CRUD por Rol

Documento de trabajo para Claude Code. **Refactoriza el panel admin actual** (que es de solo lectura y obliga a editar todo desde Supabase) para que cada rol tenga control completo sobre lo que le corresponde, directamente desde la web.

---

## 0. Contexto y problema actual

### Lo que se construyó en la fase anterior
El panel admin existe en `/admin/*` pero **es de solo lectura**. Muestra los datos de Supabase pero no permite crear, editar ni eliminar. Para cualquier operación, el usuario tiene que ir al dashboard de Supabase, lo cual:
- Es inviable para usuarios no técnicos (asesores, tesorera).
- Anula el propósito mismo de tener un panel administrativo.
- No respeta el modelo de roles definido en `MODULOS_KC.docx`.

### Lo que hay que construir
Un panel admin **completamente funcional**, donde:
- **Cada rol opera lo que le corresponde**, sin tocar nunca el dashboard de Supabase.
- **El admin puede crear usuarios** con rol asignado, desde una pantalla del panel (no desde SQL ni Supabase Auth).
- **La tesorera puede registrar compras y pagos**, gestionar proveedores y centros de costo.
- **El asesor puede crear y gestionar citas, leads y ventas**, mover una cita por su pipeline hasta cerrar la venta.
- **El admin puede ver KPIs** y todo lo de los otros roles.

### Matriz de permisos por rol

| Módulo / Acción | Admin | Asesor | Tesorería |
|---|:---:|:---:|:---:|
| **Usuarios**: crear, editar, eliminar, cambiar rol | ✅ | ❌ | ❌ |
| **Citas**: crear, editar, cambiar estado | ✅ | ✅ | ❌ |
| **Leads**: crear, editar, eliminar | ✅ | ✅ | ❌ |
| **Ventas**: crear cotización, cerrar venta, anular | ✅ | ✅ | ❌ |
| **Servicios (catálogo)**: crear, editar | ✅ | ❌ | ❌ |
| **Compras**: crear, editar, marcar pagada | ✅ | ❌ | ✅ |
| **Proveedores**: crear, editar | ✅ | ❌ | ✅ |
| **Centros de costo**: crear, editar | ✅ | ❌ | ❌ |
| **KPIs (dashboard)**: ver | ✅ | ❌ | ❌ |
| **Audit log**: ver | ✅ | ❌ | ❌ |

Esta matriz ya está implementada en la base de datos vía RLS (ver `supabase_migration.sql`). El panel solo refleja lo que la BD ya permite.

---

## 1. Estructura de rutas del panel

```
app/
├── admin/
│   ├── login/
│   │   └── page.tsx                        # Pantalla de login
│   ├── layout.tsx                          # Layout protegido (sidebar + auth check)
│   ├── page.tsx                            # Dashboard inicial (redirige según rol)
│   │
│   ├── usuarios/                           # Solo admin
│   │   ├── page.tsx                        # Lista de usuarios
│   │   ├── nuevo/page.tsx                  # Crear usuario
│   │   └── [id]/page.tsx                   # Editar usuario
│   │
│   ├── citas/                              # Asesor + Admin
│   │   ├── page.tsx                        # Lista + calendario
│   │   ├── nueva/page.tsx                  # Crear cita
│   │   └── [id]/page.tsx                   # Detalle / editar
│   │
│   ├── leads/                              # Asesor + Admin
│   │   ├── page.tsx                        # Lista de leads
│   │   ├── nuevo/page.tsx                  # Crear lead
│   │   └── [id]/page.tsx                   # Detalle (historial citas + ventas)
│   │
│   ├── ventas/                             # Asesor + Admin
│   │   ├── page.tsx                        # Pipeline (cotizaciones, pendientes, pagadas)
│   │   ├── nueva/page.tsx                  # Nueva cotización
│   │   └── [id]/page.tsx                   # Detalle + cerrar venta
│   │
│   ├── compras/                            # Tesorería + Admin
│   │   ├── page.tsx                        # Lista (pendientes, pagadas)
│   │   ├── nueva/page.tsx                  # Registrar compra
│   │   └── [id]/page.tsx                   # Detalle + marcar pagada
│   │
│   ├── proveedores/                        # Tesorería + Admin
│   │   ├── page.tsx                        # Lista
│   │   └── nuevo/page.tsx                  # Crear
│   │
│   ├── catalogos/                          # Solo admin
│   │   ├── servicios/page.tsx              # CRUD service_types
│   │   └── centros-costo/page.tsx          # CRUD cost_centers
│   │
│   ├── kpis/                               # Solo admin
│   │   └── page.tsx                        # Dashboard de indicadores
│   │
│   └── auditoria/                          # Solo admin
│       └── page.tsx                        # Bitácora de cambios
│
├── api/admin/
│   ├── users/
│   │   ├── route.ts                        # POST: crear usuario con rol
│   │   └── [id]/route.ts                   # PATCH, DELETE
│   └── upload/
│       └── route.ts                        # POST: subir PDF a Storage
│
└── middleware.ts                           # Protege /admin/* (excepto /admin/login)
```

---

## 2. Autenticación y protección de rutas

### 2.1 Middleware (raíz del proyecto: `middleware.ts`)

Bloquea todo `/admin/*` salvo `/admin/login`. Si el usuario no tiene sesión, redirige a login.

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = req.nextUrl;

  // Si está en /admin pero no logueado → login
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !user) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  // Si está logueado y va a /admin/login → dashboard
  if (pathname.startsWith('/admin/login') && user) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

### 2.2 Login page (`app/admin/login/page.tsx`)

Formulario con email + contraseña que llama a `supabase.auth.signInWithPassword()`. Diseño minimalista con la paleta del sitio público.

### 2.3 Layout protegido (`app/admin/layout.tsx`)

- Verifica usuario y rol server-side (`supabase.auth.getUser()` + lookup en `profiles`).
- Renderiza sidebar con items filtrados por rol.
- Provee el `userRole` por contexto (`AdminContext`) a los hijos para mostrar/ocultar botones.

```tsx
// Pseudo-código
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

if (!profile?.is_active) redirect('/admin/login');

return (
  <AdminContext.Provider value={{ user, profile }}>
    <Sidebar role={profile.role} />
    <main>{children}</main>
    <ProfileMenu user={profile} />
  </AdminContext.Provider>
);
```

### 2.4 Helper de verificación de rol

`lib/auth/require-role.ts`:
```ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Role = 'admin' | 'asesor' | 'tesoreria';

export async function requireRole(allowed: Role[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active || !allowed.includes(profile.role)) {
    redirect('/admin');  // o /admin/sin-acceso
  }

  return { user, profile };
}
```

Cada page server-side empieza con: `const { profile } = await requireRole(['admin','asesor']);`

---

## 3. Módulo Usuarios (solo admin)

### 3.1 Lista (`app/admin/usuarios/page.tsx`)
Tabla con columnas: nombre, email, rol, estado (activo/inactivo), fecha de creación. Botón "Nuevo usuario" arriba. Cada fila tiene acción "Editar" / "Desactivar".

### 3.2 Crear usuario (`app/admin/usuarios/nuevo/page.tsx`)
Formulario con: nombre completo, email, teléfono, rol (select: admin/asesor/tesorería), contraseña inicial.

**API route** (`app/api/admin/users/route.ts`):
```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // 1) Verificar que quien llama es admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 });
  }

  // 2) Crear usuario con admin API
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const body = await req.json();
  const { email, password, fullName, phone, role } = body;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // sin verificación de correo
    user_metadata: { full_name: fullName, role },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 3) Actualizar phone si vino
  if (phone) {
    await admin.from('profiles').update({ phone }).eq('id', data.user.id);
  }

  return NextResponse.json({ ok: true, userId: data.user.id });
}
```

### 3.3 Editar usuario (`app/admin/usuarios/[id]/page.tsx`)
Formulario con: nombre, teléfono, rol, estado activo. **No permite cambiar email** (eso requiere flujo aparte de Supabase). Botón separado de "Resetear contraseña" que llama a `admin.auth.admin.updateUserById(id, { password: 'nueva' })`.

### 3.4 Desactivar (no eliminar)
Soft-delete: `update profiles set is_active = false`. Los usuarios inactivos no pueden hacer login (lo valida `requireRole`).

---

## 4. Módulo Citas (asesor + admin)

### 4.1 Lista (`app/admin/citas/page.tsx`)
Vista doble:
- **Calendario** (mes en curso, navegable). Cada día muestra cantidad de citas; click en día → modal con las citas de ese día.
- **Lista filtrable**: tabs "Hoy / Esta semana / Próximas / Todas / Atendidas / Canceladas". Columnas: hora, cliente, servicio, asesor, estado, acciones.

### 4.2 Crear cita (`app/admin/citas/nueva/page.tsx`)
Form:
- Cliente: autocompletar buscando en `leads` por nombre/teléfono. Si no existe, botón "Crear nuevo lead" abre modal inline.
- Servicio: select desde `service_types`.
- Asesor asignado: select desde `profiles` con role='asesor' (admin lo asigna; si lo crea un asesor, se autoasigna por defecto).
- Fecha y hora.
- Duración (default 60 min).
- Notas.

### 4.3 Detalle / Editar (`app/admin/citas/[id]/page.tsx`)
Muestra info de la cita + del cliente. Botones de acción según estado:
- `agendada` → "Marcar como en curso", "Reprogramar", "Cancelar"
- `en_curso` → "Marcar como atendida"
- `atendida` → **"Crear cotización/venta a partir de esta cita"** (lleva a `/admin/ventas/nueva?appointmentId=xxx` con el cliente y servicio pre-llenados)
- En cualquier estado → "Editar notas"

**Server actions** para cada acción (no API routes, usar Server Actions de Next.js 15):
```ts
// app/admin/citas/actions.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateAppointmentStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('appointments')
    .update({ status, ...(status === 'atendida' && { attended_at: new Date().toISOString() }) })
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/admin/citas');
}

export async function createAppointment(data: FormData) {
  // ... insert
}
```

---

## 5. Módulo Leads (asesor + admin)

### 5.1 Lista (`app/admin/leads/page.tsx`)
Tabla con búsqueda por nombre/teléfono/cédula. Columnas: nombre, teléfono, fuente, citas, ventas, fecha registro.

### 5.2 Crear / Editar
Form simple: nombre completo, cédula, teléfono, email, fuente, notas.

### 5.3 Detalle (`app/admin/leads/[id]/page.tsx`)
Vista 360° del cliente:
- Datos de contacto.
- Historial de citas (todas, con estado).
- Historial de ventas (cotizaciones, pagadas).
- Botones: "Agendar cita", "Crear cotización".

---

## 6. Módulo Ventas (asesor + admin)

### 6.1 Pipeline (`app/admin/ventas/page.tsx`)
Vista tipo kanban (3 columnas):
1. **Cotizaciones** (`status = cotizacion`)
2. **Pendientes de pago** (`status = pendiente_pago`)
3. **Pagadas** (`status = pagada`) — mostrar solo las del mes en curso para no saturar.

Cada card: número, cliente, total, asesor. Click → detalle.

Filtros arriba: por asesor (admin ve a todos, asesor solo se ve a sí mismo por RLS), por rango de fechas.

### 6.2 Nueva cotización (`app/admin/ventas/nueva/page.tsx`)
- Cliente: si viene `?appointmentId=xxx`, pre-llenar. Si no, autocompletar.
- Items: lista dinámica donde el asesor agrega líneas. Cada línea: servicio (select), cantidad, precio unitario, subtotal calculado.
- Totales: subtotal automático (suma de líneas), descuento manual, impuesto (IVA configurable, 0% por defecto para servicios profesionales), total final.
- Notas.
- Botón "Guardar como cotización" → crea con `status = cotizacion`.

### 6.3 Detalle / Cerrar venta (`app/admin/ventas/[id]/page.tsx`)
Según estado:
- `cotizacion` → botones "Editar items", "Marcar como pendiente de pago", "Anular", **"Generar PDF cotización"**, "Enviar por WhatsApp" (genera link `wa.me` con mensaje pre-llenado al cliente).
- `pendiente_pago` → form para registrar pago: método (efectivo, transferencia, Nequi, etc.), fecha de pago, opcional subir comprobante PDF a Storage.
- `pagada` → solo vista. Botón "Generar PDF recibo".

### 6.4 Generación de PDF
Usar `@react-pdf/renderer` o `pdf-lib`. Componente PDF separado:
```tsx
// components/pdf/CotizacionPDF.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
// ... template con la paleta de colores de la marca
```

El PDF se sube a Storage bucket `receipts` y se guarda la URL en `sales.receipt_url`.

---

## 7. Módulo Compras (tesorería + admin)

### 7.1 Lista (`app/admin/compras/page.tsx`)
Tabs: "Pendientes de pago", "Pagadas (mes en curso)", "Todas". Columnas: número (C-2026-XXXX), proveedor, concepto, centro de costo, total, fecha factura, vencimiento, estado.

KPI superior: total pendiente de pago, total compras del mes.

### 7.2 Registrar compra (`app/admin/compras/nueva/page.tsx`)
Form:
- Proveedor: autocompletar desde `suppliers`. Botón "Crear proveedor" para uno nuevo.
- Si el proveedor no existe en el catálogo: campo libre `supplier_name`.
- Centro de costo: select desde `cost_centers`.
- Número de factura del proveedor.
- Concepto / descripción.
- Monto, IVA, total (auto-calculado).
- Fecha de factura, fecha de vencimiento.
- Subir PDF de la factura (a Storage bucket `invoices`).
- Notas.

Por defecto se crea con `status = pendiente_pago`.

### 7.3 Marcar como pagada (`app/admin/compras/[id]/page.tsx`)
Botón "Registrar pago" → modal con: método de pago, fecha de pago, comprobante opcional. Cambia `status = pagado` y setea `paid_at`.

### 7.4 Anular
Solo admin. Cambia `status = anulado`. No borra físicamente.

---

## 8. Módulo Proveedores (tesorería + admin)

CRUD simple en `app/admin/proveedores/*`. Lista paginada con búsqueda. Form: nombre, NIT/cédula, email, teléfono, dirección.

---

## 9. Módulo Catálogos (solo admin)

### 9.1 Servicios (`app/admin/catalogos/servicios/page.tsx`)
CRUD de `service_types`. Lista + form: nombre, descripción, precio base (opcional), activo.

### 9.2 Centros de costo (`app/admin/catalogos/centros-costo/page.tsx`)
CRUD de `cost_centers`. Lista + form: nombre, descripción, activo.

---

## 10. Módulo KPIs (solo admin)

### 10.1 Dashboard (`app/admin/kpis/page.tsx`)

Layout tipo dashboard ejecutivo con la paleta del sitio:

**Fila 1 — KPIs del día** (de `kpi_daily`):
- Citas agendadas hoy
- Citas atendidas hoy
- Tasa de asistencia (%)
- Ventas cerradas hoy
- Ventas totales hoy ($)
- Tasa de conversión (%)
- Ticket promedio ($)
- Compras del día ($)
- **Cashflow neto del día ($)** (KPI grande, destacado)

**Fila 2 — Gráficas históricas** (últimos 30 días, usando `kpi_for_date`):
- Línea: ventas diarias
- Línea: cashflow neto diario
- Barras: citas agendadas vs atendidas
- Donut: ventas por asesor (mes en curso)

Usar `recharts` o `chart.js`. Mantener la paleta sky/blue del sitio público, no colores genéricos de dashboard.

### 10.2 Filtros
Selector de rango de fechas arriba (default: últimos 30 días).

---

## 11. Módulo Auditoría (solo admin)

`app/admin/auditoria/page.tsx`: tabla simple con paginación de `audit_log`. Columnas: fecha/hora, usuario, acción, tabla, registro afectado. Click en fila expande JSON con `old_data` y `new_data`.

**Nota**: el `audit_log` requiere triggers de captura en las tablas críticas. Si aún no están creados, agregar migración SQL:

```sql
-- Trigger genérico de auditoría
create or replace function public.audit_trigger()
returns trigger language plpgsql as $$
begin
  insert into public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP = 'INSERT' then null else row_to_json(old) end,
    case when TG_OP = 'DELETE' then null else row_to_json(new) end
  );
  return coalesce(new, old);
end; $$;

create trigger audit_sales after insert or update or delete on public.sales
  for each row execute function public.audit_trigger();
create trigger audit_purchases after insert or update or delete on public.purchases
  for each row execute function public.audit_trigger();
create trigger audit_appointments after insert or update or delete on public.appointments
  for each row execute function public.audit_trigger();
create trigger audit_profiles after update on public.profiles
  for each row execute function public.audit_trigger();
```

---

## 12. Sidebar y navegación

`components/admin/Sidebar.tsx`. Items filtrados por rol:

```ts
const NAV_ITEMS = [
  { label: 'Inicio',         href: '/admin',              roles: ['admin','asesor','tesoreria'], icon: HomeIcon },
  { label: 'Citas',          href: '/admin/citas',        roles: ['admin','asesor'],             icon: CalendarIcon },
  { label: 'Leads',          href: '/admin/leads',        roles: ['admin','asesor'],             icon: UsersIcon },
  { label: 'Ventas',         href: '/admin/ventas',       roles: ['admin','asesor'],             icon: ShoppingCartIcon },
  { label: 'Compras',        href: '/admin/compras',      roles: ['admin','tesoreria'],          icon: ReceiptIcon },
  { label: 'Proveedores',    href: '/admin/proveedores',  roles: ['admin','tesoreria'],          icon: TruckIcon },
  { label: 'KPIs',           href: '/admin/kpis',         roles: ['admin'],                      icon: ChartIcon },
  { label: 'Usuarios',       href: '/admin/usuarios',     roles: ['admin'],                      icon: UserCogIcon },
  { label: 'Catálogos',      href: '/admin/catalogos',    roles: ['admin'],                      icon: TagIcon },
  { label: 'Auditoría',      href: '/admin/auditoria',    roles: ['admin'],                      icon: ListIcon },
];
```

Sidebar usa `lucide-react` para iconos. Mantener la paleta `--sky`, `--sky-deep`, `--fg-soft`. Item activo se resalta con fondo `var(--sky-pale)`.

Profile dropdown abajo del sidebar con nombre del usuario, rol como badge, y opción "Cerrar sesión" que llama a `supabase.auth.signOut()` y redirige a `/admin/login`.

---

## 13. Patrón de Server Actions

Convención para todos los módulos: cada carpeta tiene su `actions.ts` con server actions. Esto evita tener un montón de API routes redundantes.

```ts
// app/admin/ventas/actions.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SaleSchema = z.object({
  leadId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
  })),
  discount: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
});

export async function createQuotation(input: z.infer<typeof SaleSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No auth');

  const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = subtotal - input.discount + input.tax;

  const { data: sale, error } = await supabase
    .from('sales')
    .insert({
      lead_id: input.leadId,
      appointment_id: input.appointmentId ?? null,
      closed_by: user.id,
      status: 'cotizacion',
      subtotal, tax: input.tax, discount: input.discount, total,
    })
    .select().single();
  if (error) throw error;

  // Insertar items
  await supabase.from('sale_items').insert(
    input.items.map(i => ({
      sale_id: sale.id,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      subtotal: i.quantity * i.unitPrice,
    }))
  );

  revalidatePath('/admin/ventas');
  return sale.id;
}
```

---

## 14. Validación de formularios

Usar **zod** + **react-hook-form** en todos los formularios.

```bash
npm install zod react-hook-form @hookform/resolvers
```

Patrón para los formularios:
```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const Schema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  role: z.enum(['admin','asesor','tesoreria']),
  password: z.string().min(8),
});

type FormData = z.infer<typeof Schema>;

export function UserForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(Schema) });

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // ... handle result
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```

---

## 15. Componentes UI reutilizables a crear

Para no inventar cada vez, crear en `components/admin/ui/`:

| Componente | Uso |
|---|---|
| `DataTable.tsx` | Tabla con paginación, búsqueda, sort básico |
| `StatusBadge.tsx` | Badge coloreado según status (verde pagada, ámbar pendiente, rojo anulado) |
| `Modal.tsx` | Modal con backdrop, header, body, footer |
| `Drawer.tsx` | Panel lateral para forms de edición rápida |
| `ConfirmDialog.tsx` | "¿Seguro que quieres eliminar X?" |
| `MoneyInput.tsx` | Input formateado como moneda COP |
| `DateTimePicker.tsx` | Selector de fecha + hora |
| `LeadAutocomplete.tsx` | Search-as-you-type sobre `leads` |
| `EmptyState.tsx` | "No hay resultados" con CTA |
| `LoadingButton.tsx` | Botón con spinner durante submit |

Todos usan la paleta `--sky-*`, `--bg-*`, `--fg-*`, las mismas fuentes (`DM Sans`, `DM Serif Display` para títulos). **El admin debe verse como una extensión del sitio público**, no como un dashboard genérico.

---

## 16. Storage: PDFs de cotizaciones y facturas

### 16.1 Subir archivo (`app/api/admin/upload/route.ts`)
```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const bucket = formData.get('bucket') as string;  // 'receipts' | 'invoices'
  const path = formData.get('path') as string;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path: data.path });
}
```

### 16.2 Acceso a archivos
Las URLs son privadas. Para mostrarlas:
```ts
const { data } = await supabase.storage
  .from('receipts')
  .createSignedUrl(receiptPath, 60 * 60);  // 1 hora
return data?.signedUrl;
```

---

## 17. Plan de ejecución

Hacer un commit + push al final de cada paso.

1. **Setup base de auth y layout**
   - [ ] `middleware.ts` con protección de `/admin/*`
   - [ ] `app/admin/login/page.tsx`
   - [ ] `app/admin/layout.tsx` con verificación server-side
   - [ ] `lib/auth/require-role.ts`
   - [ ] `components/admin/Sidebar.tsx` con items filtrados por rol
   - [ ] `components/admin/ProfileMenu.tsx` con cerrar sesión
   - [ ] Commit: `feat(admin): auth + layout protegido + sidebar`

2. **Componentes UI reutilizables**
   - [ ] `DataTable`, `Modal`, `StatusBadge`, `MoneyInput`, `EmptyState`, etc.
   - [ ] Instalar `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`, `recharts`
   - [ ] Commit: `feat(admin): componentes UI reutilizables`

3. **Módulo Usuarios** (admin)
   - [ ] Lista, crear, editar, desactivar
   - [ ] API route `POST /api/admin/users` con verificación de rol
   - [ ] Commit: `feat(admin): CRUD de usuarios`

4. **Módulo Leads**
   - [ ] Lista, crear, editar, detalle 360°
   - [ ] Server actions
   - [ ] Commit: `feat(admin): CRUD de leads`

5. **Módulo Catálogos** (admin)
   - [ ] Servicios + centros de costo
   - [ ] Commit: `feat(admin): catálogos`

6. **Módulo Citas**
   - [ ] Lista (calendario + tabla), crear, editar, cambios de estado
   - [ ] Botón "Crear venta desde cita atendida"
   - [ ] Commit: `feat(admin): gestión de citas`

7. **Módulo Ventas**
   - [ ] Pipeline kanban, nueva cotización con items dinámicos
   - [ ] Cerrar venta con método de pago
   - [ ] PDF de cotización (`@react-pdf/renderer`)
   - [ ] Commit: `feat(admin): pipeline de ventas + PDFs`

8. **Módulo Proveedores**
   - [ ] CRUD básico
   - [ ] Commit: `feat(admin): proveedores`

9. **Módulo Compras**
   - [ ] Lista, registrar compra, marcar pagada, subir factura PDF
   - [ ] Commit: `feat(admin): registro de compras y pagos`

10. **Módulo KPIs**
    - [ ] Dashboard con `kpi_daily` view
    - [ ] Gráficas con `recharts` (paleta sky)
    - [ ] Commit: `feat(admin): dashboard de KPIs`

11. **Módulo Auditoría**
    - [ ] Migración SQL con triggers de auditoría
    - [ ] Página de bitácora con paginación
    - [ ] Commit: `feat(admin): auditoría`

12. **Pulido**
    - [ ] Tests manuales por rol (login como admin, asesor, tesorería; verificar que cada uno solo ve lo suyo)
    - [ ] Verificar que RLS bloquea acceso indebido aunque alguien manipule la URL
    - [ ] Mensajes de error claros en todos los formularios
    - [ ] Loading states en todas las acciones
    - [ ] Commit: `polish(admin): pulido final`

---

## 18. Pruebas de seguridad por rol

Antes de marcar como completa la Fase 2, verificar:

- [ ] Login como asesor: NO puede ir a `/admin/compras` (debe redirigir o mostrar "Sin acceso").
- [ ] Login como tesorería: NO puede ir a `/admin/ventas` ni `/admin/leads`.
- [ ] Login como asesor: en la lista de ventas solo ve sus propias ventas (RLS).
- [ ] Login como cualquiera salvo admin: NO puede llamar a `POST /api/admin/users` (debe responder 403).
- [ ] Un usuario desactivado (`is_active = false`) no puede hacer login.
- [ ] Manipular el JWT o las cookies no permite saltarse RLS (eso ya lo enforza Supabase).

---

## 19. Lo que queda fuera de esta fase

Para no inflar el alcance, **no implementar todavía**:

- Notificaciones automáticas (recordatorio de cita por WhatsApp/email).
- Sistema de comisiones por asesor (necesita reglas de negocio del cliente).
- Reportes exportables a Excel.
- Multi-sucursal.
- App móvil.

---

## 20. Resumen de impacto

Al terminar esta fase:

- **El admin** crea usuarios desde el panel, ve KPIs en vivo, audita cualquier cambio.
- **La tesorera** registra compras, pagos y proveedores sin tocar nunca Supabase.
- **El asesor** agenda citas, crea cotizaciones, cierra ventas y emite recibos.
- **Nadie** necesita entrar al dashboard de Supabase para operar.
- **Cada rol solo ve y opera lo suyo**, garantizado por RLS en la BD + UI filtrada en el panel.

Fin del documento.
