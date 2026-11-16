const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
  
  const res = await fetch(`${url}/rest/v1/petty_cash_entries?limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json();
  console.log('Rest API response:', data);
}
check();
