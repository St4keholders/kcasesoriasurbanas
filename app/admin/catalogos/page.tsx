import { requireRole } from '@/lib/auth/require-role';
import { redirect } from 'next/navigation';

export default async function CatalogosPage() {
  await requireRole(['admin']);
  // Redirigir por defecto al catálogo de centros de costo
  redirect('/admin/catalogos/centros-costo');
}
