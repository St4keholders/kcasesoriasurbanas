const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testQuery() {
  const currentMonthStartStr = '2026-06-01';
  const currentMonthEndStr = '2026-06-30';

  const { data: purchasesRaw, error } = await supabase
    .from('purchases')
    .select('id, total, transaction_date, concept, status, cost_centers(name), suppliers(name)')
    .gte('transaction_date', currentMonthStartStr)
    .lte('transaction_date', currentMonthEndStr);

  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log(`Found ${purchasesRaw.length} purchases between ${currentMonthStartStr} and ${currentMonthEndStr}`);
  if (purchasesRaw.length > 0) {
    console.log(purchasesRaw.slice(0, 5));
  }
}

testQuery();
