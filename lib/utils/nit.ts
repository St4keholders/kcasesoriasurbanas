const DIAN_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] as const;

/**
 * Extrae únicamente los dígitos del NIT y descarta comodines inválidos como '000000000'.
 */
export function normalizeNitDigits(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  const basePart = trimmed.includes('-') ? trimmed.split('-')[0] : trimmed;
  const digits = basePart.replace(/[^0-9]/g, '');
  if (!digits || /^0+$/.test(digits)) {
    return '';
  }
  return digits;
}

/**
 * Calcula el Dígito de Verificación (DV) según el algoritmo Módulo 11 de la DIAN.
 */
export function calculateDianDv(nitInput: string | number | null | undefined): number | null {
  const digits = normalizeNitDigits(String(nitInput ?? ''));
  if (!digits || digits.length < 3 || digits.length > 15) {
    return null;
  }

  let sum = 0;
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    const digit = Number(digits[len - 1 - i]);
    const weight = DIAN_WEIGHTS[i];
    sum += digit * weight;
  }

  const remainder = sum % 11;
  return remainder === 0 || remainder === 1 ? remainder : 11 - remainder;
}

export interface ParsedNitResult {
  nit: string;
  dv: string | null;
  expectedDv: number | null;
  isValidDv: boolean;
  formatted: string;
}

/**
 * Parsea un documento o NIT (con o sin guion de DV) y valida su dígito de verificación.
 */
export function parseNitAndDv(raw: string | null | undefined): ParsedNitResult {
  if (!raw) {
    return { nit: '', dv: null, expectedDv: null, isValidDv: false, formatted: '' };
  }
  const cleanRaw = String(raw).trim();
  let nitPart = cleanRaw;
  let dvPart: string | null = null;

  if (cleanRaw.includes('-')) {
    const parts = cleanRaw.split('-');
    nitPart = parts[0] || '';
    const rawDv = (parts[1] || '').replace(/[^0-9]/g, '');
    dvPart = rawDv.length > 0 ? rawDv[0] : null;
  } else {
    const onlyDigits = cleanRaw.replace(/[^0-9]/g, '');
    // Si tiene 10 dígitos y empieza por 8 o 9 (persona jurídica en Colombia con DV pegado)
    if (onlyDigits.length === 10 && (onlyDigits.startsWith('8') || onlyDigits.startsWith('9'))) {
      const candidateNit = onlyDigits.slice(0, 9);
      const candidateDv = onlyDigits.slice(9, 10);
      if (calculateDianDv(candidateNit) === Number(candidateDv)) {
        nitPart = candidateNit;
        dvPart = candidateDv;
      }
    }
  }

  const nit = normalizeNitDigits(nitPart);
  if (!nit) {
    return { nit: '', dv: null, expectedDv: null, isValidDv: false, formatted: '' };
  }

  const expectedDv = calculateDianDv(nit);
  const effectiveDv = dvPart !== null ? dvPart : expectedDv !== null ? String(expectedDv) : null;
  const isValidDv =
    expectedDv !== null && effectiveDv !== null && Number(effectiveDv) === expectedDv;

  return {
    nit,
    dv: effectiveDv,
    expectedDv,
    isValidDv,
    formatted: effectiveDv !== null ? `${nit}-${effectiveDv}` : nit,
  };
}

export function validateNitWithDv(
  nit: string | null | undefined,
  dv?: string | number | null
): boolean {
  const cleanNit = normalizeNitDigits(nit);
  if (!cleanNit) return false;
  const expected = calculateDianDv(cleanNit);
  if (expected === null) return false;
  if (dv === undefined || dv === null || String(dv).trim() === '') {
    return false;
  }
  const cleanDv = String(dv).replace(/[^0-9]/g, '');
  if (cleanDv.length !== 1) return false;
  return Number(cleanDv) === expected;
}

export const KC_NIT = '902012620';
export const KC_DV = '0';
export const KC_NIT_FULL = '902012620-0';

export function isKcNit(raw: string | null | undefined): boolean {
  const parsed = parseNitAndDv(raw);
  return parsed.nit === KC_NIT;
}
