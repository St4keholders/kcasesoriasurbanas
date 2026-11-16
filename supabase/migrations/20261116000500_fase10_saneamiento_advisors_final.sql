-- =============================================================================
-- FASE 10: Saneamiento final de Advisors (Seguridad y Rendimiento)
-- =============================================================================

-- 1. Mover extensión pg_trgm al esquema extensions
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 2. Restringir ejecución pública/autenticada innecesaria en funciones SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.fn_audit_log_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_document_number(text, integer, integer) FROM PUBLIC, anon;

-- 3. Eliminar políticas permisivas duplicadas en SELECT para tablas contables
DROP POLICY IF EXISTS "accounting_settings_write" ON public.accounting_settings;
DROP POLICY IF EXISTS "accounting_settings_insert" ON public.accounting_settings;
CREATE POLICY "accounting_settings_insert" ON public.accounting_settings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_role('admin'::public.user_role)));
DROP POLICY IF EXISTS "accounting_settings_update" ON public.accounting_settings;
CREATE POLICY "accounting_settings_update" ON public.accounting_settings
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_role('admin'::public.user_role)))
  WITH CHECK ((SELECT public.has_role('admin'::public.user_role)));

DROP POLICY IF EXISTS "payment_accounts_write" ON public.payment_accounts;
DROP POLICY IF EXISTS "payment_accounts_insert" ON public.payment_accounts;
CREATE POLICY "payment_accounts_insert" ON public.payment_accounts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_role('admin'::public.user_role)));
DROP POLICY IF EXISTS "payment_accounts_update" ON public.payment_accounts;
CREATE POLICY "payment_accounts_update" ON public.payment_accounts
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_role('admin'::public.user_role)))
  WITH CHECK ((SELECT public.has_role('admin'::public.user_role)));

DROP POLICY IF EXISTS "posting_rules_write" ON public.posting_rules;
DROP POLICY IF EXISTS "posting_rules_insert" ON public.posting_rules;
CREATE POLICY "posting_rules_insert" ON public.posting_rules
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_role('admin'::public.user_role, 'tesoreria'::public.user_role)));
DROP POLICY IF EXISTS "posting_rules_update" ON public.posting_rules;
CREATE POLICY "posting_rules_update" ON public.posting_rules
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_role('admin'::public.user_role, 'tesoreria'::public.user_role)))
  WITH CHECK ((SELECT public.has_role('admin'::public.user_role, 'tesoreria'::public.user_role)));

DROP POLICY IF EXISTS "tax_parameters_write" ON public.tax_parameters;
DROP POLICY IF EXISTS "tax_parameters_insert" ON public.tax_parameters;
CREATE POLICY "tax_parameters_insert" ON public.tax_parameters
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_role('admin'::public.user_role)));
DROP POLICY IF EXISTS "tax_parameters_update" ON public.tax_parameters;
CREATE POLICY "tax_parameters_update" ON public.tax_parameters
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_role('admin'::public.user_role)))
  WITH CHECK ((SELECT public.has_role('admin'::public.user_role)));

-- 4. Índices de cobertura para llaves foráneas en tablas nuevas (unindexed_foreign_keys)
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent_code ON public.chart_of_accounts(parent_code);
CREATE INDEX IF NOT EXISTS idx_classification_feedback_confirmed_account ON public.classification_feedback(confirmed_account_code);
CREATE INDEX IF NOT EXISTS idx_classification_feedback_previous_account ON public.classification_feedback(previous_account_code);
CREATE INDEX IF NOT EXISTS idx_classification_feedback_corrected_by ON public.classification_feedback(corrected_by);
CREATE INDEX IF NOT EXISTS idx_classification_feedback_cost_center ON public.classification_feedback(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_classification_feedback_rule ON public.classification_feedback(created_rule_id);
CREATE INDEX IF NOT EXISTS idx_classification_feedback_entry ON public.classification_feedback(entry_id);
CREATE INDEX IF NOT EXISTS idx_document_ingestions_cc_entry ON public.document_ingestions(cc_entry_id);
CREATE INDEX IF NOT EXISTS idx_document_ingestions_ce_entry ON public.document_ingestions(ce_entry_id);
CREATE INDEX IF NOT EXISTS idx_document_ingestions_created_by ON public.document_ingestions(created_by);
CREATE INDEX IF NOT EXISTS idx_document_ingestions_reviewed_by ON public.document_ingestions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_document_ingestions_suggested_account ON public.document_ingestions(suggested_account_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_by ON public.journal_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_journal_entries_posted_by ON public.journal_entries(posted_by);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reversed_entry ON public.journal_entries(reversed_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_voided_by ON public.journal_entries(voided_by);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_account_code ON public.payment_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_posting_rules_cost_center ON public.posting_rules(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_posting_rules_credit_account ON public.posting_rules(credit_account_code);
CREATE INDEX IF NOT EXISTS idx_posting_rules_debit_account ON public.posting_rules(debit_account_code);
CREATE INDEX IF NOT EXISTS idx_tax_parameters_account_code ON public.tax_parameters(account_code);
CREATE INDEX IF NOT EXISTS idx_third_parties_default_account ON public.third_parties(default_account_code);
