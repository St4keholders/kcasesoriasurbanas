import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role to bypass RLS for this test

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching a cost center...");
  const { data: cc } = await supabase.from('cost_centers').select('id').limit(1).single();
  if (!cc) {
    console.log("No cost centers found.");
    return;
  }
  
  console.log("Fetching a user...");
  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
  if (!profile) {
    console.log("No users found.");
    return;
  }

  console.log("Inserting purchase...");
  const { data: purchase, error } = await supabase
    .from('purchases')
    .insert({
      supplier_id: null,
      supplier_name: "Test",
      cost_center_id: cc.id,
      invoice_number: "123",
      description: "Test Desc",
      amount: 100,
      tax: 0,
      total: 100,
      status: 'pendiente_pago',
      invoice_date: "2026-06-20",
      due_date: null,
      notes: "Test Notes",
      created_by: profile.id
    })
    .select('id')
    .single();

  if (error) {
    console.error("Error inserting purchase:", error);
  } else {
    console.log("Success! Inserted purchase id:", purchase.id);
  }
}

run();
