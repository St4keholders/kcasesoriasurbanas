const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const xlsx = require('xlsx');

async function fixAptoBello() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
  const supabase = createClient(url, key);

  const { data: cc } = await supabase.from('cost_centers').select('id').eq('name', 'Apto Bello').single();
  const ccId = cc.id;

  // Delete all existing Apto Bello purchases
  await supabase.from('purchases').delete().eq('cost_center_id', ccId);

  // Parse Excel again
  const wb = xlsx.readFile('COMPRAS APTO BELLO.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false });
  
  const parseAmount = (val) => {
    if (!val) return 0;
    const num = Number(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  };
  
  const cleanStr = (str) => {
    if (str === null || str === undefined) return '';
    return String(str).trim();
  };

  const records = [];
  
  // Suppliers map
  const { data: existingSuppliers } = await supabase.from('suppliers').select('id, name');
  const supplierMap = {};
  existingSuppliers.forEach(s => supplierMap[s.name.toLowerCase()] = s.id);

  for (let i = 1; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0 || !row[0]) continue;
    let dStr = cleanStr(row[0]);
    if (dStr.toUpperCase() === 'TOTAL') continue;
    
    // Parse '4 Jun 2026' or 'Jun 12 2026' to '2026-06-XX'
    let day = '01';
    let month = '06';
    let year = '2026';
    const match = dStr.match(/(\d+)\s+Jun/i) || dStr.match(/Jun\s+(\d+)/i);
    if (match) {
        day = match[1].padStart(2, '0');
    }
    const isoDate = `${year}-${month}-${day}`;
    
    let supplierName = cleanStr(row[2]) || 'Proveedor Ocasional';
    
    records.push({
      cost_center_id: ccId,
      supplier_id: supplierMap[supplierName.toLowerCase()] || supplierMap['proveedor ocasional'],
      concept: cleanStr(row[4]),
      amount: parseAmount(row[5]),
      tax_iva: 0,
      withholding_tax: 0,
      total: parseAmount(row[5]),
      transaction_date: isoDate,
      status: 'pagado',
      transaction_type: 'costo_gasto'
    });
  }

  const { error } = await supabase.from('purchases').insert(records);
  console.log('Inserted correctly with dates:', records.map(r => r.transaction_date).join(', '), error);
}
fixAptoBello();
