import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { UsersIcon, DollarSignIcon, CalendarIcon, TrendingUpIcon } from 'lucide-react';
import Link from 'next/link';
import { AdminDashboardView } from '@/components/admin/dashboard/AdminDashboardView';
import { AsesorDashboardView } from '@/components/admin/dashboard/AsesorDashboardView';

export default async function AdminDashboardPage() {
  const { profile } = await requireRole(['admin', 'asesor', 'tesoreria']);
  const supabase = await createClient();

  const isAdminOrTeso = profile.role === 'admin' || profile.role === 'tesoreria';
  const isAsesor = profile.role === 'asesor';

  // 1. Total Leads
  const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });

  // 2. Ventas Pagadas (Ingresos)
  const { data: salesData } = await supabase.from('sales').select('total').eq('status', 'pagada');
  const totalIngresos = salesData?.reduce((acc, sale) => acc + Number(sale.total), 0) || 0;

  // 3. Citas de hoy y del mes
  const currentDate = new Date();
  const todayStr = currentDate.toISOString().split('T')[0];
  
  const currentMonthStartISO = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
  const nextMonthStartISO = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString();
  
  const currentMonthStartStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
  const currentMonthEndStr = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

  const { count: citasHoy } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('scheduled_at', `${todayStr}T00:00:00Z`).lt('scheduled_at', `${todayStr}T23:59:59Z`);

  // 4. Costos Hoy
  const { data: purchasesHoy } = await supabase
    .from('purchases')
    .select('total')
    .eq('transaction_date', todayStr)
    .neq('status', 'anulado');
  const totalCostosHoy = purchasesHoy?.reduce((acc, p) => acc + Number(p.total), 0) || 0;

  // ================= DATA PARA ADMIN / TESORERIA =================
  let chartData: any[] = [];
  let monthAppointments: any[] = [];
  let pettyCashBoxes: any[] = [];
  let topSales: any[] = [];
  let topPurchases: any[] = [];

  if (isAdminOrTeso) {
    const { data: ma } = await supabase
      .from('appointments')
      .select('scheduled_at')
      .gte('scheduled_at', currentMonthStartISO)
      .lt('scheduled_at', nextMonthStartISO);
    monthAppointments = ma || [];

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const { data: recentPurchases } = await supabase
      .from('purchases')
      .select('total, transaction_date, cost_centers(name), status')
      .gte('transaction_date', currentMonthStartStr)
      .lte('transaction_date', currentMonthEndStr);

    const chartDataMap: Record<string, any> = {};
    const ccNames = new Set<string>();
    
    if (recentPurchases) {
      recentPurchases.forEach((p: any) => {
        if (p.status !== 'anulado') {
          const ccName = p.cost_centers?.name || 'Sin Asignar';
          ccNames.add(ccName);
        }
      });
    }

    const runningTotals: Record<string, number> = {};
    ccNames.forEach(name => runningTotals[name] = 0);

    for (let i = 1; i <= daysInMonth; i++) {
      chartDataMap[i.toString()] = { name: i.toString() };
    }

    if (recentPurchases) {
      for (let i = 1; i <= daysInMonth; i++) {
        const dayPurchases = recentPurchases.filter((p: any) => {
          if (!p.transaction_date || p.status === 'anulado') return false;
          const dayNum = parseInt(p.transaction_date.split('-')[2], 10);
          return dayNum === i;
        });

        dayPurchases.forEach((p: any) => {
          const ccName = p.cost_centers?.name || 'Sin Asignar';
          runningTotals[ccName] += Number(p.total) || 0;
        });

        ccNames.forEach(name => {
          chartDataMap[i.toString()][name] = runningTotals[name];
        });
      }
    }
    chartData = Object.values(chartDataMap);

    const { data: pcb } = await (supabase as any).from('petty_cash_box_summary').select('name, total_spent, status').eq('status', 'abierta');
    pettyCashBoxes = pcb || [];
    
    const { data: ts } = await supabase
      .from('sales')
      .select('client_name, total, invoice_number')
      .gte('created_at', currentMonthStartISO)
      .order('total', { ascending: false })
      .limit(5);
    topSales = ts || [];

    const { data: topPurchasesRaw } = await supabase
      .from('purchases')
      .select('total, concept, suppliers(name), status')
      .gte('transaction_date', currentMonthStartStr)
      .lte('transaction_date', currentMonthEndStr)
      .order('total', { ascending: false })
      .limit(10);
    topPurchases = (topPurchasesRaw || []).filter((p: any) => p.status !== 'anulado').slice(0, 5);
  }

  // ================= DATA PARA ASESOR =================
  let recentLeads: any[] = [];
  let topIncomes: any[] = [];
  let upcomingAppointments: any[] = [];
  let pendingQuotes: any[] = [];

  if (isAsesor) {
    const { data: rl } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(10);
    recentLeads = rl || [];

    const { data: ti } = await supabase.from('sales').select('*').eq('status', 'pagada').gte('created_at', currentMonthStartISO).order('total', { ascending: false }).limit(10);
    topIncomes = ti || [];

    const { data: ua } = await supabase.from('appointments').select('*').gte('scheduled_at', currentDate.toISOString()).order('scheduled_at', { ascending: true }).limit(10);
    upcomingAppointments = ua || [];

    const { data: pqRaw } = await supabase.from('sales').select('*').in('status', ['borrador', 'pendiente_pago', 'pendiente']).order('created_at', { ascending: false }).limit(15);
    pendingQuotes = pqRaw || [];
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const currentMonthName = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <>
      <div className="page-header">
        <div className="page-header-content">
          <div className="eyebrow">{currentMonthName}</div>
          <h1 className="page-title">Hola, <em>{firstName}</em></h1>
          <p className="page-sub">Aquí tienes un resumen de la actividad reciente. Los indicadores se actualizan en tiempo real conforme se registran nuevos movimientos.</p>
        </div>
        <div className="page-actions">
          <Link href="/admin/citas/nueva" className="btn btn-primary">
            <CalendarIcon className="w-4 h-4" /> Nueva cita
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-head">
            <div className="label">Total Leads</div>
            <div className="icon-box sm"><UsersIcon /></div>
          </div>
          <div className="value">{leadsCount || 0}</div>
          <div className="trend">
            <TrendingUpIcon /> +12% <span className="trend-note">este mes</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <div className="label">Ingresos Confirmados</div>
            <div className="icon-box sm green"><DollarSignIcon /></div>
          </div>
          <div className="value">{formatCurrency(totalIngresos)}</div>
          <div className="trend">
            <TrendingUpIcon /> Estable
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <div className="label">Citas para Hoy</div>
            <div className="icon-box sm amber"><CalendarIcon /></div>
          </div>
          <div className="value">{citasHoy || 0}</div>
          <div className="trend" style={{ color: 'var(--warning)' }}>
            Pendientes
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <div className="label">Costos de Hoy</div>
            <div className="icon-box sm violet"><TrendingUpIcon /></div>
          </div>
          <div className="value">{formatCurrency(totalCostosHoy)}</div>
          <div className="trend text-[var(--dim)] text-xs mt-1">
            Gastos registrados hoy
          </div>
        </div>
      </div>

      {isAdminOrTeso ? (
        <AdminDashboardView 
          chartData={chartData} 
          monthAppointments={monthAppointments} 
          pettyCashBoxes={pettyCashBoxes} 
          topSales={topSales} 
          topPurchases={topPurchases} 
        />
      ) : (
        <AsesorDashboardView 
          recentLeads={recentLeads} 
          topIncomes={topIncomes} 
          upcomingAppointments={upcomingAppointments} 
          pendingQuotes={pendingQuotes} 
        />
      )}
    </>
  );
}
