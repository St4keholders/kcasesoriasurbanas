-- Garantiza que todo proveedor creado en Tesorería exista como tercero contable.
create or replace function public.kc_ensure_third_party(p_supplier uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if p_supplier is null then return null; end if;
  select id into v from public.third_parties
   where id = p_supplier or legacy_supplier_id = p_supplier or p_supplier = any(merged_supplier_ids)
   limit 1;
  if v is not null then return v; end if;
  insert into public.third_parties (id, legacy_supplier_id, name, nit_normalized, dv, document_number, is_occasional, has_rut, is_billing_obligated, email, phone, address)
  select s.id, s.id, s.name, s.nit_normalized, s.dv, s.document_number, coalesce(s.is_occasional, false),
         coalesce(s.has_rut, false), coalesce(s.is_billing_obligated, true), s.email, s.phone, s.address
    from public.suppliers s where s.id = p_supplier
  returning id into v;
  return v;
end $$;
revoke execute on function public.kc_ensure_third_party(uuid) from public, anon, authenticated;

create or replace function public.kc_purchase_third_party()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.third_party_id is null and new.supplier_id is not null then
    new.third_party_id := public.kc_ensure_third_party(new.supplier_id);
  end if;
  return new;
end $$;

drop trigger if exists trg_purchases_third_party on public.purchases;
create trigger trg_purchases_third_party before insert or update of supplier_id on public.purchases
  for each row execute function public.kc_purchase_third_party();
