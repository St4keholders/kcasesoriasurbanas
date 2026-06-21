import { MESES, DIAS } from '../constants';

export function formatDate(date: Date): string {
  return `${DIAS[date.getDay()]} ${date.getDate()} de ${MESES[date.getMonth()]}`;
}

export function formatDateLong(date: Date): string {
  return formatDate(date);
}

/**
 * Combines a date and a slot string into an ISO datetime string.
 * The slot is like "10:00 a.m." or "2:00 p.m."
 */
export function combineDateAndSlot(date: Date, slot: string): string {
  // Parse the slot string to 24h format
  const match = slot.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)/i);
  if (!match) {
    // Fallback: use noon
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toLowerCase();

  if (period === 'p.m.' && hours !== 12) hours += 12;
  if (period === 'a.m.' && hours === 12) hours = 0;

  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}
