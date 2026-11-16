import 'server-only';
import { getServerDb, getAdminDb } from '@/lib/server/db';

/**
 * Contabilidad KC: toda la lógica de asientos vive en la base de datos
 * (funciones kc_post_purchase, kc_post_petty_cash, kc_post_sale).
 * Tesorería → CC (causación) + CE (egreso) el mismo día.
 * Compras a crédito → solo CC hasta que Tesorería registre el pago.
 */

export async function postPurchase(purchaseId: string) {
  const db = await getServerDb();
  const { error } = await db.rpc('kc_post_purchase', { p_purchase: purchaseId });
  if (error) throw new Error('No se pudo generar la causación/egreso: ' + error.message);
}

export async function postPettyCash(entryId: string) {
  const db = await getServerDb();
  const { error } = await db.rpc('kc_post_petty_cash', { p_entry: entryId });
  if (error) throw new Error('No se pudo generar el comprobante de caja menor: ' + error.message);
}

export async function postSale(saleId: string) {
  const db = await getServerDb();
  const { error } = await db.rpc('kc_post_sale', { p_sale: saleId });
  if (error) throw new Error('No se pudo generar el recibo de caja: ' + error.message);
}

export type SourceTable = 'purchases' | 'petty_cash_entries' | 'sales';

export interface OperationLine {
  account_code: string;
  account_name: string;
  description: string;
  debit: number;
  credit: number;
}

export interface OperationEntry {
  id: string;
  entry_number: string;
  entry_type: string;
  entry_date: string;
  status: string;
  concept: string;
  total: number;
  lines: OperationLine[];
}

export interface OperationData {
  source_table: SourceTable;
  source_id: string;
  number: string | null;
  date: string;
  supplier_name: string;
  supplier_doc: string | null;
  concept: string;
  cost_center: string | null;
  category: string | null;
  invoice_number: string | null;
  base: number;
  iva: number;
  withholding: number;
  total: number;
  support: string | null;
  entries: OperationEntry[];
}

/** Carga una operación (compra o caja menor) con sus comprobantes y líneas. Usa el cliente admin: llamar solo después de requireRole. */
export async function loadOperation(source: SourceTable, id: string): Promise<OperationData | null> {
  const db = getAdminDb();
  let op: OperationData | null = null;

  if (source === 'purchases') {
    const { data: p } = await db
      .from('purchases')
      .select('*, cost_centers(name), expense_categories(name), third_parties(name, nit_normalized, dv)')
      .eq('id', id)
      .maybeSingle();
    if (!p) return null;
    const tp = (p as any).third_parties;
    op = {
      source_table: source,
      source_id: id,
      number: p.purchase_number,
      date: p.transaction_date,
      supplier_name: tp?.name || p.supplier_name || 'Sin tercero',
      supplier_doc: tp?.nit_normalized ? `${tp.nit_normalized}${tp.dv ? '-' + tp.dv : ''}` : null,
      concept: p.concept || '',
      cost_center: (p as any).cost_centers?.name ?? null,
      category: (p as any).expense_categories?.name ?? null,
      invoice_number: p.invoice_number,
      base: Number(p.amount || 0),
      iva: Number(p.tax_iva || 0),
      withholding: Number(p.withholding_tax || 0),
      total: Number(p.total || 0),
      support: p.support_storage_path || p.legacy_drive_url || p.invoice_url || null,
      entries: [],
    };
  } else if (source === 'petty_cash_entries') {
    const { data: e } = await db
      .from('petty_cash_entries')
      .select('*, petty_cash_boxes(name, cost_centers(name)), expense_categories(name)')
      .eq('id', id)
      .maybeSingle();
    if (!e) return null;
    const box = (e as any).petty_cash_boxes;
    op = {
      source_table: source,
      source_id: id,
      number: box?.name ? `Caja ${box.name}` : null,
      date: e.entry_date,
      supplier_name: e.supplier_name || 'Sin tercero',
      supplier_doc: e.supplier_document,
      concept: e.concept || '',
      cost_center: box?.cost_centers?.name ?? null,
      category: (e as any).expense_categories?.name ?? null,
      invoice_number: e.invoice_number,
      base: Number(e.total_amount || 0) - Number(e.tax_amount || 0),
      iva: Number(e.tax_amount || 0),
      withholding: 0,
      total: Number(e.total_amount || 0),
      support: e.support_storage_path || e.legacy_drive_url || e.receipt_url || null,
      entries: [],
    };
  } else {
    const { data: s } = await db.from('sales').select('*, leads(full_name)').eq('id', id).maybeSingle();
    if (!s) return null;
    op = {
      source_table: source,
      source_id: id,
      number: s.sale_number,
      date: (s.paid_at || s.created_at || '').slice(0, 10),
      supplier_name: (s as any).leads?.full_name || 'Cliente',
      supplier_doc: null,
      concept: `Venta ${s.sale_number}`,
      cost_center: null,
      category: null,
      invoice_number: s.sale_number,
      base: Number(s.subtotal || 0) - Number(s.discount || 0),
      iva: Number(s.tax || 0),
      withholding: Number((s as any).withholding_tax || 0),
      total: Number(s.total || 0),
      support: s.support_storage_path || s.receipt_url || null,
      entries: [],
    };
  }

  const { data: entries } = await db
    .from('journal_entries')
    .select('id, entry_number, entry_type, entry_date, status, concept, total_debit, journal_lines(account_code, description, debit, credit, line_order)')
    .eq('source_table', source)
    .eq('source_id', id)
    .order('entry_type', { ascending: true });

  const codes = new Set<string>();
  for (const e of entries || []) for (const l of (e as any).journal_lines || []) codes.add(l.account_code);
  const { data: accounts } = codes.size
    ? await db.from('chart_of_accounts').select('code, name').in('code', Array.from(codes))
    : { data: [] as { code: string; name: string }[] };
  const names = new Map((accounts || []).map((a) => [a.code, a.name]));

  op.entries = (entries || []).map((e: any) => ({
    id: e.id,
    entry_number: e.entry_number,
    entry_type: e.entry_type,
    entry_date: e.entry_date,
    status: e.status,
    concept: e.concept,
    total: Number(e.total_debit || 0),
    lines: ((e.journal_lines || []) as any[])
      .sort((a, b) => a.line_order - b.line_order)
      .map((l) => ({
        account_code: l.account_code,
        account_name: names.get(l.account_code) || '',
        description: l.description || '',
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      })),
  }));
  // CC primero, luego CE / RC
  const order: Record<string, number> = { CC: 0, CE: 1, RC: 2, NC: 3 };
  op.entries.sort((a, b) => (order[a.entry_type] ?? 9) - (order[b.entry_type] ?? 9));
  return op;
}
