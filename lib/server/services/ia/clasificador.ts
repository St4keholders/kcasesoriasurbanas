import OpenAI from 'openai';

export interface ClassifierAccountInfo {
  code: string;
  name: string;
  account_class: number;
  default_tax_concept?: string | null;
  keywords: string[];
}

export interface ClassifierRuleInfo {
  id?: string;
  name: string;
  source: 'manual' | 'aprendida';
  priority: number;
  cost_center_id?: string | null;
  account_class?: number | null;
  nit_normalized?: string | null;
  keyword_pattern: string;
  debit_account_code: string;
  credit_account_code?: string | null;
  tax_concept?: string | null;
  is_deductible: boolean;
  mark_personal: boolean;
  mark_third_party_support: boolean;
  mark_possible_asset: boolean;
}

export interface ConfirmedMemoryEntry {
  nit_normalized?: string | null;
  third_party_id?: string | null;
  concept: string;
  confirmed_account_code: string;
}

export interface ClassificationInput {
  concept: string;
  supplierName?: string | null;
  nitNormalized?: string | null;
  thirdPartyId?: string | null;
  costCenterId?: string | null;
  costCenterName?: string | null;
  amount?: number;
}

export interface ClassificationOutput {
  accountCode: string;
  accountName: string;
  accountClass: 5 | 6;
  creditAccountCode: '210505' | '230505';
  taxConcept: 'compras' | 'servicios' | 'honorarios' | 'arrendamientos' | 'ninguno';
  confidence: number;
  rationale: string;
  stepResolved: 'memoria_nit' | 'regla_posting' | 'palabras_clave_puc' | 'modelo_ia' | 'fallback_revisar';
  needsReview: boolean;
  isDeductible: boolean;
  marks: {
    posible_personal: boolean;
    soporte_a_nombre_de_tercero: boolean;
    posible_activo: boolean;
  };
  tokensUsed?: number;
  estimatedCostUsd?: number;
}

export interface ClassifierContext {
  accounts: ClassifierAccountInfo[];
  rules: ClassifierRuleInfo[];
  confirmedFeedback: ConfirmedMemoryEntry[];
}

const classificationCache = new Map<string, ClassificationOutput>();

export function clearClassifierCache() {
  classificationCache.clear();
}

export function normalizeTextForMatch(raw: string | null | undefined): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Paso (1): Centro de costo fija la clase contable según la Sección B:
 * - Medellín / KC Asesorías / sin centro -> 5 (Gastos)
 * - Tolú / Apto Bello -> 6 (Costos)
 */
export function resolveClassFromCostCenter(costCenterName?: string | null): 5 | 6 {
  const norm = normalizeTextForMatch(costCenterName);
  if (norm.includes('tolu') || norm.includes('bello') || norm.includes('obra')) {
    return 6;
  }
  return 5;
}

function truncateRationale(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 20) return text.trim();
  return words.slice(0, 20).join(' ');
}

function detectSpecialMarks(normText: string, amount = 0) {
  const posible_personal =
    /\b(salud|terapia|terapias|papi|cuenta del papi|colegio|mercado personal|ropa|medico|odontologia|veterinaria|mascota|regalo personal|andrea)\b/.test(
      normText
    ) && !/\b(seguridad social|examen ocupacional)\b/.test(normText);

  const soporte_a_nombre_de_tercero =
    /\b(notaria|notarial|rentas departamentales|beneficencia|boleta fiscal|registro instrumentos|protocolo|escritura cliente|escrituracion cliente|supernotariado)\b/.test(
      normText
    );

  const posible_activo =
    (/\b(computador|portatil|macbook|impresora|servidor|muebles|escritorio|motocicleta|vehiculo|maquinaria)\b/.test(
      normText
    ) &&
      !/\b(mantenimiento|reparacion|arreglo|alquiler|arriendo|tinta|toner)\b/.test(normText)) ||
    amount >= 4_500_000;

  return {
    posible_personal,
    soporte_a_nombre_de_tercero,
    posible_activo,
  };
}

function inferCreditAccountAndTax(
  accountCode: string,
  account: ClassifierAccountInfo | undefined,
  explicitCredit?: string | null,
  explicitTax?: string | null
): {
  creditAccountCode: '210505' | '230505';
  taxConcept: 'compras' | 'servicios' | 'honorarios' | 'arrendamientos' | 'ninguno';
} {
  const taxConcept = (explicitTax ||
    account?.default_tax_concept ||
    (accountCode.startsWith('5110') || accountCode === '612030'
      ? 'honorarios'
      : accountCode.startsWith('5120')
      ? 'arrendamientos'
      : accountCode.startsWith('5195') || accountCode === '612005' || accountCode === '612020'
      ? 'compras'
      : accountCode.startsWith('53') || accountCode.startsWith('5140') || accountCode === '615595'
      ? 'ninguno'
      : 'servicios')) as 'compras' | 'servicios' | 'honorarios' | 'arrendamientos' | 'ninguno';

  const creditAccountCode: '210505' | '230505' =
    explicitCredit === '210505' || explicitCredit === '230505'
      ? explicitCredit
      : taxConcept === 'compras'
      ? '210505'
      : '230505';

  return { creditAccountCode, taxConcept };
}

/**
 * Clasifica una transacción siguiendo estrictamente los pasos 1 a 5 de la Fase 6A.
 */
export async function classifyTransaction(
  input: ClassificationInput,
  ctx: ClassifierContext
): Promise<ClassificationOutput> {
  const normConcept = normalizeTextForMatch(input.concept);
  const normSupplier = normalizeTextForMatch(input.supplierName);
  const combinedText = `${normConcept} ${normSupplier}`.trim();
  const cleanNit = (input.nitNormalized || '').replace(/[^0-9]/g, '');

  const cacheKey = `${input.costCenterName || 'MDE'}|${cleanNit || normSupplier}|${normConcept}`;
  const cached = classificationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // (1) Centro de costo -> fija la clase base (5 o 6)
  const baseClass = resolveClassFromCostCenter(input.costCenterName);
  const specialMarks = detectSpecialMarks(combinedText, input.amount || 0);

  const accountMap = new Map<string, ClassifierAccountInfo>();
  for (const a of ctx.accounts) {
    accountMap.set(a.code, a);
  }

  // Reglas prioritarias de Sección B (Gastos personales -> 531595 no deducible; Pagos notariales y registro -> 615595 clase 6)
  if (specialMarks.posible_personal) {
    const acc = accountMap.get('531595');
    const result: ClassificationOutput = {
      accountCode: '531595',
      accountName: acc?.name || 'GASTOS NO DEDUCIBLES',
      accountClass: 5,
      creditAccountCode: '230505',
      taxConcept: 'ninguno',
      confidence: 0.96,
      rationale: truncateRationale('Gasto personal o familiar no deducible según política contable Sección B.'),
      stepResolved: 'regla_posting',
      needsReview: false,
      isDeductible: false,
      marks: specialMarks,
    };
    classificationCache.set(cacheKey, result);
    return result;
  }

  if (specialMarks.soporte_a_nombre_de_tercero) {
    const acc = accountMap.get('615595');
    const result: ClassificationOutput = {
      accountCode: '615595',
      accountName: acc?.name || 'GASTOS NOTARIALES Y DE REGISTRO ASUMIDOS',
      accountClass: 6,
      creditAccountCode: '230505',
      taxConcept: 'ninguno',
      confidence: 0.95,
      rationale: truncateRationale(
        'Pago notarial o registro asumido por KC con soporte a nombre de cliente (Sección B).'
      ),
      stepResolved: 'regla_posting',
      needsReview: false,
      isDeductible: true,
      marks: specialMarks,
    };
    classificationCache.set(cacheKey, result);
    return result;
  }

  // (2) Memoria por NIT -> si el tercero tiene 2 o más clasificaciones confirmadas a la misma subcuenta
  if (cleanNit || input.thirdPartyId) {
    const countsByAccount = new Map<string, number>();
    for (const fb of ctx.confirmedFeedback) {
      const sameNit = cleanNit && fb.nit_normalized === cleanNit;
      const sameTp = input.thirdPartyId && fb.third_party_id === input.thirdPartyId;
      if (sameNit || sameTp) {
        const acc = accountMap.get(fb.confirmed_account_code);
        if (acc && acc.account_class === baseClass) {
          countsByAccount.set(
            fb.confirmed_account_code,
            (countsByAccount.get(fb.confirmed_account_code) || 0) + 1
          );
        }
      }
    }

    for (const [accCode, count] of countsByAccount.entries()) {
      if (count >= 2) {
        const acc = accountMap.get(accCode)!;
        const { creditAccountCode, taxConcept } = inferCreditAccountAndTax(accCode, acc);
        const result: ClassificationOutput = {
          accountCode: accCode,
          accountName: acc.name,
          accountClass: baseClass,
          creditAccountCode,
          taxConcept,
          confidence: 0.95,
          rationale: truncateRationale(
            `Memoria por NIT (${count} clasificaciones confirmadas previas para este tercero).`
          ),
          stepResolved: 'memoria_nit',
          needsReview: false,
          isDeductible: accCode !== '531595',
          marks: specialMarks,
        };
        classificationCache.set(cacheKey, result);
        return result;
      }
    }
  }

  // (3A) Palabras clave en posting_rules (ordenadas por prioridad)
  const sortedRules = [...ctx.rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sortedRules) {
    if (rule.account_class && rule.account_class !== baseClass) {
      continue;
    }
    if (rule.nit_normalized && rule.nit_normalized !== cleanNit) {
      continue;
    }
    const keywords = rule.keyword_pattern
      .split('|')
      .map((k) => normalizeTextForMatch(k))
      .filter(Boolean);

    const matchedKeyword = keywords.find((kw) => combinedText.includes(kw));
    if (matchedKeyword) {
      const acc = accountMap.get(rule.debit_account_code);
      const effectiveClass = (acc?.account_class === 6 ? 6 : baseClass) as 5 | 6;
      const { creditAccountCode, taxConcept } = inferCreditAccountAndTax(
        rule.debit_account_code,
        acc,
        rule.credit_account_code,
        rule.tax_concept
      );
      const result: ClassificationOutput = {
        accountCode: rule.debit_account_code,
        accountName: acc?.name || rule.name,
        accountClass: effectiveClass,
        creditAccountCode,
        taxConcept,
        confidence: rule.source === 'aprendida' ? 0.94 : 0.91,
        rationale: truncateRationale(`Regla "${rule.name}" por coincidencia con "${matchedKeyword}".`),
        stepResolved: 'regla_posting',
        needsReview: false,
        isDeductible: rule.is_deductible,
        marks: {
          posible_personal: specialMarks.posible_personal || rule.mark_personal,
          soporte_a_nombre_de_tercero:
            specialMarks.soporte_a_nombre_de_tercero || rule.mark_third_party_support,
          posible_activo: specialMarks.posible_activo || rule.mark_possible_asset,
        },
      };
      classificationCache.set(cacheKey, result);
      return result;
    }
  }

  // (3B) Palabras clave en chart_of_accounts.keywords (subcuentas de la clase fijada por el centro de costo)
  const classAccounts = ctx.accounts.filter(
    (a) => a.account_class === baseClass && a.code.length === 6
  );

  let bestAcc: ClassifierAccountInfo | null = null;
  let bestKw = '';
  let bestScore = 0;

  for (const acc of classAccounts) {
    for (const kw of acc.keywords || []) {
      const normKw = normalizeTextForMatch(kw);
      if (normKw && combinedText.includes(normKw)) {
        const score = normKw.length;
        if (score > bestScore) {
          bestScore = score;
          bestAcc = acc;
          bestKw = normKw;
        }
      }
    }
  }

  if (bestAcc) {
    const { creditAccountCode, taxConcept } = inferCreditAccountAndTax(bestAcc.code, bestAcc);
    const result: ClassificationOutput = {
      accountCode: bestAcc.code,
      accountName: bestAcc.name,
      accountClass: baseClass,
      creditAccountCode,
      taxConcept,
      confidence: 0.88,
      rationale: truncateRationale(`Subcuenta ${bestAcc.code} asignada por palabra clave "${bestKw}".`),
      stepResolved: 'palabras_clave_puc',
      needsReview: false,
      isDeductible: bestAcc.code !== '531595',
      marks: specialMarks,
    };
    classificationCache.set(cacheKey, result);
    return result;
  }

  // (4) Modelo de IA, solo si los pasos anteriores no resuelven y existe OPENAI_API_KEY
  if (process.env.OPENAI_API_KEY && classAccounts.length > 0) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.AI_MODEL_CLASIFICADOR || 'gpt-4o';
      const validCodes = classAccounts.map((a) => a.code);
      const accountsCatalogText = classAccounts
        .map((a) => `${a.code}: ${a.name}`)
        .join('\n');

      // 5 ejemplos parecidos ya confirmados
      const examples = ctx.confirmedFeedback
        .slice(0, 5)
        .map((e) => `- "${e.concept}" -> ${e.confirmed_account_code}`)
        .join('\n');

      const response = await openai.chat.completions.create({
        model,
        temperature: 0,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'clasificacion_contable',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: [
                'account_code',
                'confidence',
                'rationale',
                'posible_personal',
                'soporte_a_nombre_de_tercero',
                'posible_activo',
              ],
              properties: {
                account_code: {
                  type: 'string',
                  enum: validCodes,
                },
                confidence: {
                  type: 'number',
                },
                rationale: {
                  type: 'string',
                },
                posible_personal: { type: 'boolean' },
                soporte_a_nombre_de_tercero: { type: 'boolean' },
                posible_activo: { type: 'boolean' },
              },
            },
          },
        },
        messages: [
          {
            role: 'system',
            content: `Clasifica este movimiento en una subcuenta contable de la Clase ${baseClass} para KC Asesorías Urbanas S.A.S.\nSubcuentas válidas:\n${accountsCatalogText}\n${
              examples ? `\nEjemplos confirmados:\n${examples}` : ''
            }`,
          },
          {
            role: 'user',
            content: `Centro: ${input.costCenterName || 'Medellín'} | Proveedor: ${
              input.supplierName || 'N/A'
            } | Concepto: ${input.concept} | Valor: ${input.amount || 0}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content) as {
          account_code: string;
          confidence: number;
          rationale: string;
          posible_personal: boolean;
          soporte_a_nombre_de_tercero: boolean;
          posible_activo: boolean;
        };
        const chosenAcc = accountMap.get(parsed.account_code);
        if (chosenAcc) {
          const { creditAccountCode, taxConcept } = inferCreditAccountAndTax(chosenAcc.code, chosenAcc);
          const conf = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
          const tokens = response.usage?.total_tokens || 0;
          const result: ClassificationOutput = {
            accountCode: chosenAcc.code,
            accountName: chosenAcc.name,
            accountClass: baseClass,
            creditAccountCode,
            taxConcept,
            confidence: conf,
            rationale: truncateRationale(parsed.rationale || 'Clasificado por modelo IA.'),
            stepResolved: 'modelo_ia',
            needsReview: conf < 0.85,
            isDeductible: chosenAcc.code !== '531595' && !parsed.posible_personal,
            marks: {
              posible_personal: parsed.posible_personal || specialMarks.posible_personal,
              soporte_a_nombre_de_tercero:
                parsed.soporte_a_nombre_de_tercero || specialMarks.soporte_a_nombre_de_tercero,
              posible_activo: parsed.posible_activo || specialMarks.posible_activo,
            },
            tokensUsed: tokens,
            estimatedCostUsd: Number(((tokens / 1000) * 0.005).toFixed(6)),
          };
          classificationCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn('Fallo en llamada a OpenAI clasificador, usando respaldo determinístico:', err);
    }
  }

  // (5) Respaldo Sección B y Sección C:
  // Si es Clase 6 (Obra) y tiene indicios generales de obra -> 612010; si no se puede clasificar -> xx95 (519595 / 612095) con confianza 0 y a revisión
  const fallbackCode = baseClass === 6 ? '612010' : '519595';
  const fallbackAcc = accountMap.get(fallbackCode);
  const { creditAccountCode, taxConcept } = inferCreditAccountAndTax(fallbackCode, fallbackAcc);

  const fallbackResult: ClassificationOutput = {
    accountCode: fallbackCode,
    accountName:
      fallbackAcc?.name ||
      (baseClass === 6
        ? 'COSTOS DE OBRA Y CONSTRUCCIÓN (GENERAL)'
        : 'OTROS GASTOS DIVERSOS DE ADMINISTRACIÓN'),
    accountClass: baseClass,
    creditAccountCode,
    taxConcept,
    confidence: 0,
    rationale: truncateRationale(
      'Sin coincidencia en reglas determinísticas; asignado a cuenta por defecto para revisión.'
    ),
    stepResolved: 'fallback_revisar',
    needsReview: true,
    isDeductible: true,
    marks: specialMarks,
    tokensUsed: 0,
    estimatedCostUsd: 0,
  };

  classificationCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

/**
 * Paso (7): Procesa un lote de transacciones con concurrencia controlada (máx. 4) y reintentos.
 */
export async function classifyBatch(
  items: ClassificationInput[],
  ctx: ClassifierContext,
  concurrency = 4
): Promise<ClassificationOutput[]> {
  const results = new Array<ClassificationOutput>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx];
      let attempts = 0;
      while (attempts < 3) {
        try {
          results[idx] = await classifyTransaction(item, ctx);
          break;
        } catch (err) {
          attempts++;
          if (attempts >= 3) throw err;
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
