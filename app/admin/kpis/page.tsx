import { createClient } from '@/lib/supabase/server';

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
    },
    {
      name: 'Tasa de Conversión',
      value: kpiData ? formatPercent(kpiData.conversion_rate) : '0%',
      subtext: `${kpiData?.sales_count || 0} ventas cerradas hoy`,
    },
    {
      name: 'Ticket Promedio',
      value: kpiData ? formatCurrency(kpiData.average_ticket) : '$0',
      subtext: 'Valor promedio por venta hoy',
    },
    {
      name: 'Cashflow Neto',
      value: kpiData ? formatCurrency(kpiData.net_cashflow) : '$0',
      subtext: 'Ventas - Compras pagadas hoy',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d] mb-6">
        Dashboard General
      </h1>
      <p className="text-[#3d5a73] mb-8">
        Indicadores de rendimiento calculados en tiempo real para el día de hoy.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40">
            <h3 className="text-sm font-medium text-[#7a99b5] mb-2">{kpi.name}</h3>
            <p className="text-3xl font-[var(--font-display)] text-[#3b7dbf] mb-2">
              {kpi.value}
            </p>
            <p className="text-xs text-[#7a99b5]">{kpi.subtext}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 h-80 flex flex-col justify-center items-center text-[#7a99b5]">
          <p>Gráfica de Citas y Asistencia (Próximamente)</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 h-80 flex flex-col justify-center items-center text-[#7a99b5]">
          <p>Gráfica de Flujo de Caja (Próximamente)</p>
        </div>
      </div>
    </div>
  );
}
