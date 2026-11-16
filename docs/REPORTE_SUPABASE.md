# Reporte Final de Saneamiento Contable y Supabase — KC Asesorías Urbanas S.A.S.

**Fecha de corte:** 16 de noviembre de 2026  
**Proyecto Supabase:** `vsqtzfkswfhjlrvnksby` (`SOFTWARE INTERNO` — `us-west-2`, PostgreSQL 17.6)  
**Rama de trabajo:** `feat/cierre-contable`

---

## 1. Qué se encontró y qué se saneó (con migración asociada)

| Hallazgo en Diagnóstico Inicial (`docs/DIAGNOSTICO_SUPABASE.md`) | Saneamiento Aplicado | Migración / Artefacto |
|---|---|---|
| **Sin carpeta `supabase/migrations/`** y SQL disperso en la raíz del repositorio (`migration_*.sql`, `fix_*.sql`, `supabase_schema.sql`). | Se movieron los SQL sueltos a `supabase/legacy/` y se construyó la línea base idempotente del esquema actual junto con la cadena formal de migraciones versionadas. | `supabase/migrations/20260101000000_baseline.sql` |
| **Permisos por rol rotos en RLS:** todas las políticas usaban `auth.role() = 'authenticated'` o `USING (true)`, permitiendo que cualquier usuario autenticado leyera/modificara compras, cajas menores y proveedores sin distinguir `admin`, `tesoreria` y `asesor`. | Se creó `public.has_role(VARIADIC allowed_roles public.user_role[])` (`SECURITY DEFINER`, `search_path = public`) y se reescribieron todas las políticas RLS por tabla, operación y rol usando `(SELECT public.has_role(...))` sin `FOR ALL`. | `supabase/migrations/20261116000100_fase2_saneamiento_rls_vistas_secuencias_auditoria.sql` |
| **3 errores `SECURITY DEFINER` en vistas** (`v_advisor_summary`, `v_sales_monthly`, `petty_cash_box_summary`) y exposición al rol `anon`. | Se recrearon con `WITH (security_invoker = true)` y se ejecutó `REVOKE ALL ON ... FROM anon`. Además se corrigió `petty_cash_box_summary` para incluir recargas (`total_income`) en el cálculo de `balance`. | `supabase/migrations/20261116000100_fase2_saneamiento_rls_vistas_secuencias_auditoria.sql` |
| **Numeración con condición de carrera** (`count(*) + 1` en compras, cajas menores, citas y ventas). | Se creó la tabla `public.document_sequences` y la función atómica `public.next_document_number(p_prefix, p_year, p_padding)` con `INSERT ... ON CONFLICT DO UPDATE`. | `supabase/migrations/20261116000100_fase2_saneamiento_rls_vistas_secuencias_auditoria.sql` |
| **Auditoría desconectada:** la tabla real era `audit_log` pero `/admin/auditoria` consultaba `audit_logs` y no había triggers automáticos. | Se instaló `public.fn_audit_log_trigger()` en todas las tablas operativas y contables, y se conectó `/admin/auditoria` a `public.audit_log`. | `supabase/migrations/20261116000100_fase2_saneamiento_rls_vistas_secuencias_auditoria.sql` |
| **Protección contra borrado físico:** existían `.delete()` directos en UI sobre compras, cajas menores y ventas. | Se instaló el trigger `prevent_financial_delete` que bloquea `DELETE` en tablas con movimientos financieros y se reemplazó en la UI por anulación controlada (`status = 'anulado'`, `void_reason`, `voided_at`, `voided_by`). | `supabase/migrations/20261116000100_fase2_saneamiento_rls_vistas_secuencias_auditoria.sql` |
| **Terceros duplicados y NIT comodín `000000000`** (55 proveedores con `000000000` y 463 filas con duplicados por nombre/NIT). | Se habilitó `pg_trgm`, se limpiaron los 55 `000000000` a `NULL`, se consolidó un único "Proveedor Ocasional" y se fusionaron 463 proveedores en **451 terceros únicos** en `public.third_parties` sin ejecutar `DELETE`. | `supabase/migrations/20261116000200_fase3_trgm_terceros_soportes.sql` y `scripts/fusionar-terceros.ts` (`docs/FUSION_TERCEROS.md`) |
| **Soportes en bucket público `receipts` y 20 links de Google Drive.** | Se creó el bucket privado `soportes` con políticas RLS de lectura/escritura para `admin` y `tesoreria`, endpoints firmados (`/api/soportes/upload-url`, `/api/soportes/view`), hash `sha256` y preservación de links Drive en `legacy_drive_url`. | `supabase/migrations/20261116000200_fase3_trgm_terceros_soportes.sql` |
| **Ausencia de motor contable de partida doble y PUC.** | Se crearon `chart_of_accounts` (PUC Decreto 2650 clases 1 a 6 hasta subcuenta), `third_parties`, `tax_parameters`, `payment_accounts`, `posting_rules`, `accounting_periods`, `accounting_settings`, `journal_entries`, `journal_lines`, `document_attachments` y `classification_feedback`, con triggers de partida doble (`total_debit = total_credit`) e inmutabilidad al contabilizar. | `supabase/migrations/20261116000300_fase4_motor_contable_puc_terceros_impuestos.sql` |
| **Ausencia de bandeja de ingesta de facturas y vista consolidada de pendientes legales.** | Se creó la tabla `public.document_ingestions` y la vista `public.v_pendientes_legales` (`security_invoker = true`) con los 11 motivos tributarios y contables exigidos para el cierre 2026. | `supabase/migrations/20261116000400_fase6b_y_fase7_ingesta_y_pendientes_legales.sql` |
| **Políticas permisivas superpuestas e índices FK faltantes en tablas nuevas.** | Se movió `pg_trgm` al esquema `extensions`, se separaron las políticas `INSERT`/`UPDATE` en tablas de parametrización contable, se restringió `EXECUTE` en funciones internas y se crearon los 21 índices de cobertura de llaves foráneas. | `supabase/migrations/20261116000500_fase10_saneamiento_advisors_final.sql` |

---

## 2. Comparativa de Advisors (Antes vs. Después)

| Categoría / Regla del Linter de Supabase | Antes (Diagnóstico Inicial) | Después (Fase 10) | Estado |
|---|---:|---:|---|
| **ERROR — `security_definer_view`** (`v_advisor_summary`, `v_sales_monthly`, `petty_cash_box_summary`) | **3** | **0** | Resuelto 100 % |
| **WARN — `rls_policy_always_true`** (`appointments`, `cost_centers`, `leads`, `petty_cash_boxes`, `petty_cash_entries`, `purchases`, `suppliers`) | **7** | **0** | Resuelto 100 % |
| **WARN — `rls_enabled_no_policy`** (`audit_log`, `sale_items`, `service_types`) | **3** | **0** | Resuelto 100 % |
| **WARN — `function_search_path_mutable`** (`current_user_role`, `is_admin`, `set_updated_at`) | **3** | **0** | Resuelto 100 % |
| **WARN — `extension_in_public`** (`pg_trgm`) | **1** (tras Fase 3) | **0** | Movida a `extensions` |
| **WARN — `auth_rls_initplan`** (evaluación por fila de `auth.uid()` / `auth.role()`) | **18** | **0** | Resuelto 100 % |
| **WARN — `multiple_permissive_policies`** | **9** | **0** | Resuelto 100 % |
| **INFO — `unindexed_foreign_keys`** | **8** | **0** | Resuelto 100 % (29 índices FK creados) |
| **WARN — `authenticated_security_definer_function_executable`** | N/A | **2** (`has_role`, `next_document_number`) | Intencional: requeridas por RLS y numeración desde sesión autenticada |
| **WARN — `auth_leaked_password_protection`** | **1** | **1** | Configuración de plan Supabase Auth Dashboard |

---

## 3. Cifras Contables y Tributarias 2026

### 3.1. Comprobantes generados en Borrador (`public.journal_entries`)

| Tipo de Comprobante | Estado | Cantidad | Total Débitos (COP) | Total Créditos (COP) | Diferencia |
|---|---|---:|---:|---:|---:|
| **CC** — Comprobante de Contabilidad (Causación) | `borrador` | 960 | $438.883.658 | $438.883.658 | $0 |
| **CE** — Comprobante de Egreso (Pago / Recarga) | `borrador` | 960 | $439.106.722 | $439.106.722 | $0 |
| **RC** — Recibo de Caja (Ventas pagadas) | `borrador` | 0 | $0 | $0 | $0 |
| **Total general en Libro Diario** | `borrador` | **1.920** | **$877.990.380** | **$877.990.380** | **$0** |

> *Nota:* Ningún comprobante fue pasado a `contabilizado` automáticamente, cumpliendo estrictamente la regla de la Sección A.

### 3.2. Resumen por Clase del PUC (`public.journal_lines`)

| Clase PUC | Descripción | Líneas | Total Débitos (COP) | Total Créditos (COP) |
|---|---|---:|---:|---:|
| **Clase 1** | Activos (`110510` Cajas menores, `111005` Bancos moneda nacional) | 961 | $300.000 | $439.106.722 |
| **Clase 2** | Pasivos (`210505` Proveedores nacionales, `230505` Cuentas corrientes comerciales, `240810` IVA descontable) | 1.995 | $442.430.985 | $438.883.658 |
| **Clase 5** | **Gastos de administración (Oficina Medellín)** | **738** | **$325.457.266** | **$0** |
| **Clase 6** | **Costos de ventas y de obra / proyectos (Tolú, Apto 306 Bello, etc.)** | **222** | **$109.802.129** | **$0** |
| **Total** | **Partida doble consolidada 2026** | **3.916** | **$877.990.380** | **$877.990.380** |

### 3.3. Pendientes Legales y Tributarios (`public.v_pendientes_legales`)

| Motivo en `v_pendientes_legales` | Cantidad de Registros | Valor Asociado (COP) |
|---|---:|---:|
| `borrador sin contabilizar` | 1.920 | $877.990.380 |
| `no obligado a facturar sin documento soporte de adquisiciones` (Res. DIAN 000167/2021) | 794 | $401.672.696 |
| `tercero sin identificar, sin RUT o con DV inválido` | 427 | $218.926.204 |
| `confianza baja` (< 0.85 en clasificación automática) | 373 | $167.545.173 |
| `posible duplicado` (mismo tercero + factura o misma fecha + valor) | 278 | $112.261.300 |
| `sin soporte` (sin archivo adjunto en Storage) | 132 | $54.460.374 |
| `gasto no deducible` (`539595` — gastos personales / sin relación de causalidad) | 35 | $20.377.856 |
| `soporte a nombre de tercero` (pagos notariales/prediales por cuenta de clientes) | 47 | $16.484.981 |
| `retención no practicada` (supera base UVT 2026 sin retención registrada) | 204 | $5.961.137 |
| `soporte que no es factura` (`cotizacion` / `cuenta_cobro` / `recibo`) | 1 | $875.000 |
| `iva descontable sin factura electrónica` | 0 | $0 |

---

## 4. Qué falta por completar y responsable asignado

| Tarea Pendiente para el Cierre Definitivo 2026 | Responsable | Ruta / Herramienta en el Sistema |
|---|---|---|
| **1. Confirmar en `/admin/contabilidad/parametrizacion`:** régimen de IVA, código CIIU, tarifas de ReteICA Medellín y Tolú, cuentas bancarias reales (`111005`) y nombres/tarjetas profesionales de quienes firman los comprobantes. | **Contador** | `/admin/contabilidad/parametrizacion` |
| **2. Revisar los 373 borradores con confianza baja (< 0.85):** confirmar o cambiar la subcuenta PUC (6 dígitos) o el centro de costo en la bandeja de borradores (cada cambio entrena automáticamente `posting_rules` y `classification_feedback`). | **Contador** | `/admin/contabilidad/borradores` |
| **3. Revisar los 35 gastos marcados como no deducibles (`539595`, $20.377.856) y los 47 pagos a nombre de terceros ($16.484.981):** definir cuáles se reclasifican a anticipos/cuentas por cobrar a clientes (`136595`) o préstamos a socios. | **Contador** | `/admin/contabilidad/pendientes` y `/admin/contabilidad/borradores` |
| **4. Contabilizar en bloque los comprobantes revisados:** usar el botón **Contabilizar en bloque** (exclusivo rol `admin`/contador) para pasar los borradores aprobados a `contabilizado`. | **Contador** | `/admin/contabilidad/borradores` |
| **5. Completar NIT, dígito de verificación y RUT de los terceros pendientes** y emitir el Documento Soporte en Adquisiciones a No Obligados a Facturar (Res. DIAN 000167 de 2021) en los casos requeridos. | **Auxiliar Contable / Tesorería** | `/admin/proveedores` y `/admin/contabilidad/pendientes` |
| **6. Subir los 132 soportes faltantes y reemplazar los 20 enlaces históricos de Google Drive** por sus archivos PDF/imagen en el bucket privado `soportes`. | **Auxiliar Contable / Tesorería** | `/admin/compras`, `/admin/caja-menor` y `/admin/ingesta` |
| **7. (Opcional) Configurar `OPENAI_API_KEY` en `.env.local` y habilitar Leaked Password Protection en Supabase Auth:** activa el paso 4 del clasificador IA y la lectura por visión de PDFs escaneados/fotos en `/admin/ingesta`. | **Dev** | `.env.local` y Dashboard de Supabase Auth |

---

## 5. Optimizaciones sugeridas

1. **Activación de `OPENAI_API_KEY` para OCR de imágenes y PDFs escaneados:** el servicio `lib/server/services/ingesta/index.ts` ya procesa sin costo ni IA todos los XML/ZIP DIAN y PDFs con texto embebido; agregar `OPENAI_API_KEY` habilitará la extracción automática sobre fotografías tomadas desde celular.
2. **Depuración periódica de índices `unused_index`:** tras 30 días de operación real del libro diario y de la bandeja de ingesta en producción, revisar `pg_stat_user_indexes` para conservar únicamente los índices con lecturas efectivas.
3. **Cierre mensual progresivo en `accounting_periods`:** una vez el contador contabilice cada mes de 2026, bloquear el periodo correspondiente para impedir inserciones retroactivas en meses ya declarados en retención en la fuente e IVA.

---

## 6. Lista de verificación manual de la UI

- [ ] **Inicio de sesión y permisos (`/login`):**
  - Iniciar sesión con usuario `admin`, `tesoreria` y `asesor`.
  - Verificar que un usuario con `is_active = false` es desconectado y redirigido a `/login?error=inactive`.
  - Verificar que `asesor` no puede ver ni navegar a `/admin/compras`, `/admin/proveedores`, `/admin/ingesta` ni `/admin/contabilidad/*`.
- [ ] **Diseño Liquid Glass y cargador `KcLoader`:**
  - Verificar en todo el panel admin el estilo Liquid Glass (`backdrop-filter: blur(20px) saturate(180%)`), sin rastros de sombras neumórficas `neu-*`.
  - Hacer clic entre módulos del menú lateral y confirmar que `KcLoader` (monograma "KC" con brillo glass) aparece en enlaces y botones cuando la espera supera 150 ms.
- [ ] **Ingesta de Facturas (`/admin/ingesta`):**
  - Subir un XML/ZIP de factura electrónica DIAN o un PDF con texto; verificar la vista dividida con previsualización a la izquierda, campos extraídos y cuenta PUC sugerida a la derecha, alertas de duplicados/DV y el botón **Aprobar y causar en borrador**.
- [ ] **Borradores y Parametrización (`/admin/contabilidad/borradores` y `/admin/contabilidad/parametrizacion`):**
  - Editar una cuenta o centro de costo en un borrador y verificar que se guarda la regla aprendida.
  - Con usuario `admin`, seleccionar un borrador de prueba y verificar el botón **Contabilizar seleccionados**.
- [ ] **Libro Diario, Mayor, Balance de Prueba y AZ (`/admin/contabilidad/libro-diario`):**
  - Filtrar por rango de fechas, tipo (`CC`, `CE`), tercero y cuenta; comprobar que **Total Débitos = Total Créditos**.
  - Cambiar entre las pestañas **Libro Diario**, **Libro Mayor**, **Auxiliar por Tercero** y **Balance de Prueba**.
  - Descargar el **XLSX**, el **PDF foliado**, el **PDF individual de un comprobante** (verificando margen izquierdo de 3.5 cm para AZ, marca de agua `BORRADOR`, valor en letras, enlace `CC ↔ CE`, firmas y soporte anexo) y probar el botón **Descargar AZ** con barra de progreso por lotes de 50.
- [ ] **Proveedores y Pendientes Legales (`/admin/proveedores/[id]` y `/admin/contabilidad/pendientes`):**
  - Abrir el detalle de un proveedor en `/admin/proveedores/[id]` y verificar sus KPIs 2026, tabla unificada de pagos (Tesorería + Cajas Menores + CE), enlaces al soporte y al comprobante PDF, y exportación a XLSX.
  - Abrir `/admin/contabilidad/pendientes`, filtrar por cada uno de los 11 motivos legales y exportar el reporte a XLSX.
