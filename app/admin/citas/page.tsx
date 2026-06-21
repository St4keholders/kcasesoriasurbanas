import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function CitasPage() {
  const supabase = await createClient();

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_at,
      status,
      notes,
      leads ( full_name, phone ),
      service_types ( name )
    `)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada': return 'bg-blue-100 text-blue-800';
      case 'en_curso': return 'bg-yellow-100 text-yellow-800';
      case 'atendida': return 'bg-green-100 text-green-800';
      case 'reprogramada': return 'bg-purple-100 text-purple-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-[var(--font-display)] text-[#1a2d3d] mb-6">
        Gestión de Citas
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-[#a8c4d9]/40 overflow-hidden">
        <table className="min-w-full divide-y divide-[#a8c4d9]/40">
          <thead className="bg-[#f7fbff]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Fecha y Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Servicio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#3d5a73] uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#a8c4d9]/40">
            {appointments?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-[#7a99b5]">
                  No hay citas registradas.
                </td>
              </tr>
            ) : (
              appointments?.map((app: any) => (
                <tr key={app.id} className="hover:bg-[#f7fbff] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1a2d3d]">
                    {format(new Date(app.scheduled_at), "dd 'de' MMM, yyyy - HH:mm", { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[#1a2d3d]">{app.leads?.full_name}</div>
                    <div className="text-sm text-[#7a99b5]">{app.leads?.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3d5a73]">
                    {app.service_types?.name || 'Consulta General'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(app.status)}`}>
                      {app.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
