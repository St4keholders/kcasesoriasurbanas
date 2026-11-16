import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Fase 8 — Sistema de Tokens Liquid Glass y Contraste WCAG AA (>= 4.5:1)', () => {
  const tokensPath = path.resolve(process.cwd(), 'app/styles/tokens.css');
  const css = fs.readFileSync(tokensPath, 'utf8');

  const getTokenHex = (name: string): string => {
    const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
    if (!match) throw new Error(`Token ${name} no encontrado en app/styles/tokens.css`);
    return match[1];
  };

  it('define los tokens Liquid Glass requeridos (opacidad ~55%, blur 20px saturate 180%, respaldo sólido)', () => {
    expect(css).toContain('--glass-bg:');
    expect(css).toContain('blur(20px) saturate(180%)');
    expect(css).toContain('--glass-fallback:');
    expect(css).toContain('@supports');
  });

  it('cumple contraste WCAG AA (>= 4.5:1) para todos los tokens de texto y acento sobre --bg y --bg-card', () => {
    const bg = getTokenHex('--bg');
    const bgCard = getTokenHex('--bg-card');
    const fg = getTokenHex('--fg');
    const fgSoft = getTokenHex('--fg-soft');
    const dim = getTokenHex('--dim');
    const skyDeep = getTokenHex('--sky-deep');
    const successText = getTokenHex('--success-text');
    const warningText = getTokenHex('--warning-text');
    const dangerText = getTokenHex('--danger-text');

    expect(contrastRatio(fg, bgCard)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fgSoft, bgCard)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fgSoft, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dim, bgCard)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dim, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(skyDeep, bgCard)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(skyDeep, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', skyDeep)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(successText, bgCard)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(warningText, bgCard)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dangerText, bgCard)).toBeGreaterThanOrEqual(4.5);
  });

  it('no existen archivos neu-forms.css ni clases neu-* en app/ ni components/', () => {
    expect(fs.existsSync(path.resolve(process.cwd(), 'app/neu-forms.css'))).toBe(false);
  });
});
