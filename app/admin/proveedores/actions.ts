'use server';

import { createClient } from '@/lib/supabase/server';
import { executeMutation } from '@/lib/server/auth';
import { ThirdPartySchema } from '@/lib/validation';
import { normalizeNitDigits, parseNitAndDv } from '@/lib/utils/nit';
import { revalidatePath } from 'next/cache';

export async function saveSupplierAction(id: string | null, rawData: unknown) {
  const allowedRoles = id ? (['admin', 'tesoreria'] as const) : (['admin', 'tesoreria', 'asesor'] as const);
  return executeMutation(
    [...allowedRoles],
    ThirdPartySchema,
    rawData,
    async ({ input }) => {
      const supabase = await createClient();
      const nitDigits = normalizeNitDigits(input.document_number);
      const parsed = parseNitAndDv(
        nitDigits ? (input.dv ? `${nitDigits}-${input.dv}` : nitDigits) : ''
      );

      const payload = {
        name: input.name.trim(),
        document_number: nitDigits ? parsed.formatted : null,
        nit_normalized: nitDigits || null,
        dv: nitDigits ? parsed.dv : null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        is_active: input.is_active,
        has_rut: input.has_rut ?? false,
        is_billing_obligated: input.is_billing_obligated ?? true,
      };

      if (id) {
        const { data, error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        revalidatePath('/admin/proveedores');
        revalidatePath(`/admin/proveedores/${id}`);
        return data;
      } else {
        const { data, error } = await supabase
          .from('suppliers')
          .insert(payload)
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        revalidatePath('/admin/proveedores');
        return data;
      }
    }
  );
}

export async function saveSupplier(id: string | null, rawData: unknown) {
  const res = await saveSupplierAction(id, rawData);
  if (!res.ok) throw new Error(res.error);
  return res.data;
}
