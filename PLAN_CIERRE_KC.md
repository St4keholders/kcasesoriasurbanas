# PLAN ÚNICO — Dejar KC lista para el cierre contable 2026
KC Asesorías Urbanas S.A.S · NIT 902012620-0

Este es el **único archivo** de instrucciones. Contiene las reglas, las decisiones contables (ya cerradas), las tareas y el registro de avance.
Para ejecutarlo: modo automático + `/goal` (comando al final del archivo).

---

## A. REGLAS PARA CLAUDE CODE (leer primero)

1. **No hagas preguntas.** Todas las decisiones están en la sección B. Si aparece algo no previsto, elige la opción que **no borre datos y deje todo en borrador**, escríbela en la sección F (Registro de supuestos) y continúa.
2. **Avance:** marca `[x]` en las casillas de **este mismo archivo** al terminar cada tarea. Si la sesión se reinicia, retoma desde la primera casilla sin marcar siguiendo el orden de la sección D.
3. **Nunca:**
   - `DELETE`, `TRUNCATE` ni `DROP` sobre tablas con datos (lo que sobra se anula o se marca);
   - pasar comprobantes a *contabilizado*, cerrar períodos ni generar comprobantes de cierre: **el cierre lo hace el contador**;
   - `git push --force`, reescribir el historial, merge a `main` ni desplegar a producción;
   - imprimir, copiar o subir valores de `.env.local`.
4. **Sí puedes, sin preguntar:** editar código, instalar dependencias, aplicar migraciones con el MCP de Supabase (después del backup), generar comprobantes en borrador, hacer commits en la rama `feat/cierre-contable` y hacer push de esa rama si el remoto lo permite.
5. **Después de cada fase:** `npm run typecheck && npm run lint && npm run test && npm run build` en verde. Si falla, arréglalo antes de seguir. Un commit por tarea, en español.
6. **Next.js 16:** antes de crear rutas, `loading.tsx`, server actions o tocar `proxy.ts`, lee la guía en `node_modules/next/dist/docs/`.
7. **Si algo externo falta**, aplica el respaldo de la sección C y continúa. No hay bloqueos que detengan el plan.

---

## B. DECISIONES CERRADAS (no volver a preguntar)

**Empresa:** régimen ordinario, responsable de IVA. El IVA solo es descontable con factura electrónica a nombre de KC; en cualquier otro caso suma al gasto o costo.
**Alcance:** dejar todo listo y en borrador para que el contador haga el cierre de 2026.

**Centros de costo**

| Centro | Tipo | Clase contable |
|---|---|---|
| Medellín | Oficina (administración) | **5 Gastos** |
| Tolú | Construcción en curso | **6 Costos** |
| Apto Bello | Construcción en curso | **6 Costos** |
| Cajas menores | Según el centro de costo de la caja; sin centro → Medellín | 5 |

**Cuentas** (prevalecen sobre el PUC estándar; se crean con estos nombres)

| Concepto | Cuenta |
|---|---|
| Ventas | 413505 VENTAS |
| Proveedores (compra de bienes) | 210505 PROVEEDORES |
| Cuentas por pagar de gastos y servicios | 230505 GASTOS |
| Bancos (casi todo se paga por transferencia) | 111005 BANCOS |
| Caja general | 110505 CAJA GENERAL |
| Caja menor | 110510 CAJA MENOR |
| IVA descontable | 240810 |
| Retención en la fuente | 2365xx según concepto (236540 compras, 236525 servicios, 236515 honorarios, 236530 arrendamientos) |
| Gastos de oficina | Clase 5; subcuenta según el gasto (la asigna el clasificador, Fase 6) |
| Costos de obra | Clase 6; subcuenta según el costo (clasificador); valor por defecto 612010 |
| Pagos notariales y de registro | Los asume KC, pero la factura sale a nombre del cliente → costo clase 6, valor por defecto 615595, y se marcan como pendiente "soporte a nombre de tercero" |
| Gastos personales | Gasto **no deducible**: 531595 GASTOS NO DEDUCIBLES, línea con `is_deductible = false` |
| Sin clasificación posible | Clase según el centro de costo, subcuenta `xx95` (Otros) de la cuenta más cercana, y a revisión |

**Firmas del comprobante:** Elaboró = nombre del usuario que lo creó (automático). Revisó = "Contador". Aprobó = "Representante legal". Las dos últimas con línea para firma a mano; los nombres se pueden cambiar en Parametrización.

**Retención en la fuente 2026** (tabla `tax_parameters` con vigencia por fechas): UVT $52.374. Bases compras/servicios de 10/2 UVT; **27/4 UVT del 8 de mayo al 30 de junio de 2026**; 10/2 UVT desde el 1 de julio. Tarifas: compras 2,5 %, servicios 4 %, honorarios 11 %, arrendamiento de inmuebles 3,5 %. El sistema calcula la retención **esperada**; si la factura no la trae, la marca como pendiente "retención no practicada" y **no** la inventa en el asiento.

**Soportes:** Supabase Storage (bucket privado `soportes`) es el almacenamiento principal; Drive queda solo como enlace histórico.
**IA:** OpenAI, con modelos en variables de entorno (`AI_MODEL_OCR`, `AI_MODEL_CLASIFICADOR`; si no existen, usar `gpt-4o`). Prioridad: clasificar la cuenta contable.
**Diseño:** liquid glass en paneles secundarios; se mantienen DM Sans, DM Serif Display, IBM Plex Mono y la paleta sky.

---

## C. RESPALDOS (qué hacer si falta algo)

| Si… | Entonces… |
|---|---|
| Falta `OPENAI_API_KEY` | El clasificador corre solo con reglas (pasos 1–3 de 6A); todo lo que quede sin resolver va a revisión con confianza 0. La lectura con IA se desactiva y se mantiene la carga manual. |
| Faltan credenciales de Drive | No migrar archivos de Drive; guardar el enlace en `legacy_drive_url` y anotarlo en el reporte final. |
| Falta `CRON_SECRET` | Generar uno aleatorio y agregarlo a `.env.local` sin mostrarlo. |
| No se puede hacer `pg_dump` | Hacer el backup con `execute_sql` (SELECT de cada tabla) a CSV en `backups/<fecha>/`. |
| Hay que probar permisos por rol | Probarlos en SQL simulando el JWT (`set local role authenticated; set local request.jwt.claims = …`) dentro de una transacción con `rollback`. No crear usuarios reales. |
| No hay navegador para probar la UI | Correr el build y pruebas de componentes; dejar en el reporte final una lista de verificación manual. |
| El push de la rama falla | Dejar los commits locales y anotarlo en la sección F. |
| Una migración choca con datos existentes | Corregir la migración para que conserve los datos (columna nueva, valor por defecto o marca), nunca borrarlos. |
| Algo no está previsto | Aplicar la regla A.1. |

---

## D. ORDEN DE EJECUCIÓN
0 → 1 → 2 → 3 → 4 (modelo y siembra) → 6A (clasificador) → 4 (backfill) → 5 → 6B → 7 → 8 → 9 → 10

---

## E. TAREAS

### FASE 0 — Arranque
- [x] Crear o usar la rama `feat/cierre-contable`.
- [x] Revisar que estén las variables de `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`) sin imprimir sus valores; aplicar la sección C a las que falten.
- [x] Confirmar con el MCP (`get_project`) que es el proyecto de KC.

### FASE 1 — Depurar el repositorio
- [x] Mover a `scripts/legacy/`: `auth-drive.js`, `get-token.js`, `get-url.js`, `check.js`, `fix_apto.js`, `script.js`, `append_css.js`, `test-pdf.js`, `test-purchase.ts`. `seed.js` → `scripts/seed.ts`.
- [x] Mover `*.xlsx`, `PAGOS KC.json` y `MODULOS KC.docx` a `../kc-datos-privados/` (fuera del repo). Agregar `*.xlsx`, `*.docx`, `backups/` y `datos/` a `.gitignore`. No tocar el historial de git.
- [x] `*.html` de referencia, `tokens.css` y `SKILL.md` → `docs/diseno/`. SQL de la raíz → `supabase/legacy/`.
- [x] `package.json`: scripts `typecheck` (`tsc --noEmit`), `test` (vitest), `db:types`; cambiar `xlsx` por `exceljs`.
- [x] `README.md` real: cómo correrlo, variables, módulos y roles.

### FASE 2 — Supabase: diagnóstico y saneamiento
- [x] Diagnóstico (solo lectura): `list_tables`, `list_migrations`, `get_advisors` (security y performance), y consultas SELECT de políticas, grants de vistas, triggers, funciones `security definer`, buckets, proveedores duplicados, compras en $0, entradas sin soporte y consecutivos duplicados. Guardar en `docs/DIAGNOSTICO_SUPABASE.md`.
- [x] Backup de todas las tablas de `public` en `backups/<fecha>/`.
- [x] Migración `baseline` del esquema real en `supabase/migrations/`.
- [x] Función `public.has_role(variadic public.user_role[])` (security definer, `search_path = public`) y reescritura de las políticas usándola, con esta matriz (aplica a tablas **y** buckets):

  | Recurso | admin | tesoreria | asesor |
  |---|---|---|---|
  | Cajas menores: ver | todas | todas | todas |
  | Cajas menores: crear, cargar soportes, editar | sí | sí | solo las que abrió |
  | Compras / Tesorería | sí | sí | no |
  | Proveedores: crear | sí | sí | sí |
  | Contabilidad: ver, borradores, PDF | sí | sí | no |
  | Contabilizar / anular contabilizados | sí | no | no |

- [x] Corregir la RLS de `petty_cash_entries` y del Storage para que tesorería pueda guardar (hoy la API la deja entrar y la base la rechaza).
- [x] `petty_cash_box_summary`: `total_spent` solo egresos, más `total_income` y `balance`.
- [x] Vistas con `security_invoker = true` y `revoke` para `anon`.
- [x] Consecutivos sin choques: tabla `document_sequences` + función `next_document_number()` (`UPDATE … RETURNING`) para compras, ventas y comprobantes.
- [x] Triggers de auditoría hacia `audit_log` en todas las tablas financieras; corregir la página de auditoría (`audit_logs` → `audit_log`).
- [x] Prohibir `DELETE` en tablas financieras y cambiarlo por anulación (`status = 'anulado'` + motivo, usuario y fecha) en la UI de compras y de caja menor.
- [x] Regenerar `types/database.ts`.

### FASE 3 — Backend estándar y soportes
- [x] Estructura: `lib/server/{auth,db,storage}.ts`, `lib/server/services/{terceros,compras,caja-menor,ventas,contabilidad,ingesta,ia}/`, `lib/validation/` (zod), `lib/utils/{money,nit,dates}.ts`.
- [x] Toda mutación pasa por `requireRole` → zod → servicio, y responde `{ ok, data } | { ok: false, error, code }`.
- [x] Corregir los 115 errores de TypeScript, quitar `as any` del dominio y **eliminar `ignoreBuildErrors`**.
- [x] Detalle de compra con los nombres de columna correctos (`concept`, `transaction_date`, `tax_iva`).
- [x] Usuario inactivo: cerrar sesión y redirigir a `/login` (hoy queda en bucle con `/admin/login`).
- [x] Terceros: NIT solo dígitos + DV validado (módulo 11 DIAN); buscar primero por NIT y luego por nombre con `pg_trgm`; un único tercero "Proveedor Ocasional"; eliminar el uso de `000000000`.
- [x] Soportes: bucket privado `soportes`; compresión de imágenes en el navegador (máx. 2000 px, JPEG 0.8); subida directa con *signed upload URL* (sin pasar por Vercel); ver con URL firmada; `sha256` para detectar duplicados.
- [x] Campo de archivo en "Añadir factura" manual de caja menor (`image/*, pdf, xml, zip`, con cámara en celular).
- [x] Script `scripts/migrar-drive-a-storage.ts` (aplicar la sección C si no hay credenciales).
- [x] Impresión de caja menor: reemplazar el `document.write` por el PDF de la Fase 5.
- [x] Tests: NIT/DV, montos colombianos, totales, permisos por rol (con el método de la sección C).

### FASE 4 — Motor contable (causación + egreso)
- [x] Tablas: `chart_of_accounts`, `third_parties` (migrando `suppliers` y fusionando duplicados por NIT; reporte en `docs/FUSION_TERCEROS.md`), `tax_parameters`, `posting_rules` (`source` manual/aprendida), `payment_accounts`, `journal_entries` (tipos CC, CE, RC, NC; estados borrador/contabilizado/anulado; `source_table`/`source_id`; `ai_confidence`; `ai_rationale`), `journal_lines` (débito, crédito, base, `is_deductible`), `classification_feedback`.
- [x] Triggers: al contabilizar, débitos = créditos; un comprobante contabilizado no se puede modificar y solo se anula con un reverso.
- [x] Siembra: PUC del Decreto 2650 para las clases 1 a 6 hasta subcuenta, con `keywords` en las clases 5 y 6; las cuentas de la sección B se crean con sus nombres; parámetros tributarios de la sección B; centros de costo de la sección B (crear los que falten).
- [x] Motor idempotente (por origen + tipo de comprobante). Todo queda en **borrador**:
  - Compra → **CC**: débito a la cuenta 5 o 6 (base) + 240810 si aplica; crédito a 2365xx si la factura trae retención, y a **210505** (bienes) o **230505** (gastos/servicios).
  - Su pago → **CE** con la misma fecha y enlazado: débito 210505/230505; crédito 111005 (o 110510 si es de caja menor).
  - Recarga de caja menor → **CE**: débito 110510, crédito 111005.
  - Venta pagada → **RC**: débito 111005, crédito **413505**.
- [x] Backfill (después de la 6A): generar CC + CE en borrador para todas las compras, entradas de caja menor y ventas de 2026. Resumen en `docs/BACKFILL.md`: cantidades, confianza baja, sin tercero, valor por cuenta, y tokens y costo de la IA.
- [x] UI `/admin/contabilidad/parametrizacion`: plan de cuentas, reglas, cuentas de pago, parámetros tributarios y firmas.
- [x] UI `/admin/contabilidad/borradores`: revisar, cambiar cuenta o centro de costo y botón **Contabilizar en bloque** (solo admin; lo usa el contador, no la IA).

### FASE 5 — Libro diario y comprobante para AZ
- [x] `/admin/contabilidad/libro-diario`: filtros (fechas, tipo, tercero, cuenta, centro de costo, estado), orden fecha → tipo → número, totales débito = crédito y paginación en servidor.
- [x] Exportar a XLSX (exceljs) y PDF (encabezado con razón social, NIT, rango de fechas y folio).
- [x] Libro mayor, auxiliar por tercero y balance de prueba por rango de fechas.
- [x] PDF del comprobante (`/api/contabilidad/comprobantes/[id]/pdf`, `@react-pdf/renderer` + `pdf-lib`):
  - tamaño carta, margen izquierdo de 3.5 cm para la AZ;
  - encabezado con razón social, NIT, número (`CE-2026-000123`) y fecha, y marca de agua BORRADOR o ANULADO cuando aplique;
  - tercero, concepto, líneas (código, cuenta, centro de costo, débito, crédito), totales y valor en letras;
  - comprobante enlazado (CC ↔ CE), firmas de la sección B y los soportes anexos como páginas siguientes.
- [x] Botón "Descargar comprobante" en el detalle de compra, la entrada de caja menor, el libro diario y el proveedor.
- [x] "Descargar AZ" por rango de fechas: un solo PDF con índice, comprobantes en orden y sus soportes, armado por lotes de 50 con barra de progreso.

### FASE 6 — IA optimizada
**6A. Clasificador de cuenta** (`lib/server/services/ia/clasificador.ts`), en este orden:
- [x] (1) **Centro de costo** → fija la clase (sección B).
- [x] (2) **Memoria por NIT** → si el tercero tiene 2 o más clasificaciones confirmadas a la misma subcuenta, usar esa.
- [x] (3) **Palabras clave** (`posting_rules`, `chart_of_accounts.keywords`).
- [x] (4) **Modelo de IA**, solo si los pasos anteriores no resuelven:
  - salida estructurada con un `enum` de las subcuentas válidas de esa clase, para que no pueda inventar cuentas;
  - devuelve `confidence`, `rationale` (máximo 20 palabras) y las marcas `posible_personal`, `soporte_a_nombre_de_tercero` y `posible_activo`;
  - recibe como contexto 5 ejemplos parecidos ya confirmados (con `pg_trgm`), y corre con temperatura 0.
- [x] (5) Confianza de 0.85 o más → borrador listo; menor → bandeja de revisión.
- [x] (6) Cada corrección se guarda en `classification_feedback` y crea una `posting_rule` aprendida.
- [x] (7) Caché por (NIT, concepto normalizado); procesar en lotes con concurrencia 4 y reintentos.
- [x] (8) `npm run eval:clasificador` con `tests/fixtures/clasificador.json` (anonimizado; casos de oficina, obras, notariales y personales). Meta: 90 % de acierto en la clase y 80 % en la subcuenta. Anotar el resultado en la sección F.

**6B. Lectura de facturas** (`lib/server/services/ingesta/`)
- [x] Tabla `document_ingestions` (ruta, sha256, origen, estado, tipo de documento, datos extraídos, confianza, advertencias).
- [x] XML/ZIP de factura electrónica DIAN: lectura directa sin IA (CUFE, NIT+DV, número, fecha, base, IVA, retenciones, total).
- [x] PDF con texto → texto + CUFE; PDF escaneado → páginas como imagen; imagen → visión. Salida estructurada con zod; se excluye el NIT de KC.
- [x] Validaciones: base + IVA − retenciones ≈ total (±1 peso), DV válido, fecha no futura y dentro de 2026, duplicados (sha256 / NIT + número / NIT + fecha + total) y total en $0 → advertencias. Nunca guardar en $0 sin revisión.
- [x] Al terminar se llama al clasificador 6A y se crean la compra + CC + CE en borrador.
- [x] Bandeja `/admin/ingesta`: documento a la izquierda; campos y cuenta sugerida a la derecha, con lo de baja confianza resaltado; botones Aprobar / Corregir.
- [x] Proveedor no identificado → Proveedor Ocasional + pendiente "identificar tercero".

### FASE 7 — Proveedores y pendientes legales
- [ ] `/admin/proveedores/[id]`: ficha, KPIs 2026 (total pagado, número de pagos, último pago, retenciones) y **todos los pagos** (tesorería, cajas menores y CE) con enlace al soporte y al PDF, filtros y exportación a XLSX.
- [ ] Lista de proveedores con las columnas "Total pagado 2026" y "Pendientes".
- [ ] Vista `v_pendientes_legales` con estos motivos:
  - sin soporte;
  - soporte que no es factura;
  - no obligado a facturar sin documento soporte de adquisiciones (Res. DIAN 000167 de 2021);
  - tercero sin identificar, sin RUT o con DV inválido;
  - retención no practicada;
  - IVA descontable sin factura electrónica;
  - gasto no deducible;
  - soporte a nombre de tercero;
  - posible duplicado;
  - confianza baja;
  - borrador sin contabilizar.
- [ ] `/admin/contabilidad/pendientes`: totales por motivo y valor, filtros, acciones por fila y exportación a XLSX.

### FASE 8 — UI: liquid glass, textos y colores
- [ ] Un solo sistema de estilos (`app/styles/tokens.css` + primitivas). Eliminar `neu-forms.css` y las 92 clases `neu-*`; recortar `globals.css` y `admin-styles.css`.
- [ ] Tokens glass: blanco al ~55 %, `backdrop-filter: blur(20px) saturate(180%)`, borde claro de 1 px, brillo interior y sombra sky suave; fondo sólido de respaldo si no hay `backdrop-filter`.
- [ ] Aplicar a modales, drawers, detalles, ficha de proveedor, bandeja de ingesta, borradores y filtros; ajustar los paneles principales para que combinen.
- [ ] Contraste WCAG AA (≥ 4.5:1), con test automático sobre los tokens.
- [ ] Textos en español con tuteo y tildes; estados legibles; COP sin decimales; fechas `dd MMM yyyy`; sin emojis ni textos de relleno.
- [ ] Actualizar `DIRECTRICES_PANEL_ADMIN.md` con el sistema liquid glass.

### FASE 9 — Animación SVG de carga
- [ ] `components/ui/KcLoader.tsx`: SVG inline de menos de 3 KB, de unos 1.2 s en bucle (el monograma "KC" se dibuja y lo recorre un brillo glass); `role="status"`; con `prefers-reduced-motion`, solo un pulso.
- [ ] Usarlo en `app/admin/loading.tsx` y en un `loading.tsx` por módulo, al hacer clic en enlaces (estado pendiente del link en Next 16) y en botones que ejecutan acciones; mostrarlo solo si la espera pasa de 150 ms.

### FASE 10 — Verificación y reporte
- [ ] typecheck, lint, test y build en verde, sin `ignoreBuildErrors`.
- [ ] `get_advisors` de nuevo, comparado con el diagnóstico inicial.
- [ ] `docs/REPORTE_SUPABASE.md`:
  - qué se encontró y qué se saneó, con la migración de cada arreglo;
  - advisors antes y después;
  - cifras: borradores, valor en clase 5 y clase 6, pendientes por motivo y valor;
  - lo que falta, con responsable (dev / auxiliar / contador);
  - optimizaciones sugeridas;
  - lista de verificación manual de la UI.
- [ ] Commit final y push de la rama (sin merge).

---

## F. REGISTRO DE SUPUESTOS Y RESULTADOS
*(Claude Code escribe aquí: decisiones no previstas que tomó, respaldos aplicados de la sección C, resultado de la evaluación del clasificador y cualquier cosa que el contador deba saber.)*

- **Fase 0 — Variables de entorno y proyecto Supabase:**
  - Se mapearon en `.env.local` las llaves existentes (`project_url`, `publishable_key`, `Secret_key`, `Token`) hacia los nombres estándar de Next.js (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`) sin exponer sus valores.
  - Se aplicó respaldo de Sección C para `CRON_SECRET`: se generó un valor aleatorio criptográfico de 32 bytes en `.env.local`.
  - Se aplicó respaldo de Sección C para `OPENAI_API_KEY` (ausente en `.env.local`): el clasificador operará con las reglas determinísticas (pasos 1 a 3 de 6A: centro de costo, memoria por NIT, palabras clave de `posting_rules` y `chart_of_accounts`), enviando lo no resuelto a revisión con confianza 0; la ingesta opera con parser determinístico XML/ZIP DIAN, texto PDF/CUFE y carga asistida. Si se agrega `OPENAI_API_KEY` posteriormente, el paso 4 (modelo OpenAI) queda cableado y listo para activarse automáticamente.
  - Se confirmó el proyecto Supabase de KC (`vsqtzfkswfhjlrvnksby` — `SOFTWARE INTERNO`, `ACTIVE_HEALTHY`, `us-west-2`).
- **Fase 3 — Soportes y migración de Google Drive:**
  - Se aplicó respaldo de Sección C en `scripts/migrar-drive-a-storage.ts`: al no existir credenciales de API de Google Drive en `.env.local`, los 20 enlaces históricos de Drive en `petty_cash_entries` fueron preservados en `legacy_drive_url` sin alterar `receipt_url`, mientras que toda nueva carga de soportes opera directamente contra el bucket privado `soportes` de Supabase Storage mediante URLs firmadas y hash `sha256`.
  - Se eliminaron todos los usos del comodín `000000000` (55 registros saneados a `NULL`) y se consolidó un único tercero activo "Proveedor Ocasional".
- **Fase 4 y Fase 6A — Evaluación del clasificador y Backfill 2026:**
  - Resultado de `npm run eval:clasificador` sobre `tests/fixtures/clasificador.json` (20 casos representativos de oficina Medellín, obras Tolú/Apto Bello, pagos notariales a nombre de tercero y gastos personales no deducibles):
    - **Acierto en clase contable (5 vs 6):** `20/20` (**100.0 %**, meta ≥ 90 %).
    - **Acierto en subcuenta PUC (6 dígitos):** `18/20` (**90.0 %**, meta ≥ 80 %).
  - **Fusión de terceros (`docs/FUSION_TERCEROS.md`):** de 463 proveedores en `suppliers` se consolidaron 451 terceros únicos en `third_parties` (11 grupos duplicados fusionados sin `DELETE`).
  - **Backfill contable 2026 (`docs/BACKFILL.md`):** se generaron 1.920 comprobantes en estado `borrador` (960 `CC` + 960 `CE` enlazados) con partida doble exacta (Débitos = Créditos = `$877.990.380`), 373 causaciones marcadas para revisión por confianza baja y 0 tokens de IA consumidos gracias al motor determinístico de reglas + respaldo Sección C.

---

## G. CÓMO EJECUTARLO
1. Copiar este archivo a la raíz del repo y activar el **modo automático** de Claude Code.
2. Pegar:
```
/goal Todas las casillas de PLAN_CIERRE_KC.md están marcadas, existe docs/REPORTE_SUPABASE.md y `npm run typecheck && npm run lint && npm run test && npm run build` termina con código 0. Sigue PLAN_CIERRE_KC.md en el orden de la sección D, respetando las reglas de la sección A, sin hacer preguntas. O detente después de 200 turnos.
```
