import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient as createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function getServerDb() {
  return createServerSupabaseClient();
}

export function getAdminDb() {
  return createSupabaseAdminClient();
}
