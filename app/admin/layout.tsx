import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

import { MobileTabBar } from '@/components/admin/MobileTabBar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile && !profile.is_active) {
    redirect('/admin/login');
  }

  const role = profile?.role || 'asesor';

  return (
    <>
      <div className="admin-theme admin-layout-wrapper text-[var(--fg)]">
        {/* Sidebar */}
        <AdminSidebar role={role} userName={profile?.full_name || user.email} />

        {/* Main Content */}
        <main className="main pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Tab Bar */}
      <div className="admin-theme">
        <MobileTabBar />
      </div>
    </>
  );
}
