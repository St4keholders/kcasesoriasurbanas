# KC Asesorías Urbanas S.A.S — Plataforma Operativa y Contable

Plataforma interna de gestión comercial, operativa, tesorería, cajas menores y motor contable para **KC Asesorías Urbanas S.A.S** (NIT `902012620-0`).

---

## Cómo correr el proyecto

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   Crear el archivo `.env.local` en la raíz del proyecto con las variables descritas abajo.

3. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abrir `http://localhost:3000`.

4. **Comandos de calidad y verificación:**
   ```bash
   npm run typecheck          # Verificación estática de TypeScript (tsc --noEmit)
   npm run lint               # Linter ESLint
   npm run test               # Suite de pruebas unitarias e integración (Vitest)
   npm run eval:clasificador  # Evaluación del clasificador contable con fixtures
   npm run build              # Compilación de producción de Next.js 16
   npm run db:types           # Regenerar types/database.ts desde Supabase
   ```

---

## Variables de entorno (`.env.local`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL pública del proyecto en Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (`anon` / `publishable`) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave `service_role` (uso exclusivamente en servidor) |
| `OPENAI_API_KEY` | Opcional | Clave de OpenAI para clasificación asistida y visión OCR (si falta, opera el motor determinístico de reglas + XML/texto) |
| `AI_MODEL_OCR` | Opcional | Modelo para visión/OCR (por defecto `gpt-4o`) |
| `AI_MODEL_CLASIFICADOR` | Opcional | Modelo para el clasificador contable (por defecto `gpt-4o`) |
| `CRON_SECRET` | Sí | Secreto para proteger endpoints de tareas programadas |

---

## Módulos principales

- **Sitio público y agendamiento (`/`)**: Landing page institucional y reserva de citas para asesorías urbanas.
- **Dashboard (`/admin`)**: Resumen de indicadores operativos, citas y flujo de caja según rol.
- **Leads y Citas (`/admin/leads`, `/admin/citas`)**: Gestión del embudo comercial y calendario de atención.
- **Ventas (`/admin/ventas`)**: Registro de ventas, pagos de clientes y generación de recibos de caja (**RC**).
- **Compras / Tesorería (`/admin/compras`)**: Registro de compras por centro de costo (`Medellín`, `Tolú`, `Apto Bello`), carga de soportes en bucket privado `soportes` y causación/egreso en borrador (**CC** + **CE**).
- **Cajas Menores (`/admin/caja-menor`)**: Control de cajas menores, recargas, gastos, soportes y generación de PDF de comprobantes.
- **Proveedores / Terceros (`/admin/proveedores`)**: Directorio unificado con validación de NIT y dígito de verificación (DIAN módulo 11), KPIs 2026, pagos consolidados y exportación a XLSX.
- **Ingesta Documental (`/admin/ingesta`)**: Lectura de facturas electrónicas DIAN (XML/ZIP), PDF e imágenes con validaciones tributarias y sugerencia de cuenta contable.
- **Contabilidad (`/admin/contabilidad/*`)**:
  - **Borradores (`/admin/contabilidad/borradores`)**: Revisión de asientos en borrador, cambio de cuenta/centro de costo y contabilización en bloque (exclusivo para el contador/admin).
  - **Libro Diario, Mayor, Auxiliar y Balance de Prueba (`/admin/contabilidad/libro-diario`)**: Consulta con filtros, exportación a XLSX y PDF, y descarga de paquete **AZ** foliado con soportes.
  - **Pendientes Legales (`/admin/contabilidad/pendientes`)**: Tablero de hallazgos tributarios y documentales (`v_pendientes_legales`).
  - **Parametrización (`/admin/contabilidad/parametrizacion`)**: Plan Único de Cuentas (PUC), reglas de contabilización, cuentas de pago, parámetros de retención en la fuente 2026 y firmas de comprobantes.
- **Auditoría y Usuarios (`/admin/auditoria`, `/admin/usuarios`)**: Trazabilidad inmutable en `audit_log` y administración de perfiles.

---

## Roles y matriz de permisos

| Recurso | `admin` | `tesoreria` | `asesor` |
|---|---|---|---|
| Cajas menores: ver | Todas | Todas | Todas |
| Cajas menores: crear, cargar soportes, editar | Sí | Sí | Solo las que abrió |
| Compras / Tesorería | Sí | Sí | No |
| Proveedores / Terceros: crear | Sí | Sí | Sí |
| Contabilidad: ver, borradores, PDF, AZ | Sí | Sí | No |
| Contabilizar / anular contabilizados | Sí | No | No |
