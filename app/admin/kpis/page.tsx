import { createClient } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { BuildingIcon, MapPinIcon, HomeIcon, CalculatorIcon, LayersIcon } from 'lucide-react';
import { HeatmapCalendar } from '@/components/admin/dashboard/HeatmapCalendar';

export const dynamic = 'force-dynamic';

// Iconos por centro de costo (se pueden extender)
const centerIcons: Record<string, any> = {
  'KC ASESORÍAS': BuildingIcon,
  'TOLÚ': MapPinIcon,
  'Apto Bello': HomeIcon,
};

const centerColors: Record<string, string> = {
  'KC ASESORÍAS': 'blue',
  'TOLÚ': 'orange',
  'Apto Bello': 'purple',
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Zona horaria Colombia (UTC-5)
  const nowUTC = new Date();
  const colombiaOffset = -5 * 60;
  const colombiaTime = new Date(nowUTC.getTime() + (colombiaOffset - nowUTC.getTimezoneOffset()) * 60000);
  const currentDate = colombiaTime;

  const currentMonthStartStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const currentMonthEndStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: purchasesRaw, error } = await supabase
    .from('purchases')
    .select('id, total, transaction_date, concept, status, cost_centers(name), suppliers(name)')
    .gte('transaction_date', currentMonthStartStr)
    .lte('transaction_date', currentMonthEndStr);

  if (error) {
    console.error('Error fetching purchases for KPIs:', error);
  }

  const purchases = (purchasesRaw || []).filter(p => p.status !== 'anulado');

  // Agrupar por centro de costo dinámicamente
  const centerTotals: Record<string, number> = {};
  let generalTotal = 0;

  purchases.forEach(p => {
    const amount = Number(p.total) || 0;
    generalTotal += amount;
    const ccName = (p as any).cost_centers?.name || 'Otros';
    centerTotals[ccName] = (centerTotals[ccName] || 0) + amount;
  });

  // Formatters
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  // Construir KPIs dinámicos por cada centro de costo encontrado
  const kpis = Object.entries(centerTotals)
    .sort((a, b) => b[1] - a[1]) // Ordenar de mayor a menor
    .map(([name, total]) => ({
      name: `Costos ${name}`,
      value: formatCurrency(total),
      subtext: `Acumulado a día de hoy (${name})`,
      colorClass: centerColors[name] || 'blue',
      Icon: centerIcons[name] || LayersIcon,
    }));

  // Agregar el total general al final
  kpis.push({
    name: 'Total Costo Mes',
    value: formatCurrency(generalTotal),
    subtext: 'Suma de todos los centros',
    colorClass: 'green',
    Icon: CalculatorIcon,
  });

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
