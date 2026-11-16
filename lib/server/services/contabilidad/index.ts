import { getServerDb } from '@/lib/server/db';
import type { Database } from '@/types/database';
import {
  classifyTransaction,
  normalizeTextForMatch,
  type ClassifierContext,
  type ClassificationOutput,
} from '@/lib/server/services/ia/clasificador';
import { calculateInvoiceTotals } from '@/lib/utils/money';

export interface TaxParameterRule {
  concept: 'compras' | 'servicios' | 'honorarios' | 'arrendamientos';
  min_base_cop: number;
  rate_pct: number;
  account_code: string;
  valid_from: string;
  valid_to: string;
}

/**
 * Calcula la retención en la fuente esperada en 2026 según la fecha y el concepto tributario.
 * Nunca inventa la retención en el asiento si la factura no la trae; solo marca missing_withholding.
 */
export function calculateExpectedWithholding(
  baseAmount: number,
  txDate: string,
  taxConcept: 'compras' | 'servicios' | 'honorarios' | 'arrendamientos' | 'ninguno',
  taxParams: TaxParameterRule[]
): { expectedAmount: number; withholdingAccountCode: string } {
  if (taxConcept === 'ninguno' || baseAmount <= 0) {
    return { expectedAmount: 0, withholdingAccountCode: '236540' };
  }

  const dateClean = (txDate || '2026-06-01').slice(0, 10);
  const matching = taxParams.find(
    (tp) =>
      tp.concept === taxConcept &&
      dateClean >= tp.valid_from &&
      dateClean <= tp.valid_to
  );

  if (!matching) {
    const defaultAcc =
      taxConcept === 'honorarios'
        ? '236515'
        : taxConcept === 'arrendamientos'
        ? '236530'
        : taxConcept === 'servicios'
        ? '236525'
        : '236540';
    return { expectedAmount: 0, withholdingAccountCode: defaultAcc };
  }

  if (baseAmount < Number(matching.min_base_cop)) {
    return { expectedAmount: 0, withholdingAccountCode: matching.account_code };
  }

  const expectedAmount = Math.round((baseAmount * Number(matching.rate_pct)) / 100);
  return {
    expectedAmount,
    withholdingAccountCode: matching.account_code,
  };
}

export async function loadClassifierContext(): Promise<{
  ctx: ClassifierContext;
  taxParams: TaxParameterRule[];
  settings: { reviso_name: string; aprobo_name: string };
}> {
  const db = await getServerDb();
  const [accRes, rulesRes, fbRes, taxRes, setRes] = await Promise.all([
    db
      .from('chart_of_accounts')
      .select('code, name, account_class, default_tax_concept, keywords')
      .eq('is_active', true),
    db.from('posting_rules').select('*').eq('is_active', true),
    db.from('classification_feedback').select('*'),
    db.from('tax_parameters').select('*').eq('is_active', true),
    db.from('accounting_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  const ctx: ClassifierContext = {
    accounts: (accRes.data || []).map((a) => ({
      code: a.code,
      name: a.name,
      account_class: a.account_class,
      default_tax_concept: a.default_tax_concept,
      keywords: a.keywords || [],
    })),
    rules: (rulesRes.data || []).map((r) => ({
      id: r.id,
      name: r.name,
      source: r.source as 'manual' | 'aprendida',
      priority: r.priority,
      cost_center_id: r.cost_center_id,
      account_class: r.account_class,
      nit_normalized: r.nit_normalized,
      keyword_pattern: r.keyword_pattern,
      debit_account_code: r.debit_account_code,
      credit_account_code: r.credit_account_code,
      tax_concept: r.tax_concept,
      is_deductible: r.is_deductible,
      mark_personal: r.mark_personal,
      mark_third_party_support: r.mark_third_party_support,
      mark_possible_asset: r.mark_possible_asset,
    })),
    confirmedFeedback: (fbRes.data || []).map((f) => ({
      nit_normalized: f.nit_normalized,
      third_party_id: f.third_party_id,
      concept: f.concept,
      confirmed_account_code: f.confirmed_account_code,
    })),
  };

  const taxParams: TaxParameterRule[] = (taxRes.data || []).map((t) => ({
    concept: t.concept as TaxParameterRule['concept'],
    min_base_cop: Number(t.min_base_cop),
    rate_pct: Number(t.rate_pct),
    account_code: t.account_code,
    valid_from: t.valid_from,
    valid_to: t.valid_to,
  }));

  return {
    ctx,
    taxParams,
    settings: {
      reviso_name: setRes.data?.reviso_name || 'Contador',
      aprobo_name: setRes.data?.aprobo_name || 'Representante legal',
    },
  };
}

/**
 * Paso (6) de 6A: Guarda corrección en classification_feedback y crea una posting_rule aprendida.
 */
export async function recordClassificationCorrection(params: {
  entryId: string;
  newAccountCode: string;
  newCostCenterId?: string | null;
  userId: string;
}) {
  const db = await getServerDb();

  const { data: entry, error: entryErr } = await db
    .from('journal_entries')
    .select('*, third_parties(id, name, nit_normalized)')
    .eq('id', params.entryId)
    .single();

  if (entryErr || !entry) {
    throw new Error('Comprobante no encontrado');
  }
  if (entry.status !== 'borrador') {
    throw new Error('Solo se pueden modificar comprobantes en estado borrador');
  }

  const { data: lines } = await db
    .from('journal_lines')
    .select('*')
    .eq('entry_id', params.entryId)
    .order('line_order', { ascending: true });

  const debitLine = (lines || []).find(
    (l) => Number(l.debit) > 0 && (l.account_code.startsWith('5') || l.account_code.startsWith('6'))
  );

  const previousCode = debitLine?.account_code || null;
  const effectiveCostCenterId =
    params.newCostCenterId !== undefined ? params.newCostCenterId : entry.cost_center_id;

  if (debitLine) {
    await db
      .from('journal_lines')
      .update({
        account_code: params.newAccountCode,
        cost_center_id: effectiveCostCenterId || null,
        is_deductible: params.newAccountCode !== '531595',
      })
      .eq('id', debitLine.id);
  }

  await db
    .from('journal_entries')
    .update({
      cost_center_id: effectiveCostCenterId || null,
      needs_review: false,
      ai_confidence: 1.0,
      ai_rationale: 'Cuenta confirmada manualmente en revisión de borradores.',
    })
    .eq('id', params.entryId);

  const normConcept = normalizeTextForMatch(entry.concept);
  const keywordPattern = normConcept.split(' ').slice(0, 4).join(' ');
  const accClass = params.newAccountCode.startsWith('6') ? 6 : 5;
  const tpNit = entry.third_parties?.nit_normalized || null;

  let createdRuleId: string | null = null;
  if (keywordPattern.length >= 3) {
    const { data: rule } = await db
      .from('posting_rules')
      .insert({
        name: `Regla aprendida: ${entry.concept.slice(0, 40)}`,
        source: 'aprendida',
        priority: 18,
        cost_center_id: effectiveCostCenterId || null,
        account_class: accClass,
        nit_normalized: tpNit,
        keyword_pattern: keywordPattern,
        debit_account_code: params.newAccountCode,
        credit_account_code: '230505',
        tax_concept: 'servicios',
        is_deductible: params.newAccountCode !== '531595',
        is_active: true,
      })
      .select('id')
      .maybeSingle();

    createdRuleId = rule?.id || null;
  }

  await db.from('classification_feedback').insert({
    entry_id: entry.id,
    source_table: entry.source_table,
    source_id: entry.source_id,
    third_party_id: entry.third_party_id,
    nit_normalized: tpNit,
    cost_center_id: effectiveCostCenterId || null,
    concept: entry.concept,
    previous_account_code: previousCode,
    confirmed_account_code: params.newAccountCode,
    created_rule_id: createdRuleId,
    corrected_by: params.userId,
  });

  return { entryId: entry.id, newAccountCode: params.newAccountCode, createdRuleId };
}

/**
 * Contabiliza en bloque una lista de comprobantes en borrador.
 * Exclusivo para el rol 'admin' (el contador). Nunca es invocado por la IA.
 */
export async function postJournalEntriesBulk(entryIds: string[], adminUserId: string) {
  const db = await getServerDb();
  const nowIso = new Date().toISOString();

  const { data, error } = await db
    .from('journal_entries')
    .update({
      status: 'contabilizado',
      posted_at: nowIso,
      posted_by: adminUserId,
      needs_review: false,
    })
    .in('id', entryIds)
    .eq('status', 'borrador')
    .select('id, entry_number, status');

  if (error) {
    throw new Error('Error al contabilizar comprobantes: ' + error.message);
  }
  return data || [];
}

/**
 * Anula un comprobante:
 * - Si está en borrador: lo marca como anulado con motivo, usuario y fecha.
 * - Si está contabilizado (solo admin): genera primero el comprobante de reverso (NC) y luego lo marca anulado.
 */
export async function voidOrReverseJournalEntry(params: {
  entryId: string;
  userId: string;
  userFullName: string;
  reason: string;
}) {
  const db = await getServerDb();

  const { data: entry, error: err } = await db
    .from('journal_entries')
    .select('*')
    .eq('id', params.entryId)
    .single();

  if (err || !entry) {
    throw new Error('Comprobante no encontrado');
  }

  if (entry.status === 'anulado') {
    return entry;
  }

  const nowIso = new Date().toISOString();

  if (entry.status === 'borrador') {
    const { data: updated, error: updErr } = await db
      .from('journal_entries')
      .update({
        status: 'anulado',
        voided_at: nowIso,
        voided_by: params.userId,
        void_reason: params.reason.trim(),
      })
      .eq('id', entry.id)
      .select('*')
      .single();
    if (updErr) throw new Error(updErr.message);
    return updated;
  }

  // Si está contabilizado, crear reverso NC primero
  const { data: lines } = await db
    .from('journal_lines')
    .select('*')
    .eq('entry_id', entry.id)
    .order('line_order', { ascending: true });

  const year = Number(entry.entry_date.slice(0, 4)) || 2026;
  const { data: ncNum, error: numErr } = await db.rpc('next_document_number', {
    p_prefix: 'NC',
    p_year: year,
    p_padding: 6,
  });
  if (numErr || !ncNum) {
    throw new Error('Error generando consecutivo de nota contable de reverso');
  }

  const { data: reversalEntry, error: revErr } = await db
    .from('journal_entries')
    .insert({
      entry_number: ncNum,
      entry_type: 'NC',
      entry_date: entry.entry_date,
      status: 'borrador',
      source_table: 'reversal',
      source_id: entry.id,
      reversed_entry_id: entry.id,
      third_party_id: entry.third_party_id,
      cost_center_id: entry.cost_center_id,
      concept: `REVERSO DE ${entry.entry_number}: ${params.reason.trim()}`,
      total_debit: entry.total_debit,
      total_credit: entry.total_credit,
      ai_confidence: 1.0,
      ai_rationale: `Nota contable de reverso para anular ${entry.entry_number}`,
      created_by: params.userId,
      elaboro_name: params.userFullName,
      reviso_name: entry.reviso_name,
      aprobo_name: entry.aprobo_name,
    })
    .select('*')
    .single();

  if (revErr || !reversalEntry) {
    throw new Error('Error creando comprobante de reverso: ' + revErr?.message);
  }

  const reversalLines = (lines || []).map((l, idx) => ({
    entry_id: reversalEntry.id,
    line_order: idx + 1,
    account_code: l.account_code,
    third_party_id: l.third_party_id,
    cost_center_id: l.cost_center_id,
    description: `Reverso: ${l.description || entry.concept}`,
    debit: l.credit,
    credit: l.debit,
    base_amount: l.base_amount,
    is_deductible: l.is_deductible,
  }));

  await db.from('journal_lines').insert(reversalLines);

  const { data: voided, error: voidErr } = await db
    .from('journal_entries')
    .update({
      status: 'anulado',
      voided_at: nowIso,
      voided_by: params.userId,
      void_reason: params.reason.trim(),
    })
    .eq('id', entry.id)
    .select('*')
    .single();

  if (voidErr) throw new Error(voidErr.message);
  return voided;
}

/**
 * Genera de forma idempotente (por source_table + source_id + entry_type) los comprobantes
 * en borrador (CC + CE) de una compra.
 */
export async function ensureDraftEntriesForPurchase(params: {
  purchaseId: string;
  classification?: ClassificationOutput;
}) {
  const db = await getServerDb();
  const { data: purchase, error } = await db
    .from('purchases')
    .select(
      '*, cost_centers(id, name), third_parties(id, name, nit_normalized), profiles!purchases_created_by_fkey(full_name)'
    )
    .eq('id', params.purchaseId)
    .single();

  if (error || !purchase || purchase.status === 'anulado') {
    return null;
  }

  const { ctx, taxParams, settings } = await loadClassifierContext();
  const classification =
    params.classification ||
    (await classifyTransaction(
      {
        concept: purchase.concept,
        supplierName: purchase.third_parties?.name || purchase.supplier_name,
        nitNormalized: purchase.third_parties?.nit_normalized,
        thirdPartyId: purchase.third_party_id,
        costCenterId: purchase.cost_center_id,
        costCenterName: purchase.cost_centers?.name,
        amount: Number(purchase.amount),
      },
      ctx
    ));

  const hasElectronicInvoice = Boolean(
    purchase.invoice_number &&
      purchase.invoice_number.trim() !== '' &&
      !classification.marks.soporte_a_nombre_de_tercero
  );

  const totals = calculateInvoiceTotals({
    amount: Number(purchase.amount) || 0,
    taxIva: Number(purchase.tax_iva) || 0,
    withholdingTax: Number(purchase.withholding_tax) || 0,
    hasElectronicInvoice,
    isAddressedToKc: !classification.marks.soporte_a_nombre_de_tercero,
  });

  const { expectedAmount, withholdingAccountCode } = calculateExpectedWithholding(
    totals.base,
    purchase.transaction_date,
    classification.taxConcept,
    taxParams
  );

  const missingWithholding = expectedAmount > 0 && totals.withholdingTax === 0;
  const totalDebit = totals.accountingExpenseOrCost + totals.deductibleIva;
  const payableCredit = Math.max(0, totalDebit - totals.withholdingTax);

  const elaboroName = purchase.profiles?.full_name || 'Auxiliar Contable KC';
  const supportUrl = purchase.support_storage_path
    ? `/api/soportes/view?path=${encodeURIComponent(purchase.support_storage_path)}`
    : purchase.invoice_url || purchase.legacy_drive_url || null;

  // Verificar si ya existe CC
  let { data: ccEntry } = await db
    .from('journal_entries')
    .select('*')
    .eq('source_table', 'purchases')
    .eq('source_id', purchase.id)
    .eq('entry_type', 'CC')
    .maybeSingle();

  const year = Number((purchase.transaction_date || '2026').slice(0, 4)) || 2026;

  if (!ccEntry && totalDebit > 0) {
    const { data: ccNum } = await db.rpc('next_document_number', {
      p_prefix: 'CC',
      p_year: year,
      p_padding: 6,
    });

    const { data: insertedCc, error: ccErr } = await db
      .from('journal_entries')
      .insert({
        entry_number: ccNum || `CC-${year}-${Date.now()}`,
        entry_type: 'CC',
        entry_date: purchase.transaction_date,
        status: 'borrador',
        source_table: 'purchases',
        source_id: purchase.id,
        third_party_id: purchase.third_party_id,
        cost_center_id: purchase.cost_center_id,
        concept: purchase.concept,
        total_debit: totalDebit,
        total_credit: totalDebit,
        ai_confidence: classification.confidence,
        ai_rationale: classification.rationale,
        needs_review: classification.needsReview || missingWithholding,
        is_personal_expense: classification.marks.posible_personal,
        is_third_party_support: classification.marks.soporte_a_nombre_de_tercero,
        is_possible_asset: classification.marks.posible_activo,
        withholding_expected: expectedAmount,
        withholding_applied: totals.withholdingTax,
        missing_withholding: missingWithholding,
        support_url: supportUrl,
        created_by: purchase.created_by,
        elaboro_name: elaboroName,
        reviso_name: settings.reviso_name,
        aprobo_name: settings.aprobo_name,
      })
      .select('*')
      .single();

    if (ccErr) throw new Error(ccErr.message);
    ccEntry = insertedCc;

    const ccLines: Database['public']['Tables']['journal_lines']['Insert'][] = [
      {
        entry_id: ccEntry.id,
        line_order: 1,
        account_code: classification.accountCode,
        third_party_id: purchase.third_party_id,
        cost_center_id: purchase.cost_center_id,
        description: purchase.concept,
        debit: totals.accountingExpenseOrCost,
        credit: 0,
        base_amount: totals.base,
        is_deductible: classification.isDeductible,
      },
    ];

    let order = 2;
    if (totals.deductibleIva > 0) {
      ccLines.push({
        entry_id: ccEntry.id,
        line_order: order++,
        account_code: '240810',
        third_party_id: purchase.third_party_id,
        cost_center_id: purchase.cost_center_id,
        description: `IVA descontable ${purchase.invoice_number || ''}`.trim(),
        debit: totals.deductibleIva,
        credit: 0,
        base_amount: totals.base,
        is_deductible: true,
      });
    }

    if (totals.withholdingTax > 0) {
      ccLines.push({
        entry_id: ccEntry.id,
        line_order: order++,
        account_code: withholdingAccountCode,
        third_party_id: purchase.third_party_id,
        cost_center_id: purchase.cost_center_id,
        description: `Retención en la fuente practicada (${classification.taxConcept})`,
        debit: 0,
        credit: totals.withholdingTax,
        base_amount: totals.base,
        is_deductible: true,
      });
    }

    ccLines.push({
      entry_id: ccEntry.id,
      line_order: order++,
      account_code: classification.creditAccountCode,
      third_party_id: purchase.third_party_id,
      cost_center_id: purchase.cost_center_id,
      description: `Causación por pagar a ${purchase.supplier_name || 'proveedor'}`,
      debit: 0,
      credit: payableCredit,
      base_amount: totals.base,
      is_deductible: true,
    });

    await db.from('journal_lines').insert(ccLines);
  }

  // Si la compra está pagada y payableCredit > 0, generar CE enlazado con la misma fecha
  let ceEntry = null;
  if (purchase.status === 'pagado' && payableCredit > 0 && ccEntry) {
    const { data: existingCe } = await db
      .from('journal_entries')
      .select('*')
      .eq('source_table', 'purchases')
      .eq('source_id', purchase.id)
      .eq('entry_type', 'CE')
      .maybeSingle();

    ceEntry = existingCe;

    if (!ceEntry) {
      const { data: ceNum } = await db.rpc('next_document_number', {
        p_prefix: 'CE',
        p_year: year,
        p_padding: 6,
      });

      const paymentAccountCode =
        purchase.payment_method === 'efectivo' ? '110505' : '111005';

      const { data: insertedCe, error: ceErr } = await db
        .from('journal_entries')
        .insert({
          entry_number: ceNum || `CE-${year}-${Date.now()}`,
          entry_type: 'CE',
          entry_date: purchase.transaction_date,
          status: 'borrador',
          source_table: 'purchases',
          source_id: purchase.id,
          linked_entry_id: ccEntry.id,
          third_party_id: purchase.third_party_id,
          cost_center_id: purchase.cost_center_id,
          concept: `Pago: ${purchase.concept}`,
          total_debit: payableCredit,
          total_credit: payableCredit,
          ai_confidence: classification.confidence,
          ai_rationale: `Comprobante de egreso enlazado a ${ccEntry.entry_number}`,
          needs_review: false,
          support_url: supportUrl,
          created_by: purchase.created_by,
          elaboro_name: elaboroName,
          reviso_name: settings.reviso_name,
          aprobo_name: settings.aprobo_name,
        })
        .select('*')
        .single();

      if (ceErr) throw new Error(ceErr.message);
      ceEntry = insertedCe;

      await db.from('journal_lines').insert([
        {
          entry_id: ceEntry.id,
          line_order: 1,
          account_code: classification.creditAccountCode,
          third_party_id: purchase.third_party_id,
          cost_center_id: purchase.cost_center_id,
          description: `Cancelación obligación ${ccEntry.entry_number}`,
          debit: payableCredit,
          credit: 0,
          base_amount: payableCredit,
          is_deductible: true,
        },
        {
          entry_id: ceEntry.id,
          line_order: 2,
          account_code: paymentAccountCode,
          third_party_id: purchase.third_party_id,
          cost_center_id: purchase.cost_center_id,
          description: `Desembolso por ${purchase.payment_method || 'transferencia'}`,
          debit: 0,
          credit: payableCredit,
          base_amount: payableCredit,
          is_deductible: true,
        },
      ]);

      await db
        .from('journal_entries')
        .update({ linked_entry_id: ceEntry.id })
        .eq('id', ccEntry.id);
    }
  }

  return { ccEntry, ceEntry };
}

/**
 * Genera de forma idempotente los comprobantes en borrador para un movimiento de caja menor:
 * - Si entry_type = 'ingreso' (recarga): genera CE (débito 110510 CAJA MENOR, crédito 111005 BANCOS).
 * - Si entry_type = 'egreso': genera CC (débito 5/6 + 240810, crédito 210505/230505) y CE enlazado (débito 210505/230505, crédito 110510).
 */
export async function ensureDraftEntriesForPettyCash(entryId: string) {
  const db = await getServerDb();
  const { data: entry, error } = await db
    .from('petty_cash_entries')
    .select(
      '*, petty_cash_boxes(id, name, cost_center_id, cost_centers(id, name)), third_parties(id, name, nit_normalized), profiles!petty_cash_entries_created_by_fkey(full_name)'
    )
    .eq('id', entryId)
    .single();

  if (error || !entry || entry.status === 'anulado' || Number(entry.total_amount) <= 0) {
    return null;
  }

  const { ctx, settings } = await loadClassifierContext();
  const box = entry.petty_cash_boxes as {
    id: string;
    name: string | null;
    cost_center_id: string | null;
    cost_centers?: { id: string; name: string } | null;
  } | null;

  const costCenterId = box?.cost_center_id || null;
  const costCenterName = box?.cost_centers?.name || 'Medellín';
  const elaboroName = entry.profiles?.full_name || 'Auxiliar Caja Menor KC';
  const supportUrl = entry.support_storage_path
    ? `/api/soportes/view?path=${encodeURIComponent(entry.support_storage_path)}`
    : entry.receipt_url || entry.legacy_drive_url || null;
  const year = Number((entry.entry_date || '2026').slice(0, 4)) || 2026;
  const totalAmount = Math.round(Number(entry.total_amount) || 0);

  if (entry.entry_type === 'ingreso') {
    const { data: existingCe } = await db
      .from('journal_entries')
      .select('*')
      .eq('source_table', 'petty_cash_entries')
      .eq('source_id', entry.id)
      .eq('entry_type', 'CE')
      .maybeSingle();

    if (existingCe) return { ceEntry: existingCe };

    const { data: ceNum } = await db.rpc('next_document_number', {
      p_prefix: 'CE',
      p_year: year,
      p_padding: 6,
    });

    const { data: ceEntry, error: ceErr } = await db
      .from('journal_entries')
      .insert({
        entry_number: ceNum || `CE-${year}-${Date.now()}`,
        entry_type: 'CE',
        entry_date: entry.entry_date,
        status: 'borrador',
        source_table: 'petty_cash_entries',
        source_id: entry.id,
        third_party_id: entry.third_party_id,
        cost_center_id: costCenterId,
        concept: `Recarga caja menor: ${entry.concept}`,
        total_debit: totalAmount,
        total_credit: totalAmount,
        ai_confidence: 1.0,
        ai_rationale: 'Recarga de caja menor desde bancos (110510 vs 111005).',
        needs_review: false,
        support_url: supportUrl,
        created_by: entry.created_by,
        elaboro_name: elaboroName,
        reviso_name: settings.reviso_name,
        aprobo_name: settings.aprobo_name,
      })
      .select('*')
      .single();

    if (ceErr) throw new Error(ceErr.message);

    await db.from('journal_lines').insert([
      {
        entry_id: ceEntry.id,
        line_order: 1,
        account_code: '110510',
        third_party_id: entry.third_party_id,
        cost_center_id: costCenterId,
        description: `Recarga caja menor: ${entry.concept}`,
        debit: totalAmount,
        credit: 0,
        base_amount: totalAmount,
        is_deductible: true,
      },
      {
        entry_id: ceEntry.id,
        line_order: 2,
        account_code: '111005',
        third_party_id: entry.third_party_id,
        cost_center_id: costCenterId,
        description: `Transferencia a caja menor: ${entry.concept}`,
        debit: 0,
        credit: totalAmount,
        base_amount: totalAmount,
        is_deductible: true,
      },
    ]);

    return { ceEntry };
  }

  // Egreso de caja menor -> CC + CE contra 110510
  const classification = await classifyTransaction(
    {
      concept: entry.concept,
      supplierName: entry.supplier_name,
      nitNormalized: entry.third_parties?.nit_normalized || entry.supplier_document,
      thirdPartyId: entry.third_party_id,
      costCenterId,
      costCenterName,
      amount: totalAmount,
    },
    ctx
  );

  const taxAmount = Math.max(0, Math.round(Number(entry.tax_amount) || 0));
  const baseAmount = Math.max(0, totalAmount - taxAmount);
  const hasElectronicInvoice = Boolean(
    entry.invoice_number &&
      entry.invoice_number.trim() !== '' &&
      !classification.marks.soporte_a_nombre_de_tercero
  );

  const totals = calculateInvoiceTotals({
    amount: baseAmount,
    taxIva: taxAmount,
    withholdingTax: 0,
    hasElectronicInvoice,
    isAddressedToKc: !classification.marks.soporte_a_nombre_de_tercero,
  });

  let { data: ccEntry } = await db
    .from('journal_entries')
    .select('*')
    .eq('source_table', 'petty_cash_entries')
    .eq('source_id', entry.id)
    .eq('entry_type', 'CC')
    .maybeSingle();

  if (!ccEntry) {
    const { data: ccNum } = await db.rpc('next_document_number', {
      p_prefix: 'CC',
      p_year: year,
      p_padding: 6,
    });

    const { data: insertedCc, error: ccErr } = await db
      .from('journal_entries')
      .insert({
        entry_number: ccNum || `CC-${year}-${Date.now()}`,
        entry_type: 'CC',
        entry_date: entry.entry_date,
        status: 'borrador',
        source_table: 'petty_cash_entries',
        source_id: entry.id,
        third_party_id: entry.third_party_id,
        cost_center_id: costCenterId,
        concept: entry.concept,
        total_debit: totalAmount,
        total_credit: totalAmount,
        ai_confidence: classification.confidence,
        ai_rationale: classification.rationale,
        needs_review: classification.needsReview,
        is_personal_expense: classification.marks.posible_personal,
        is_third_party_support: classification.marks.soporte_a_nombre_de_tercero,
        is_possible_asset: classification.marks.posible_activo,
        support_url: supportUrl,
        created_by: entry.created_by,
        elaboro_name: elaboroName,
        reviso_name: settings.reviso_name,
        aprobo_name: settings.aprobo_name,
      })
      .select('*')
      .single();

    if (ccErr) throw new Error(ccErr.message);
    ccEntry = insertedCc;

    const ccLines: Database['public']['Tables']['journal_lines']['Insert'][] = [
      {
        entry_id: ccEntry.id,
        line_order: 1,
        account_code: classification.accountCode,
        third_party_id: entry.third_party_id,
        cost_center_id: costCenterId,
        description: entry.concept,
        debit: totals.accountingExpenseOrCost,
        credit: 0,
        base_amount: totals.base,
        is_deductible: classification.isDeductible,
      },
    ];

    let order = 2;
    if (totals.deductibleIva > 0) {
      ccLines.push({
        entry_id: ccEntry.id,
        line_order: order++,
        account_code: '240810',
        third_party_id: entry.third_party_id,
        cost_center_id: costCenterId,
        description: `IVA descontable ${entry.invoice_number || ''}`.trim(),
        debit: totals.deductibleIva,
        credit: 0,
        base_amount: totals.base,
        is_deductible: true,
      });
    }

    ccLines.push({
      entry_id: ccEntry.id,
      line_order: order++,
      account_code: classification.creditAccountCode,
      third_party_id: entry.third_party_id,
      cost_center_id: costCenterId,
      description: `Causación gasto caja menor: ${entry.supplier_name}`,
      debit: 0,
      credit: totalAmount,
      base_amount: totals.base,
      is_deductible: true,
    });

    await db.from('journal_lines').insert(ccLines);
  }

  let { data: ceEntry } = await db
    .from('journal_entries')
    .select('*')
    .eq('source_table', 'petty_cash_entries')
    .eq('source_id', entry.id)
    .eq('entry_type', 'CE')
    .maybeSingle();

  if (!ceEntry && ccEntry) {
    const { data: ceNum } = await db.rpc('next_document_number', {
      p_prefix: 'CE',
      p_year: year,
      p_padding: 6,
    });

    const { data: insertedCe, error: ceErr } = await db
      .from('journal_entries')
      .insert({
        entry_number: ceNum || `CE-${year}-${Date.now()}`,
        entry_type: 'CE',
        entry_date: entry.entry_date,
        status: 'borrador',
        source_table: 'petty_cash_entries',
        source_id: entry.id,
        linked_entry_id: ccEntry.id,
        third_party_id: entry.third_party_id,
        cost_center_id: costCenterId,
        concept: `Pago caja menor: ${entry.concept}`,
        total_debit: totalAmount,
        total_credit: totalAmount,
        ai_confidence: classification.confidence,
        ai_rationale: `Egreso de caja menor enlazado a ${ccEntry.entry_number}`,
        needs_review: false,
        support_url: supportUrl,
        created_by: entry.created_by,
        elaboro_name: elaboroName,
        reviso_name: settings.reviso_name,
        aprobo_name: settings.aprobo_name,
      })
      .select('*')
      .single();

    if (ceErr) throw new Error(ceErr.message);
    ceEntry = insertedCe;

    await db.from('journal_lines').insert([
      {
        entry_id: ceEntry.id,
        line_order: 1,
        account_code: classification.creditAccountCode,
        third_party_id: entry.third_party_id,
        cost_center_id: costCenterId,
        description: `Cancelación gasto caja menor ${ccEntry.entry_number}`,
        debit: totalAmount,
        credit: 0,
        base_amount: totalAmount,
        is_deductible: true,
      },
      {
        entry_id: ceEntry.id,
        line_order: 2,
        account_code: '110510',
        third_party_id: entry.third_party_id,
        cost_center_id: costCenterId,
        description: `Salida de caja menor: ${entry.supplier_name}`,
        debit: 0,
        credit: totalAmount,
        base_amount: totalAmount,
        is_deductible: true,
      },
    ]);

    await db
      .from('journal_entries')
      .update({ linked_entry_id: ceEntry.id })
      .eq('id', ccEntry.id);
  }

  return { ccEntry, ceEntry };
}

/**
 * Genera de forma idempotente el Recibo de Caja (RC) en borrador para una venta pagada:
 * Débito 111005 BANCOS, Crédito 413505 VENTAS.
 */
export async function ensureDraftEntriesForSale(saleId: string) {
  const db = await getServerDb();
  const { data: sale, error } = await db
    .from('sales')
    .select('*, leads(id, full_name, document_number), profiles!sales_closed_by_fkey(full_name)')
    .eq('id', saleId)
    .single();

  if (error || !sale || sale.status !== 'pagada' || Number(sale.total) <= 0) {
    return null;
  }

  const { data: existingRc } = await db
    .from('journal_entries')
    .select('*')
    .eq('source_table', 'sales')
    .eq('source_id', sale.id)
    .eq('entry_type', 'RC')
    .maybeSingle();

  if (existingRc) return existingRc;

  const { settings } = await loadClassifierContext();
  const entryDate = (sale.paid_at || sale.created_at || '2026-06-01').slice(0, 10);
  const year = Number(entryDate.slice(0, 4)) || 2026;
  const total = Math.round(Number(sale.total) || 0);

  const { data: rcNum } = await db.rpc('next_document_number', {
    p_prefix: 'RC',
    p_year: year,
    p_padding: 6,
  });

  const { data: rcEntry, error: rcErr } = await db
    .from('journal_entries')
    .insert({
      entry_number: rcNum || `RC-${year}-${Date.now()}`,
      entry_type: 'RC',
      entry_date: entryDate,
      status: 'borrador',
      source_table: 'sales',
      source_id: sale.id,
      third_party_id: sale.third_party_id,
      concept: `Recibo de caja venta ${sale.sale_number || ''} — ${sale.leads?.full_name || 'Cliente'}`.trim(),
      total_debit: total,
      total_credit: total,
      ai_confidence: 1.0,
      ai_rationale: 'Venta pagada contabilizada en 111005 BANCOS contra 413505 VENTAS.',
      needs_review: false,
      support_url: sale.receipt_url,
      created_by: sale.closed_by,
      elaboro_name: sale.profiles?.full_name || 'Asesor Comercial KC',
      reviso_name: settings.reviso_name,
      aprobo_name: settings.aprobo_name,
    })
    .select('*')
    .single();

  if (rcErr) throw new Error(rcErr.message);

  await db.from('journal_lines').insert([
    {
      entry_id: rcEntry.id,
      line_order: 1,
      account_code: '111005',
      third_party_id: sale.third_party_id,
      description: `Ingreso a bancos venta ${sale.sale_number || ''}`,
      debit: total,
      credit: 0,
      base_amount: total,
      is_deductible: true,
    },
    {
      entry_id: rcEntry.id,
      line_order: 2,
      account_code: '413505',
      third_party_id: sale.third_party_id,
      description: `Ingresos por ventas — ${sale.leads?.full_name || 'Cliente'}`,
      debit: 0,
      credit: total,
      base_amount: total,
      is_deductible: true,
    },
  ]);

  return rcEntry;
}
