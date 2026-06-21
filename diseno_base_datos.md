# KC — Diseño de Base de Datos en Supabase

Documento de referencia del esquema para los módulos Citas, Ventas, Compras, KPIs y Panel de Administración.

---

## 1. Stack y decisiones de arquitectura

**Supabase = PostgreSQL + Auth + Storage + Realtime.** Toda la lógica de permisos del Panel de Administración vive en **Row Level Security (RLS)** de Postgres, no en el frontend. Esto significa que aunque un usuario manipule el cliente, la base de datos rechaza cualquier consulta fuera de su rol.

**Roles definidos** (enum `user_role`):
- `admin` — ve todo, crea usuarios, administra catálogos
- `asesor` — Citas, Leads, Ventas (no ve Compras)
- `tesoreria` — solo Compras, proveedores y centros de costo (no ve Ventas ni Leads)

**Numeración consecutiva** (`V-2026-0001`, `C-2026-0001`) por trigger, reseteada por año.

**Auditoría** vía tabla `audit_log` (estructura lista, los triggers de captura los conectamos cuando definamos qué tablas auditar).

---

## 2. Mapa de tablas por módulo

### Módulo 1 — Citas
| Tabla | Propósito |
|---|---|
| `leads` | Datos del prospecto (compartido con Ventas) |
| `service_types` | Catálogo de servicios (Legalización, Notariales, Desenglobes…) |
| `appointments` | La cita: fecha, asesor, servicio, estado |
| `profiles` | Asesor asignado |

El campo `status` usa el enum `appointment_status` con los estados que pediste: agendada, en_curso, reprogramada, cancelada, atendida.

Para la **vista calendario + DataGrid** el frontend consulta la misma tabla; solo cambia cómo renderiza los datos.

### Módulo 2 — Ventas
| Tabla | Propósito |
|---|---|
| `sales` | La venta o cotización (mismo registro, diferente status) |
| `sale_items` | Líneas de detalle (permite varias servicios por venta) |
| `leads` | Cliente (FK desde sales) |
| `appointments` | Cita origen (FK opcional → pipeline visual) |

**Cotización → Venta sin duplicar:** una `sale` arranca con `status='cotizacion'` y pasa a `pendiente_pago` y luego `pagada`. El PDF generado se guarda en el bucket `receipts`, y `receipt_url` apunta a su ruta.

**Trazabilidad de asesor:** el campo `closed_by` registra quién cerró la venta, base para cálculo de comisiones.

**Bandeja de Prospectos:** se consulta con
```sql
select s.*, l.full_name, l.phone
from sales s join leads l on l.id = s.lead_id
where s.status in ('cotizacion','pendiente_pago')
order by s.created_at desc;
```

### Módulo 3 — Compras (Tesorería)
| Tabla | Propósito |
|---|---|
| `purchases` | Factura o gasto registrado |
| `cost_centers` | Catálogo (Papelería, Marketing, Viáticos, Notariales…) |
| `suppliers` | Proveedores (opcional; si no existe en catálogo, se usa `supplier_name`) |

**Aislamiento garantizado por RLS:** las policies de `purchases`, `cost_centers` y `suppliers` exigen rol `tesoreria` o `admin`. Un asesor que intente hacer `select * from purchases` recibe cero filas — Postgres lo bloquea antes de que el frontend lo vea.

El PDF de la factura del proveedor va al bucket `invoices`.

### Módulo 4 — KPIs
No hay tabla. Es una **vista** llamada `kpi_daily` que calcula al vuelo:

| Indicador | Fórmula |
|---|---|
| Tasa de Asistencia Diaria (%) | citas atendidas hoy / citas agendadas para hoy × 100 |
| Tasa de Conversión Diaria (%) | ventas pagadas hoy / citas atendidas hoy × 100 |
| Cashflow Neto Diario ($) | total ventas pagadas hoy − total compras pagadas hoy |
| Ticket Promedio Diario ($) | total ventas hoy / cantidad de ventas hoy |

El frontend consulta `select * from kpi_daily` y obtiene todo en una sola fila.

Para gráficas de tendencia, la función `kpi_for_date(fecha)` retorna los mismos KPIs para cualquier fecha (útil para construir el histórico de los últimos 30 días).

### Módulo 5 — Panel de Administración
| Tabla | Propósito |
|---|---|
| `profiles` | Perfil + rol del usuario |
| `audit_log` | Bitácora de cambios |

La creación de usuarios se hace por el **Auth de Supabase**; el trigger `on_auth_user_created` crea automáticamente el registro en `profiles` y le pone el rol (por defecto `asesor`, configurable en `raw_user_meta_data.role` al hacer signUp).

Para cambiar un rol manualmente desde el panel:
```sql
update profiles set role = 'tesoreria' where email = 'persona@kc.com';
```

---

## 3. Storage Buckets

| Bucket | Acceso | Contenido |
|---|---|---|
| `receipts` | privado | PDFs de recibos/cotizaciones (asesor, admin) |
| `invoices` | privado | PDFs de facturas de proveedores (tesoreria, admin) |
| `avatars` | público | Fotos de perfil de usuarios |

---

## 4. Pasos para dejar todo listo a Claude Code

1. **Crear el proyecto en Supabase** (https://supabase.com/dashboard) — escoge región `South America (São Paulo)` por latencia.
2. **Ejecutar el SQL**: abre SQL Editor → New Query → pega el contenido de `supabase_migration.sql` → Run. Es idempotente, lo puedes correr varias veces sin romper nada.
3. **Crear tu usuario admin**: Authentication → Users → Add user → con tu correo. Luego en SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'tu@correo.com';
   ```
4. **Guardar las credenciales** para Claude Code (Settings → API):
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (anon public)
   - `SUPABASE_SERVICE_ROLE_KEY` — **NO** la uses en el frontend; solo para tareas administrativas server-side.
5. **Variables de entorno** sugeridas para el `.env` del proyecto:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

---

## 5. Consultas frecuentes (snippets para el frontend)

**Citas de hoy del asesor logueado:**
```sql
select a.*, l.full_name, l.phone, s.name as service
from appointments a
join leads l on l.id = a.lead_id
left join service_types s on s.id = a.service_type_id
where a.scheduled_at::date = current_date
  and a.assigned_advisor_id = auth.uid()
order by a.scheduled_at;
```

**Pipeline de prospectos (Ventas):**
```sql
select s.id, s.sale_number, s.status, s.total, l.full_name, l.phone
from sales s
join leads l on l.id = s.lead_id
where s.status in ('cotizacion','pendiente_pago');
```

**Compras pendientes de pago:**
```sql
select p.*, cc.name as cost_center
from purchases p
join cost_centers cc on cc.id = p.cost_center_id
where p.status = 'pendiente_pago'
order by p.due_date nulls last;
```

**Dashboard de KPIs del día:**
```sql
select * from kpi_daily;
```

**KPIs de los últimos 30 días:**
```sql
select * from kpi_for_date(d::date)
from generate_series(current_date - 29, current_date, '1 day'::interval) d;
```

---

## 6. Lo que falta decidir (siguiente conversación)

- **Notificaciones / recordatorios** de citas: ¿WhatsApp (Twilio, WaSenderAPI), correo, ambos? Esto define si agregamos una tabla `notifications` o usamos Edge Functions con cron.
- **Cálculo de comisiones del asesor:** ¿porcentaje fijo, escalado, por tipo de servicio? Define si necesitamos `commission_rules`.
- **Multi-sucursal:** ¿una sola oficina por ahora, o ya hay varias? Si son varias, agregamos `branches` y una columna `branch_id` en las tablas operativas.
- **Conciliación bancaria / método de pago detallado:** si se necesita reportar a contabilidad/DIAN, tal vez convenga separar `payments` de `sales`.
- **Realtime:** Supabase Realtime es gratis para canales. ¿Quieres que el calendario de citas se actualice en vivo cuando un asesor mueva una cita?

Cuando definamos esto, hago el delta de migración (`002_xxx.sql`).
