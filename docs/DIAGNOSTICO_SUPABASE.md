# Diagnóstico Inicial de Supabase — KC Asesorías Urbanas S.A.S

Fecha de corte del diagnóstico: `2026-11-16`
Proyecto: `vsqtzfkswfhjlrvnksby` (`SOFTWARE INTERNO`, región `us-west-2`)

---

## 1. Tablas y Vistas en `public` (`list_tables`)

| Nombre | Tipo | RLS Habilitado | Filas Actuales |
|---|---|---|---|
| `appointments` | BASE TABLE | Sí | 0 |
| `audit_log` | BASE TABLE | Sí | 0 |
| `cost_centers` | BASE TABLE | Sí | 3 |
| `leads` | BASE TABLE | Sí | 1 |
| `petty_cash_boxes` | BASE TABLE | Sí | 3 |
| `petty_cash_entries` | BASE TABLE | Sí | 37 |
| `profiles` | BASE TABLE | Sí | 7 |
| `purchases` | BASE TABLE | Sí | 1048 |
| `sale_items` | BASE TABLE | Sí | 1 |
| `sales` | BASE TABLE | Sí | 1 |
| `service_types` | BASE TABLE | Sí | 6 |
| `suppliers` | BASE TABLE | Sí | 463 |
| `kpi_daily` | VIEW | N/A (Vista) | - |
| `petty_cash_box_summary` | VIEW | N/A (Vista) | - |
| `petty_cash_entries_full` | VIEW | N/A (Vista) | - |

## 2. Migraciones Registradas (`list_migrations`)

- Total de migraciones en `supabase_migrations.schema_migrations`: **0**.
- Todo el esquema previo fue aplicado manualmente en el SQL Editor a partir de archivos sueltos en la raíz del repositorio.

## 3. Advisors de Seguridad (`get_advisors: security`)

Total de hallazgos de seguridad iniciales: **17**

| Nivel | Regla | Detalle | Remediación |
|---|---|---|---|
| **ERROR** | `security_definer_view` | View \`public.kpi_daily\` is defined with the SECURITY DEFINER property | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view) |
| **ERROR** | `security_definer_view` | View \`public.petty_cash_entries_full\` is defined with the SECURITY DEFINER property | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view) |
| **ERROR** | `security_definer_view` | View \`public.petty_cash_box_summary\` is defined with the SECURITY DEFINER property | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view) |
| **WARN** | `function_search_path_mutable` | Function \`public.set_updated_at\` has a role mutable search_path | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) |
| **WARN** | `function_search_path_mutable` | Function \`public.generate_sale_number\` has a role mutable search_path | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) |
| **WARN** | `function_search_path_mutable` | Function \`public.generate_purchase_number\` has a role mutable search_path | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) |
| **WARN** | `function_search_path_mutable` | Function \`public.calc_purchase_total\` has a role mutable search_path | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) |
| **WARN** | `function_search_path_mutable` | Function \`public.kpi_for_date\` has a role mutable search_path | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) |
| **WARN** | `anon_security_definer_function_executable` | Function `public.create_test_user(p_email text, p_password text, p_full_name text, p_role public.user_role)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/create_test_user`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) |
| **WARN** | `anon_security_definer_function_executable` | Function `public.current_user_role()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/current_user_role`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) |
| **WARN** | `anon_security_definer_function_executable` | Function `public.handle_new_user()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_user`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) |
| **WARN** | `anon_security_definer_function_executable` | Function `public.is_admin()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/is_admin`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) |
| **WARN** | `authenticated_security_definer_function_executable` | Function `public.create_test_user(p_email text, p_password text, p_full_name text, p_role public.user_role)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/create_test_user`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) |
| **WARN** | `authenticated_security_definer_function_executable` | Function `public.current_user_role()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/current_user_role`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) |
| **WARN** | `authenticated_security_definer_function_executable` | Function `public.handle_new_user()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_user`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) |
| **WARN** | `authenticated_security_definer_function_executable` | Function `public.is_admin()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/is_admin`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | [Doc](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) |
| **WARN** | `auth_leaked_password_protection` | Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org. Enable this feature to enhance security. | [Doc](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) |

## 4. Advisors de Rendimiento (`get_advisors: performance`)

Total de hallazgos de rendimiento iniciales: **79**

| Regla | Nivel | Cantidad | Descripción |
|---|---|---|---|
| `unindexed_foreign_keys` | INFO | 7 | Unindexed foreign keys ([Doc](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)) |
| `auth_rls_initplan` | WARN | 8 | Auth RLS Initialization Plan ([Doc](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)) |
| `unused_index` | INFO | 19 | Unused Index ([Doc](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)) |
| `multiple_permissive_policies` | WARN | 45 | Multiple Permissive Policies ([Doc](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)) |

### Claves foráneas sin índice detectadas:
- Table \`public.appointments\` has a foreign key \`appointments_created_by_fkey\` without a covering index. This can lead to suboptimal query performance.
- Table \`public.appointments\` has a foreign key \`appointments_service_type_id_fkey\` without a covering index. This can lead to suboptimal query performance.
- Table \`public.leads\` has a foreign key \`leads_created_by_fkey\` without a covering index. This can lead to suboptimal query performance.
- Table \`public.petty_cash_boxes\` has a foreign key \`petty_cash_boxes_cost_center_id_fkey\` without a covering index. This can lead to suboptimal query performance.
- Table \`public.purchases\` has a foreign key \`purchases_created_by_fkey\` without a covering index. This can lead to suboptimal query performance.
- Table \`public.sale_items\` has a foreign key \`sale_items_service_type_id_fkey\` without a covering index. This can lead to suboptimal query performance.
- Table \`public.sales\` has a foreign key \`sales_appointment_id_fkey\` without a covering index. This can lead to suboptimal query performance.

## 5. Políticas RLS Actuales (`pg_policies`)

| Esquema | Tabla | Política | Comando | Roles | Expresión USING | Expresión WITH CHECK |
|---|---|---|---|---|---|---|
| `public` | `appointments` | `appointments_read` | SELECT | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` | `` |
| `public` | `appointments` | `appointments_write` | ALL | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` |
| `public` | `audit_log` | `audit_log_insert` | INSERT | `{public}` | `` | `(auth.uid() IS NOT NULL)` |
| `public` | `audit_log` | `audit_log_read` | SELECT | `{public}` | `is_admin()` | `` |
| `public` | `cost_centers` | `cost_centers_read` | SELECT | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role, 'asesor'::user_role]))` | `` |
| `public` | `cost_centers` | `cost_centers_write` | ALL | `{public}` | `is_admin()` | `is_admin()` |
| `public` | `leads` | `leads_read` | SELECT | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` | `` |
| `public` | `leads` | `leads_write` | ALL | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` |
| `public` | `petty_cash_boxes` | `petty_cash_boxes_delete` | DELETE | `{public}` | `(is_admin() OR (current_user_role() = 'tesoreria'::user_role) OR ((current_user_role() = 'asesor'::user_role) AND (opened_by = auth.uid())))` | `` |
| `public` | `petty_cash_boxes` | `petty_cash_boxes_insert` | INSERT | `{public}` | `` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role, 'tesoreria'::user_role]))` |
| `public` | `petty_cash_boxes` | `petty_cash_boxes_read` | SELECT | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role, 'tesoreria'::user_role]))` | `` |
| `public` | `petty_cash_boxes` | `petty_cash_boxes_update` | UPDATE | `{public}` | `(is_admin() OR (current_user_role() = 'tesoreria'::user_role) OR ((current_user_role() = 'asesor'::user_role) AND (opened_by = auth.uid())))` | `(is_admin() OR (current_user_role() = 'tesoreria'::user_role) OR ((current_user_role() = 'asesor'::user_role) AND (opened_by = auth.uid())))` |
| `public` | `petty_cash_entries` | `petty_cash_entries_delete` | DELETE | `{public}` | `(is_admin() OR (current_user_role() = 'tesoreria'::user_role) OR ((current_user_role() = 'asesor'::user_role) AND ((created_by = auth.uid()) OR (EXISTS ( SELECT 1 FROM petty_cash_boxes b WHERE ((b.id = petty_cash_entries.box_id) AND (b.opened_by = auth.uid())))))))` | `` |
| `public` | `petty_cash_entries` | `petty_cash_entries_insert` | INSERT | `{public}` | `` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role, 'tesoreria'::user_role]))` |
| `public` | `petty_cash_entries` | `petty_cash_entries_read` | SELECT | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role, 'tesoreria'::user_role]))` | `` |
| `public` | `petty_cash_entries` | `petty_cash_entries_update` | UPDATE | `{public}` | `(is_admin() OR (current_user_role() = 'tesoreria'::user_role) OR ((current_user_role() = 'asesor'::user_role) AND (created_by = auth.uid())) OR ((current_user_role() = 'asesor'::user_role) AND (EXISTS ( SELECT 1 FROM petty_cash_boxes b WHERE ((b.id = petty_cash_entries.box_id) AND (b.opened_by = auth.uid()))))))` | `(is_admin() OR (current_user_role() = 'tesoreria'::user_role) OR ((current_user_role() = 'asesor'::user_role) AND (created_by = auth.uid())) OR ((current_user_role() = 'asesor'::user_role) AND (EXISTS ( SELECT 1 FROM petty_cash_boxes b WHERE ((b.id = petty_cash_entries.box_id) AND (b.opened_by = auth.uid()))))))` |
| `public` | `profiles` | `profiles_admin_all` | ALL | `{public}` | `is_admin()` | `is_admin()` |
| `public` | `profiles` | `profiles_select` | SELECT | `{public}` | `(auth.uid() IS NOT NULL)` | `` |
| `public` | `profiles` | `profiles_update_self` | UPDATE | `{public}` | `(id = auth.uid())` | `((id = auth.uid()) AND (role = ( SELECT profiles_1.role FROM profiles profiles_1 WHERE (profiles_1.id = auth.uid()))))` |
| `public` | `purchases` | `purchases_read` | SELECT | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role]))` | `` |
| `public` | `purchases` | `purchases_write` | ALL | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role]))` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role]))` |
| `public` | `sale_items` | `sale_items_read` | SELECT | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` | `` |
| `public` | `sale_items` | `sale_items_write` | ALL | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` |
| `public` | `sales` | `sales_read` | SELECT | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` | `` |
| `public` | `sales` | `sales_write` | ALL | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role]))` |
| `public` | `service_types` | `service_types_read` | SELECT | `{public}` | `(auth.uid() IS NOT NULL)` | `` |
| `public` | `service_types` | `service_types_write` | ALL | `{public}` | `is_admin()` | `is_admin()` |
| `public` | `suppliers` | `suppliers_delete` | DELETE | `{public}` | `is_admin()` | `` |
| `public` | `suppliers` | `suppliers_read` | SELECT | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role, 'asesor'::user_role]))` | `` |
| `public` | `suppliers` | `suppliers_update` | UPDATE | `{public}` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role]))` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role]))` |
| `public` | `suppliers` | `suppliers_write` | INSERT | `{public}` | `` | `(current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role, 'asesor'::user_role]))` |
| `storage` | `objects` | `avatars_insert` | INSERT | `{public}` | `` | `((bucket_id = 'avatars'::text) AND (auth.uid() IS NOT NULL))` |
| `storage` | `objects` | `avatars_read` | SELECT | `{public}` | `(bucket_id = 'avatars'::text)` | `` |
| `storage` | `objects` | `invoices_insert` | INSERT | `{public}` | `` | `((bucket_id = 'invoices'::text) AND (current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role])))` |
| `storage` | `objects` | `invoices_read` | SELECT | `{public}` | `((bucket_id = 'invoices'::text) AND (current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role])))` | `` |
| `storage` | `objects` | `invoices_update` | UPDATE | `{public}` | `((bucket_id = 'invoices'::text) AND (current_user_role() = ANY (ARRAY['admin'::user_role, 'tesoreria'::user_role])))` | `` |
| `storage` | `objects` | `petty_cash_receipts_insert` | INSERT | `{public}` | `` | `((bucket_id = 'petty-cash-receipts'::text) AND (current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role, 'tesoreria'::user_role])))` |
| `storage` | `objects` | `petty_cash_receipts_read` | SELECT | `{public}` | `((bucket_id = 'petty-cash-receipts'::text) AND (current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role, 'tesoreria'::user_role])))` | `` |
| `storage` | `objects` | `receipts_insert` | INSERT | `{public}` | `` | `((bucket_id = 'receipts'::text) AND (current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role])))` |
| `storage` | `objects` | `receipts_read` | SELECT | `{public}` | `((bucket_id = 'receipts'::text) AND (current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role])))` | `` |
| `storage` | `objects` | `receipts_update` | UPDATE | `{public}` | `((bucket_id = 'receipts'::text) AND (current_user_role() = ANY (ARRAY['admin'::user_role, 'asesor'::user_role])))` | `` |

**Hallazgo crítico en RLS de Caja Menor y Storage:**
- En `petty_cash_entries`, la política `petty_cash_entries_insert` solo permite `current_user_role() IN ('admin', 'asesor')`, bloqueando a `tesoreria` al insertar gastos o recargas.
- En `storage.objects` (`petty_cash_receipts_insert`), solo permite `admin` y `asesor`, bloqueando a `tesoreria` al subir soportes.
- Existen políticas `DELETE` activas sobre tablas financieras (`purchases`, `sales`, `petty_cash_boxes`, `petty_cash_entries`).

## 6. Grants de Vistas y Propiedad `security_invoker`

- Las 3 vistas (`kpi_daily`, `petty_cash_box_summary`, `petty_cash_entries_full`) tienen `options = null` (ejecutan como `SECURITY DEFINER` del propietario `postgres`).
- El rol `anon` tiene privilegios `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` otorgados por defecto sobre las 3 vistas.
- En `petty_cash_box_summary`, faltan las columnas `total_income` y `balance`.

## 7. Triggers y Funciones en `public`

### Triggers actuales:
| Tabla | Trigger | Evento | Timing | Acción |
|---|---|---|---|---|
| `appointments` | `trg_appointments_updated_at` | UPDATE | BEFORE | `EXECUTE FUNCTION set_updated_at()` |
| `leads` | `trg_leads_updated_at` | UPDATE | BEFORE | `EXECUTE FUNCTION set_updated_at()` |
| `petty_cash_boxes` | `trg_petty_cash_boxes_updated_at` | UPDATE | BEFORE | `EXECUTE FUNCTION set_updated_at()` |
| `petty_cash_entries` | `trg_petty_cash_entries_updated_at` | UPDATE | BEFORE | `EXECUTE FUNCTION set_updated_at()` |
| `profiles` | `trg_profiles_updated_at` | UPDATE | BEFORE | `EXECUTE FUNCTION set_updated_at()` |
| `purchases` | `trg_purchases_calc_total` | UPDATE | BEFORE | `EXECUTE FUNCTION calc_purchase_total()` |
| `purchases` | `trg_purchases_calc_total` | INSERT | BEFORE | `EXECUTE FUNCTION calc_purchase_total()` |
| `purchases` | `trg_purchases_number` | INSERT | BEFORE | `EXECUTE FUNCTION generate_purchase_number()` |
| `purchases` | `trg_purchases_updated_at` | UPDATE | BEFORE | `EXECUTE FUNCTION set_updated_at()` |
| `sales` | `trg_sales_number` | INSERT | BEFORE | `EXECUTE FUNCTION generate_sale_number()` |
| `sales` | `trg_sales_updated_at` | UPDATE | BEFORE | `EXECUTE FUNCTION set_updated_at()` |

- **Hallazgo:** No existen triggers de auditoría hacia `public.audit_log` (la tabla `audit_log` tiene 0 registros) y la UI de auditoría consulta la tabla inexistente `audit_logs`.

### Funciones en `public`:
| Función | Argumentos | Security Definer | Config (`search_path`) |
|---|---|---|---|
| `calc_purchase_total` | `` | No | `No definido` |
| `create_test_user` | `p_email text, p_password text, p_full_name text, p_role user_role` | Sí | `search_path=public, extensions` |
| `current_user_role` | `` | Sí | `search_path=public` |
| `generate_purchase_number` | `` | No | `No definido` |
| `generate_sale_number` | `` | No | `No definido` |
| `handle_new_user` | `` | Sí | `search_path=public` |
| `is_admin` | `` | Sí | `search_path=public` |
| `kpi_for_date` | `target_date date` | No | `No definido` |
| `set_updated_at` | `` | No | `No definido` |
- **Hallazgo de seguridad:** Existe la función de prueba `public.create_test_user` con `SECURITY DEFINER` ejecutable por `anon` y `authenticated`.

## 8. Buckets de Storage

| ID | Nombre | Público | Creado |
|---|---|---|---|
| `avatars` | `avatars` | Sí | 2026-06-20 16:48:22.654254+00 |
| `invoices` | `invoices` | No | 2026-06-20 16:48:22.654254+00 |
| `petty-cash-receipts` | `petty-cash-receipts` | No | 2026-06-23 22:16:51.366004+00 |
| `receipts` | `receipts` | No | 2026-06-20 16:48:22.654254+00 |
- **Hallazgo:** No existe aún el bucket privado unificado `soportes`.

## 9. Calidad de Datos Contables y Tributarios

### 9.1 Proveedores con NIT duplicado o NIT comodín (`000000000`)
- Total de proveedores en `suppliers`: **463**
- Grupos de NIT repetido (limpio de caracteres no numéricos): **12** grupos.
  - NIT `000000000`: **75** registros (TC Bancolombia, Carlos Veles Protacolista, Mauricio, David Quintero, Homecenter, Transfiriendo S.A...)
  - NIT `31396509469`: **3** registros (Jhon contratista, Jhon Fredy Giraldo Paniagua, Jhon Fredy Giraldo Paniagua)
  - NIT `1220468707`: **2** registros (Vergara Castaño, Andrea Carolina, ANDREA CAROLINA VERGARA CASTAÑO)
  - NIT `28940`: **2** registros (Puertas y Servicios, Puertas & Servicios)
  - NIT `5800`: **2** registros (Cuenta del papi, Papi)
  - NIT `717272741`: **2** registros (Servicios a Domicilio, KAIRO)
  - NIT `8110097888`: **2** registros (Distracom Exposiciones, DISTRACOM S.A.)
  - NIT `8600050748`: **2** registros (SISTEMA PLS ARS DE NCR COLOMBIA LTDA, PCS APS DE NCR COLOMBIA LTDA)
  - NIT `8909006089`: **2** registros (Almacenes Exito S.A., Móvil Éxito)
  - NIT `0`: **2** registros (DANIEL EDUARDO BUELVAS ROMAN, EPM)
  - NIT `9002515532`: **2** registros (PINVICOLOR S. A. S, Pintucolor)
  - NIT `1193379916`: **2** registros (Jos Antonio Guerrero Aviles, Jose Antonio Guerrero Aviles)
- Proveedores duplicados por (nombre normalizado + NIT): **4** grupos.

### 9.2 Compras en $0 (`purchases`)
- Total de compras en $0: **5**
| ID | Consecutivo | Fecha | Concepto | Subtotal | Total | Estado |
|---|---|---|---|---|---|---|
| `eab0604c-a6d2-473d-ab1b-ce0f40cdcd80` | `C-2026-1053` | 2026-10-16 | Bono informativo para ganar una bicicleta | $0.00 | $0.00 | pagado |
| `593254c0-4dcd-4ea6-ba6d-d6a1580ce537` | `C-2026-0916` | 2026-09-25 | Catering Order | $0.00 | $0.00 | pagado |
| `9513dafd-6c81-4b2c-95ed-a5896ec33a14` | `C-2026-1024` | 2026-09-25 | Entrega a domicilio | $0.00 | $0.00 | pagado |
| `71fb4c26-0670-409d-adb4-ba3d7faebc8c` | `C-2026-0681` | 2026-02-09 | Linea 300666 | $0.00 | $0.00 | pagado |
| `744cee5a-8bb0-4881-9b05-9d2868b295bd` | `C-2026-0886` | 2022-10-01 | Contrato individual de trabajo | $0.00 | $0.00 | pagado |

### 9.3 Registros sin soporte
- **Compras (`purchases`):** 1048 de 1048 sin `invoice_url` (100 %).
- **Entradas de caja menor (`petty_cash_entries`):** 17 de 37 sin `receipt_url` (20 tienen enlace de Google Drive).

### 9.4 Consecutivos duplicados
- Duplicados actuales en `purchases.purchase_number`: **0**
- Duplicados actuales en `sales.sale_number`: **0**
- **Riesgo detectado:** Los triggers `generate_purchase_number` y `generate_sale_number` usan `SELECT count(*) + 1`, lo que provoca colisiones en concurrencia.
