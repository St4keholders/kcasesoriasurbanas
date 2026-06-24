import { createClient } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { BuildingIcon, MapPinIcon, HomeIcon, CalculatorIcon } from 'lucide-react';
import { HeatmapCalendar } from '@/components/admin/dashboard/HeatmapCalendar';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const currentDate = new Date();
  // Set to first day of current month
  const currentMonthStartStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
  // Set to last day of current month
  const currentMonthEndStr = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data: purchasesRaw, error } = await supabase
    .from('purchases')
    .select('id, total, transaction_date, concept, status, cost_centers(name), suppliers(name)')
    .gte('transaction_date', currentMonthStartStr)
    .lte('transaction_date', currentMonthEndStr);

  if (error) {
    console.error('Error fetching purchases for KPIs:', error);
  }

  const purchases = (purchasesRaw || []).filter(p => p.status !== 'anulado');

  let medellinTotal = 0;
  let toluTotal = 0;
  let aptoBelloTotal = 0;
  let generalTotal = 0;

  purchases.forEach(p => {
    const amount = Number(p.total) || 0;
    generalTotal += amount;
    const ccName = p.cost_centers?.name || '';
    if (ccName === 'KC ASESORÍAS') {
      medellinTotal += amount;
    } else if (ccName === 'TOLÚ') {
      toluTotal += amount;
    } else if (ccName === 'Apto Bello') {
      aptoBelloTotal += amount;
    }
  });

  // Formatters
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const kpis = [
    {
      name: 'Costos Medellín',
      value: formatCurrency(medellinTotal),
      subtext: 'Acumulado a día de hoy (KC Asesorías)',
      colorClass: 'blue',
      Icon: BuildingIcon
    },
    {
      name: 'Costos Tolú',
      value: formatCurrency(toluTotal),
      subtext: 'Acumulado a día de hoy (Tolú)',
      colorClass: 'orange',
      Icon: MapPinIcon
    },
    {
      name: 'Costos Apto Bello',
      value: formatCurrency(aptoBelloTotal),
      subtext: 'Acumulado a día de hoy (Apto Bello)',
      colorClass: 'purple',
      Icon: HomeIcon
    },
    {
      name: 'Total Costo Mes',
      value: formatCurrency(generalTotal),
      subtext: 'Suma de todos los centros',
      colorClass: 'green',
      Icon: CalculatorIcon
    },
  ];

  return (
    <div className="main">
      <AdminTopbar 
        title="Dashboard de Gastos" 
        subtitle="Indicadores de costos calculados en tiempo real para el mes actual."
      />

      <div className="kpi-grid">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.Icon;
          return (
            <div key={idx} className="kpi-card">
              <div className={`kpi-icon-wrap ${kpi.colorClass}`}>
                <Icon />
              </div>
              <div className="kpi-info">
                <div className="kpi-label">{kpi.name}</div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-trend" style={{ color: 'var(--dim)' }}>
                  {kpi.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="content-grid mt-8">
        <div className="panel lg:col-span-2">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Calendario de <em>Calor (Gastos)</em></h2>
              <div className="text-xs text-[var(--dim)] mt-1">
                La intensidad del color indica el volumen de gastos del día. Haz clic en un día para ver los detalles.
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 w-full">
            <HeatmapCalendar purchases={purchases} currentDateIso={currentDate.toISOString()} />
          </div>
        </div>
      </div>
    </div>
  );
}
