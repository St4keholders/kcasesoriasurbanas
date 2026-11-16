import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha a "dd MMM yyyy" en español (ej. "16 nov 2026").
 */
export function formatDateCO(input: string | Date | null | undefined): string {
  if (!input) return '-';
  try {
    const date = typeof input === 'string' ? parseISO(input) : input;
    if (!isValid(date)) return String(input);
    return format(date, 'dd MMM yyyy', { locale: es }).replace('.', '');
  } catch {
    return String(input);
  }
}

/**
 * Formatea una fecha y hora a "dd MMM yyyy, HH:mm" en español.
 */
export function formatDateTimeCO(input: string | Date | null | undefined): string {
  if (!input) return '-';
  try {
    const date = typeof input === 'string' ? parseISO(input) : input;
    if (!isValid(date)) return String(input);
    return format(date, 'dd MMM yyyy, HH:mm', { locale: es }).replace('.', '');
  } catch {
    return String(input);
  }
}

/**
 * Valida que la fecha de un documento contable sea válida, pertenezca al año gravable 2026 y no sea futura.
 */
export function validateAccountingDate2026(
  dateStr: string | null | undefined,
  referenceToday: Date = new Date('2026-12-31T23:59:59Z')
): { valid: boolean; reason?: string } {
  if (!dateStr || !String(dateStr).trim()) {
    return { valid: false, reason: 'La fecha del documento es obligatoria.' };
  }
  const clean = String(dateStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return { valid: false, reason: 'Formato de fecha inválido (debe ser YYYY-MM-DD).' };
  }
  const parsed = parseISO(clean);
  if (!isValid(parsed)) {
    return { valid: false, reason: 'Fecha inválida en el calendario.' };
  }
  const year = Number(clean.slice(0, 4));
  if (year !== 2026) {
    return { valid: false, reason: `La fecha (${clean}) está fuera del período contable 2026.` };
  }
  if (parsed.getTime() > referenceToday.getTime()) {
    return { valid: false, reason: `La fecha (${clean}) no puede ser futura.` };
  }
  return { valid: true };
}
