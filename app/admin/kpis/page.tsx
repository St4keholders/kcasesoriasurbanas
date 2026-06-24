import { createClient } from '@/lib/supabase/server';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { ChartBarIcon, UsersIcon, DollarSignIcon, ActivityIcon } from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('kpi_daily')
    .select('*')
    .single();

  const kpiData = data as any;

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching KPIs:', error);
  }

  // Formatters
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  
  const formatPercent = (val: number) => `${val}%`;

  const kpis = [
    {
      name: 'Tasa de Asistencia',
      value: kpiData ? formatPercent(kpiData.attendance_rate) : '0%',
      subtext: `${kpiData?.appointments_attended || 0} de ${kpiData?.appointments_scheduled || 0} citas de hoy`,
      colorClass: 'blue',
      Icon: UsersIcon
    },
    {
      name: 'Tasa de Conversión',
      value: kpiData ? formatPercent(kpiData.conversion_rate) : '0%',
      subtext: `${kpiData?.sales_count || 0} ventas cerradas hoy`,
      colorClass: 'green',
      Icon: ChartBarIcon
    },
    {
      name: 'Ticket Promedio',
      value: kpiData ? formatCurrency(kpiData.average_ticket) : '$0',
      subtext: 'Valor promedio por venta hoy',
      colorClass: 'purple',
      Icon: DollarSignIcon
    },
    {
      name: 'Cashflow Neto',
      value: kpiData ? formatCurrency(kpiData.net_cashflow) : '$0',
      subtext: 'Ventas - Compras pagadas hoy',
      colorClass: 'orange',
      Icon: ActivityIcon
    },
  ];

  return (
    <div className="main">
      <AdminTopbar 
        title="Dashboard General" 
        subtitle="Indicadores de rendimiento calculados en tiempo real para el día de hoy."
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
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Gráfica de Citas y <em>Asistencia</em></h2>
            </div>
          </div>
          <div className="h-80 w-full flex items-center justify-center text-[var(--dim)] font-medium">
            Próximamente
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Flujo de <em>Caja</em></h2>
            </div>
          </div>
          <div className="h-80 w-full flex items-center justify-center text-[var(--dim)] font-medium">
            Próximamente
          </div>
        </div>
      </div>
    </div>
  );
}
