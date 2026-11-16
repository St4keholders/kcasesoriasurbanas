/**
 * Formatea un valor numérico a pesos colombianos (COP) sin decimales.
 */
export function formatCOP(value: number | string | null | undefined): string {
  const num = typeof value === 'number' ? value : parseCOP(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(num));
}

/**
 * Convierte cadenas de moneda colombiana (ej. "$ 1.250.000", "1.250.000,00", "1,250,000") a número.
 */
export function parseCOP(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : 0;

  let s = String(raw).trim();
  if (!s) return 0;

  const isNegative = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')'));
  s = s.replace(/[^0-9.,]/g, '');
  if (!s) return 0;

  // Caso con coma decimal al final: "1.250.000,50" -> quitar miles '.' y usar '.' decimal
  if (s.includes('.') && s.includes(',')) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes('.')) {
    const parts = s.split('.');
    // Si tiene puntos de miles (ej. "1.250.000" o "45.000")
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/\./g, '');
    }
  } else if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(',', '.');
    }
  }

  const parsed = Number(s);
  if (!Number.isFinite(parsed)) return 0;
  return isNegative ? -Math.round(parsed) : Math.round(parsed);
}

export interface InvoiceTotalInput {
  amount: number;
  taxIva?: number;
  withholdingTax?: number;
  hasElectronicInvoice?: boolean;
  isAddressedToKc?: boolean;
}

export interface InvoiceTotalResult {
  base: number;
  taxIva: number;
  deductibleIva: number;
  nonDeductibleIva: number;
  accountingExpenseOrCost: number;
  withholdingTax: number;
  total: number;
}

/**
 * Calcula los totales de una compra aplicando la regla tributaria de KC (Sección B):
 * El IVA solo es descontable (240810) con factura electrónica a nombre de KC;
 * en cualquier otro caso suma al mayor valor del gasto o costo.
 */
export function calculateInvoiceTotals(input: InvoiceTotalInput): InvoiceTotalResult {
  const base = Math.max(0, Math.round(Number(input.amount) || 0));
  const taxIva = Math.max(0, Math.round(Number(input.taxIva) || 0));
  const withholdingTax = Math.max(0, Math.round(Number(input.withholdingTax) || 0));

  const isIvaDeductible =
    taxIva > 0 &&
    input.hasElectronicInvoice !== false &&
    input.isAddressedToKc !== false;

  const deductibleIva = isIvaDeductible ? taxIva : 0;
  const nonDeductibleIva = isIvaDeductible ? 0 : taxIva;
  const accountingExpenseOrCost = base + nonDeductibleIva;
  const total = Math.max(0, base + taxIva - withholdingTax);

  return {
    base,
    taxIva,
    deductibleIva,
    nonDeductibleIva,
    accountingExpenseOrCost,
    withholdingTax,
    total,
  };
}

const UNIDADES = [
  '',
  'UN',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
];
const ESPECIALES = [
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISÉIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
];
const VEINTIS = [
  'VEINTE',
  'VEINTIÚN',
  'VEINTIDÓS',
  'VEINTITRÉS',
  'VEINTICUATRO',
  'VEINTICINCO',
  'VEINTISÉIS',
  'VEINTISIETE',
  'VEINTIOCHO',
  'VEINTINUEVE',
];
const DECENAS = [
  '',
  'DIEZ',
  'VEINTE',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];
const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function convertThreeDigits(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const c = Math.floor(n / 100);
  const rest = n % 100;
  let result = c > 0 ? CENTENAS[c] : '';

  if (rest > 0) {
    if (result) result += ' ';
    if (rest < 10) {
      result += UNIDADES[rest];
    } else if (rest < 20) {
      result += ESPECIALES[rest - 10];
    } else if (rest < 30) {
      result += VEINTIS[rest - 20];
    } else {
      const d = Math.floor(rest / 10);
      const u = rest % 10;
      result += DECENAS[d] + (u > 0 ? ` Y ${UNIDADES[u]}` : '');
    }
  }
  return result;
}

/**
 * Convierte un monto en pesos colombianos a letras para comprobantes contables.
 */
export function numberToSpanishWordsCOP(amount: number): string {
  const n = Math.floor(Math.abs(amount || 0));
  if (n === 0) return 'CERO PESOS M/CTE';

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const hundreds = n % 1_000;

  const parts: string[] = [];

  if (millions === 1) {
    parts.push('UN MILLÓN');
  } else if (millions > 1) {
    parts.push(`${convertThreeDigits(millions)} MILLONES`);
  }

  if (thousands === 1) {
    parts.push('MIL');
  } else if (thousands > 1) {
    parts.push(`${convertThreeDigits(thousands)} MIL`);
  }

  if (hundreds > 0) {
    let hText = convertThreeDigits(hundreds);
    if (hText.endsWith('UN')) {
      hText = hText.slice(0, -2) + 'UNO';
    }
    parts.push(hText);
  }

  const currencyLabel = n % 1_000_000 === 0 && millions > 0 ? 'DE PESOS M/CTE' : 'PESOS M/CTE';
  return `${parts.join(' ')} ${currencyLabel}`;
}
