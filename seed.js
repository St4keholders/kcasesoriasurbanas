const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const xlsx = require('xlsx');

// 1. Initialize Supabase Client
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error("Could not find Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Excel Files
const files = {
  pettyCash: 'CAJAS MENORES JUNIO.xlsx',
  purchases: {
    'Apto Bello': 'COMPRAS APTO BELLO.xlsx',
    'KC ASESORÍAS': 'COMPRAS MEDELLIN KC ASESORIAS.xlsx',
    'TOLÚ': 'COMPRAS TOLU.xlsx'
  }
};

// Clean string helper
const cleanStr = (str) => {
  if (str === null || str === undefined) return '';
  return String(str).trim();
};

const parseAmount = (val) => {
  if (!val) return 0;
  const num = Number(String(val).replace(/[^0-9.-]+/g, ""));
  return isNaN(num) ? 0 : num;
};

// Main function
async function seedDatabase() {
  console.log('Starting DB seeding process...');

  try {
    // --- STEP 0: CLEAR EXISTING DATA ---
    console.log('\n--- Clearing Existing Test Data ---');
    await supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('petty_cash_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('petty_cash_boxes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // suppliers could be referenced in other tables, so we just clear ones that aren't 'Proveedor Ocasional' or maybe we clear everything.
    await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Cleared existing data.');

    // --- STEP 1: COST CENTERS ---
    console.log('\n--- Checking Cost Centers ---');
    const { data: existingCCs, error: ccErr } = await supabase.from('cost_centers').select('*');
    if (ccErr) throw ccErr;

    const ccMap = {};
    for (const cc of existingCCs) {
      ccMap[cc.name.toLowerCase()] = cc.id;
    }

    // Ensure "Apto Bello" exists
    if (!ccMap['apto bello']) {
      console.log('Creating "Apto Bello" cost center...');
      const { data: newCC, error } = await supabase.from('cost_centers').insert({
        name: 'Apto Bello',
        description: 'Centro de costo Apto Bello',
        is_active: true
      }).select().single();
      if (error) throw error;
      ccMap['apto bello'] = newCC.id;
      console.log('Created Apto Bello CC:', newCC.id);
    } else {
      console.log('"Apto Bello" already exists.');
    }

    // --- STEP 2: PARSE EXCEL FILES ---
    console.log('\n--- Parsing Excel files ---');
    const allSuppliers = new Set();
    const purchaseRecordsByCC = {};
    const pettyCashRecords = [];

    // Parse purchases
    for (const [ccName, file] of Object.entries(files.purchases)) {
      console.log(`Parsing ${file} for CC ${ccName}...`);
      const wb = xlsx.readFile(file);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
      
      const records = [];
      // Skip header row
      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length === 0 || !row[0] || String(row[0]).toUpperCase().includes('TOTAL') || String(row[1]).toUpperCase().includes('TOTAL')) continue; // Skip empty rows
        
        // Cols: 'Fecha', 'Tipo de transaccion', 'Nombre', 'NIT', 'Nota', 'Valor'
        const supplierName = cleanStr(row[2]) || 'Proveedor Ocasional';
        let supplierNit = cleanStr(row[3]);
        if (supplierNit.toLowerCase().includes('ocasional') || supplierNit === 'PAGO' || !supplierNit) {
          supplierNit = ''; // Don't save fake NITs
        }
        
        allSuppliers.add(supplierName);

        // Try to fix date format if it's strange
        let dateVal = cleanStr(row[0]);
        if (!dateVal.match(/^20[0-9]{2}-[0-9]{2}-[0-9]{2}/)) dateVal = new Date().toISOString().substring(0, 10);
        if (dateVal.length > 10) dateVal = dateVal.substring(0, 10);

        records.push({
          date: dateVal,
          type: cleanStr(row[1]) === 'Insumos' ? 'costo_gasto' : 'costo_gasto',
          supplier: supplierName,
          concept: cleanStr(row[4]),
          amount: parseAmount(row[5])
        });
      }
      purchaseRecordsByCC[ccName] = records;
      console.log(`Found ${records.length} records in ${file}`);
    }

    // Parse Petty Cash
    console.log(`Parsing ${files.pettyCash}...`);
    const wb = xlsx.readFile(files.pettyCash);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const pcJson = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
    
    for (let i = 1; i < pcJson.length; i++) {
      const row = pcJson[i];
      if (!row || row.length === 0 || !row[0] || String(row[0]).toUpperCase().includes('TOTAL') || String(row[1]).toUpperCase().includes('TOTAL')) continue;
      
      // Cols: 'Fecha', 'Caja reportada', 'Nombre del empleado', 'Proveedor', 'NIT', 'Número de factura', 'Concepto', 'IVA', 'Valor total'
      const supplierName = cleanStr(row[3]) || 'Proveedor Ocasional';
      allSuppliers.add(supplierName);
      
      let dateVal = cleanStr(row[0]);
        if (!dateVal.match(/^20[0-9]{2}-[0-9]{2}-[0-9]{2}/)) dateVal = new Date().toISOString().substring(0, 10);
      if (dateVal.length > 10) dateVal = dateVal.substring(0, 10);

      pettyCashRecords.push({
        date: dateVal,
        box_number: cleanStr(row[1]) || '1',
        employee: cleanStr(row[2]),
        supplier: supplierName,
        invoice: cleanStr(row[5]),
        concept: cleanStr(row[6]),
        amount: parseAmount(row[8])
      });
    }
    console.log(`Found ${pettyCashRecords.length} records in Petty Cash`);

    // --- STEP 3: CREATE SUPPLIERS ---
    console.log('\n--- Processing Suppliers ---');
    const { data: existingSuppliers, error: suppErr } = await supabase.from('suppliers').select('id, name');
    if (suppErr) throw suppErr;

    const supplierMap = {};
    for (const s of existingSuppliers) {
      supplierMap[s.name.toLowerCase()] = s.id;
    }

    const newSuppliers = [];
    for (const sName of allSuppliers) {
      if (!supplierMap[sName.toLowerCase()] && sName !== 'Proveedor Ocasional') {
        newSuppliers.push({ name: sName, is_active: true });
      }
    }

    if (newSuppliers.length > 0) {
      console.log(`Inserting ${newSuppliers.length} new suppliers...`);
      const { data: insertedSupps, error } = await supabase.from('suppliers').insert(newSuppliers).select('id, name');
      if (error) throw error;
      for (const s of insertedSupps) {
        supplierMap[s.name.toLowerCase()] = s.id;
      }
    } else {
      console.log('No new suppliers to insert.');
    }
    
    // Ensure "Proveedor Ocasional" exists
    if (!supplierMap['proveedor ocasional']) {
      const { data: poc, error } = await supabase.from('suppliers').insert({ name: 'Proveedor Ocasional', is_active: true }).select('id, name').single();
      if (!error && poc) supplierMap['proveedor ocasional'] = poc.id;
    }

    // --- STEP 4: INSERT PURCHASES ---
    console.log('\n--- Inserting Purchases ---');
    let totalPurchases = 0;
    for (const [ccName, records] of Object.entries(purchaseRecordsByCC)) {
      const ccId = ccMap[ccName.toLowerCase()];
      if (!ccId) {
        console.warn(`Warning: CC ${ccName} not found in DB! Skipping...`);
        continue;
      }

      const purchasesToInsert = records.map(r => ({
        cost_center_id: ccId,
        supplier_id: supplierMap[r.supplier.toLowerCase()] || supplierMap['proveedor ocasional'],
        concept: r.concept,
        amount: r.amount,
        tax_iva: 0,
        withholding_tax: 0,
        total: r.amount,
        transaction_date: r.date,
        status: 'pagado',
        transaction_type: r.type,
      }));

      if (purchasesToInsert.length > 0) {
        const { error } = await supabase.from('purchases').insert(purchasesToInsert);
        if (error) throw error;
        console.log(`Inserted ${purchasesToInsert.length} purchases for ${ccName}`);
        totalPurchases += purchasesToInsert.length;
      }
    }

    // --- STEP 5: PETTY CASH BOXES & ENTRIES ---
    console.log('\n--- Processing Petty Cash ---');
    const { data: existingBoxes, error: boxErr } = await supabase.from('petty_cash_boxes').select('*');
    if (boxErr) throw boxErr;
    
    const boxMap = {};
    for (const box of existingBoxes) {
      boxMap[box.name] = box.id;
    }

    // Ensure Caja 1 and Caja 2 exist
    const { data: users } = await supabase.from('profiles').select('id').limit(1);
    const userId = users && users.length > 0 ? users[0].id : null;

    for (const boxName of ['Caja 1', 'Caja 2']) {
      if (!boxMap[boxName]) {
        console.log(`Creating ${boxName}...`);
        const insertPayload = {
          name: boxName,
          status: 'abierta'
        };
        if (userId) insertPayload.opened_by = userId;
        
        const { data: nb, error } = await supabase.from('petty_cash_boxes').insert(insertPayload).select('id, name').single();
        if (error) throw error;
        boxMap[nb.name] = nb.id;
      }
    }

    // Insert Petty Cash entries
    const entriesToInsert = pettyCashRecords.map(r => {
      const boxName = `Caja ${r.box_number}`;
      const boxId = boxMap[boxName] || boxMap['Caja 1'];
      return {
        box_id: boxId,
        total_amount: r.amount,
        concept: r.concept || 'Sin concepto',
        supplier_name: r.supplier,
        invoice_number: r.invoice,
        entry_date: r.date,
        created_by: userId
      };
    });

    if (entriesToInsert.length > 0) {
      const { error } = await supabase.from('petty_cash_entries').insert(entriesToInsert);
      if (error) throw error;
      console.log(`Inserted ${entriesToInsert.length} petty cash entries`);
    }

    console.log('\n=============================================');
    console.log('✅ DB SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`- Inserted ${totalPurchases} purchases`);
    console.log(`- Inserted ${entriesToInsert.length} petty cash entries`);
    console.log('=============================================');

  } catch (error) {
    console.error('\n❌ ERROR SEEDING DB:', error);
  }
}

seedDatabase();
