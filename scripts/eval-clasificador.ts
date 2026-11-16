import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  classifyBatch,
  clearClassifierCache,
  type ClassifierContext,
} from '../lib/server/services/ia/clasificador';

interface EvalFixture {
  id: string;
  costCenterName: string;
  supplierName: string;
  nitNormalized: string;
  concept: string;
  amount: number;
  expectedClass: 5 | 6;
  expectedAccount: string;
}

function getEnv(content: string, key: string, alt?: string): string {
  const m = content.match(new RegExp(`^${key}=\\s*(\\S+)`, 'm'));
  if (m) return m[1];
  if (alt) {
    const m2 = content.match(new RegExp(`^${alt}=\\s*(\\S+)`, 'm'));
    if (m2) return m2[1];
  }
  return process.env[key] || '';
}

async function runEval() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const supabaseUrl = getEnv(env, 'NEXT_PUBLIC_SUPABASE_URL', 'project_url');
  const serviceKey = getEnv(env, 'SUPABASE_SERVICE_ROLE_KEY', 'Secret_key');

  const supabase = createClient(supabaseUrl, serviceKey);

  const [accountsRes, rulesRes, feedbackRes] = await Promise.all([
    supabase
      .from('chart_of_accounts')
      .select('code, name, account_class, default_tax_concept, keywords')
      .eq('is_active', true),
    supabase.from('posting_rules').select('*').eq('is_active', true),
    supabase.from('classification_feedback').select('*'),
  ]);

  const ctx: ClassifierContext = {
    accounts: (accountsRes.data || []).map((a) => ({
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
    confirmedFeedback: (feedbackRes.data || []).map((f) => ({
      nit_normalized: f.nit_normalized,
      third_party_id: f.third_party_id,
      concept: f.concept,
      confirmed_account_code: f.confirmed_account_code,
    })),
  };

  const fixturesPath = path.resolve(process.cwd(), 'tests/fixtures/clasificador.json');
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8')) as EvalFixture[];

  clearClassifierCache();
  const outputs = await classifyBatch(
    fixtures.map((f) => ({
      concept: f.concept,
      supplierName: f.supplierName,
      nitNormalized: f.nitNormalized,
      costCenterName: f.costCenterName,
      amount: f.amount,
    })),
    ctx,
    4
  );

  let classHits = 0;
  let accountHits = 0;

  for (let i = 0; i < fixtures.length; i++) {
    const fix = fixtures[i];
    const out = outputs[i];
    const classOk = out.accountClass === fix.expectedClass;
    const accOk = out.accountCode === fix.expectedAccount;
    if (classOk) classHits++;
    if (accOk) accountHits++;
    console.log(
      `[${fix.id}] esperado=${fix.expectedClass}/${fix.expectedAccount} obtenido=${out.accountClass}/${out.accountCode} (${out.stepResolved}, conf=${out.confidence}) -> ${
        accOk ? 'OK' : 'DIFF'
      }`
    );
  }

  const classPct = Number(((classHits / fixtures.length) * 100).toFixed(1));
  const accountPct = Number(((accountHits / fixtures.length) * 100).toFixed(1));

  console.log(`\nResultado eval:clasificador (${fixtures.length} casos):`);
  console.log(`- Acierto en clase contable: ${classHits}/${fixtures.length} (${classPct}%) [Meta >= 90%]`);
  console.log(`- Acierto en subcuenta PUC: ${accountHits}/${fixtures.length} (${accountPct}%) [Meta >= 80%]`);

  if (classPct < 90 || accountPct < 80) {
    console.error('No se alcanzó la meta mínima del clasificador.');
    process.exit(1);
  }
}

runEval().catch((err) => {
  console.error(err);
  process.exit(1);
});
