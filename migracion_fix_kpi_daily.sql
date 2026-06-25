-- =====================================================================
-- KC Asesorías — Fix vista kpi_daily para usar transaction_date
-- =====================================================================
-- Problema: La vista usaba paid_at + status='pagado', lo cual excluía
-- compras en estado pendiente_pago. Ahora usa transaction_date y excluye
-- solo las anuladas, alineándose con la lógica del dashboard.
-- =====================================================================

create or replace view public.kpi_daily as
with target as (select current_date as d),
sched as (
  select count(*)::int as n from public.appointments, target
   where scheduled_at::date = d
),
attended as (
  select count(*)::int as n from public.appointments, target
   where scheduled_at::date = d and status = 'atendida'
),
sales_today as (
  select count(*)::int as n, coalesce(sum(total),0)::numeric as t
    from public.sales, target
   where paid_at::date = d and status = 'pagada'
),
purchases_today as (
  select coalesce(sum(total),0)::numeric as t
    from public.purchases, target
   where transaction_date = d and status != 'anulado'
)
select
  (select d from target)                              as date,
  sched.n                                             as appointments_scheduled,
  attended.n                                          as appointments_attended,
  case when sched.n = 0 then 0
       else round(attended.n::numeric * 100 / sched.n, 2) end as attendance_rate,
  sales_today.n                                       as sales_count,
  sales_today.t                                       as sales_total,
  case when attended.n = 0 then 0
       else round(sales_today.n::numeric * 100 / attended.n, 2) end as conversion_rate,
  case when sales_today.n = 0 then 0
       else round(sales_today.t / sales_today.n, 2) end as average_ticket,
  purchases_today.t                                   as purchases_total,
  (sales_today.t - purchases_today.t)                 as net_cashflow
from sched, attended, sales_today, purchases_today;

-- También corregir la función kpi_for_date
create or replace function public.kpi_for_date(target_date date)
returns table (
  date date, appointments_scheduled int, appointments_attended int,
  attendance_rate numeric, sales_count int, sales_total numeric,
  conversion_rate numeric, average_ticket numeric,
  purchases_total numeric, net_cashflow numeric
)
language sql stable as $$
  with sched as (
    select count(*)::int as n from public.appointments
     where scheduled_at::date = target_date
  ),
  attended as (
    select count(*)::int as n from public.appointments
     where scheduled_at::date = target_date and status = 'atendida'
  ),
  sales_d as (
    select count(*)::int as n, coalesce(sum(total),0)::numeric as t
      from public.sales
     where paid_at::date = target_date and status = 'pagada'
  ),
  purch_d as (
    select coalesce(sum(total),0)::numeric as t
      from public.purchases
     where transaction_date = target_date and status != 'anulado'
  )
  select target_date, sched.n, attended.n,
    case when sched.n = 0 then 0 else round(attended.n::numeric*100/sched.n,2) end,
    sales_d.n, sales_d.t,
    case when attended.n = 0 then 0 else round(sales_d.n::numeric*100/attended.n,2) end,
    case when sales_d.n = 0 then 0 else round(sales_d.t/sales_d.n,2) end,
    purch_d.t,
    (sales_d.t - purch_d.t)
  from sched, attended, sales_d, purch_d;
$$;
