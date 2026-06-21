import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { UsersIcon, DollarSignIcon, CalendarIcon, TrendingUpIcon } from 'lucide-react';
import Link from 'next/link';
import { KpiChart } from '@/components/admin/kpis/KpiChart'; // Componente de recharts en cliente

export default async function AdminDashboardPage() {
  const profile = await requireRole(['admin', 'asesor', 'tesoreria']);
  const supabase = await createClient();

  // En un entorno de producción, estos cálculos se harían con una función RPC en PostgreSQL
  // o con un cron job que alimente una tabla de métricas pre-agregadas para mejor rendimiento.
  // Aquí hacemos consultas simplificadas para el MVP.

  // 1. Total Leads
  const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });

  // 2. Ventas Pagadas (Ingresos)
  const { data: salesData } = await supabase.from('sales').select('total').eq('status', 'pagada');
  const totalIngresos = salesData?.reduce((acc, sale) => acc + Number(sale.total), 0) || 0;

  // 3. Citas de hoy
  const todayStr = new Date().toISOString().split('T')[0];
  const { count: citasHoy } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('scheduled_at', `${todayStr}T00:00:00Z`).lt('scheduled_at', `${todayStr}T23:59:59Z`);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  // Data falsa para el gráfico mientras se implementa el backend analítico
  const chartData = [
    { name: 'Ene', ingresos: 4000000, gastos: 2400000 },
    { name: 'Feb', ingresos: 3000000, gastos: 1398000 },
    { name: 'Mar', ingresos: 2000000, gastos: 9800000 },
    { name: 'Abr', ingresos: 2780000, gastos: 3908000 },
    { name: 'May', ingresos: 1890000, gastos: 4800000 },
    { name: 'Jun', ingresos: 2390000, gastos: 3800000 },
    { name: 'Jul', ingresos: 3490000, gastos: 4300000 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] text-[#1a2d3d] mb-2">¡Hola, {profile.full_name}! 👋</h1>
        <p className="text-[#7a99b5]">Aquí tienes un resumen de la actividad reciente en KC Asesorías.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#e6f2fb] text-[#5ba3d9] rounded-full flex items-center justify-center shrink-0">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#7a99b5]">Total Leads</div>
            <div className="text-2xl font-bold text-[#1a2d3d]">{leadsCount || 0}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <DollarSignIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#7a99b5]">Ingresos Confirmados</div>
            <div className="text-2xl font-bold text-[#1a2d3d]">{formatCurrency(totalIngresos)}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#7a99b5]">Citas para Hoy</div>
            <div className="text-2xl font-bold text-[#1a2d3d]">{citasHoy || 0}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
            <TrendingUpIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#7a99b5]">Tasa de Conversión</div>
            <div className="text-2xl font-bold text-[#1a2d3d]">18.5%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40">
          <h2 className="text-lg font-medium text-[#1a2d3d] mb-6">Flujo de Caja (Prueba)</h2>
          <div className="h-80 w-full">
            <KpiChart data={chartData} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#a8c4d9]/40">
          <h2 className="text-lg font-medium text-[#1a2d3d] mb-4">Accesos Rápidos</h2>
          <div className="space-y-3">
            <Link href="/admin/leads/nuevo" className="flex items-center gap-3 p-3 bg-[#f7fbff] hover:bg-[#e6f2fb] rounded-lg text-[#3d5a73] transition-colors border border-[#a8c4d9]/30">
              <UsersIcon className="w-5 h-5 text-[#5ba3d9]" />
              <span className="font-medium text-sm">Registrar Nuevo Lead</span>
            </Link>
            <Link href="/admin/citas/nueva" className="flex items-center gap-3 p-3 bg-[#f7fbff] hover:bg-[#e6f2fb] rounded-lg text-[#3d5a73] transition-colors border border-[#a8c4d9]/30">
              <CalendarIcon className="w-5 h-5 text-[#5ba3d9]" />
              <span className="font-medium text-sm">Agendar Cita</span>
            </Link>
            <Link href="/admin/ventas/nueva" className="flex items-center gap-3 p-3 bg-[#f7fbff] hover:bg-[#e6f2fb] rounded-lg text-[#3d5a73] transition-colors border border-[#a8c4d9]/30">
              <DollarSignIcon className="w-5 h-5 text-[#5ba3d9]" />
              <span className="font-medium text-sm">Crear Cotización</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
