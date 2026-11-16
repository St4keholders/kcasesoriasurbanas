-- Balance de prueba por rango de fechas (opcionalmente solo aprobados)
create or replace function public.kc_balance_prueba(p_from date, p_to date, p_only_approved boolean default false)
returns table (account_code text, account_name text, debit numeric, credit numeric, balance numeric)
language sql stable security invoker set search_path = public as $$
  select jl.account_code, coalesce(c.name, ''), sum(jl.debit), sum(jl.credit), sum(jl.debit) - sum(jl.credit)
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    left join public.chart_of_accounts c on c.code = jl.account_code
   where je.entry_date between p_from and p_to
     and je.status <> 'anulado'
     and (not p_only_approved or je.status = 'aprobado')
   group by jl.account_code, c.name
   order by jl.account_code;
$$;
grant execute on function public.kc_balance_prueba(date, date, boolean) to authenticated;

-- Cuentas creadas por el agente anterior que no siguen el PUC y ya no se usan
update public.chart_of_accounts set is_active = false
 where code in ('612005', '612015', '612020', '612025', '612030', '612095', '513555')
   and not exists (select 1 from public.journal_lines jl where jl.account_code = chart_of_accounts.code);
