'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/constants';
import { logout } from '@/app/(public)/login/actions';
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  TruckIcon,
  ChartBarIcon,
  UserCogIcon,
  TagIcon,
  ListIcon,
  MenuIcon,
  XIcon,
  WalletIcon
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'Principal',
    items: [
      { label: 'Inicio', href: '/admin', roles: ['admin', 'asesor', 'tesoreria'], icon: HomeIcon },
      { label: 'Citas', href: '/admin/citas', roles: ['admin', 'asesor'], icon: CalendarIcon },
      { label: 'Leads', href: '/admin/leads', roles: ['admin', 'asesor'], icon: UsersIcon },
    ]
  },
  {
    title: 'Finanzas',
    items: [
      { label: 'Ventas', href: '/admin/ventas', roles: ['admin', 'asesor'], icon: ShoppingCartIcon },
      { label: 'Tesorería', href: '/admin/compras', roles: ['admin', 'tesoreria'], icon: ReceiptIcon },
      { label: 'Proveedores', href: '/admin/proveedores', roles: ['admin', 'tesoreria'], icon: TruckIcon },
      { label: 'Cajas Menores', href: '/admin/caja-menor', roles: ['admin', 'asesor', 'tesoreria'], icon: WalletIcon },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { label: 'KPIs', href: '/admin/kpis', roles: ['admin'], icon: ChartBarIcon },
      { label: 'Usuarios', href: '/admin/usuarios', roles: ['admin'], icon: UserCogIcon },
      { label: 'Centros de Costos', href: '/admin/catalogos', roles: ['admin'], icon: TagIcon },
      { label: 'Auditoría', href: '/admin/auditoria', roles: ['admin'], icon: ListIcon },
    ]
  }
];

export function AdminSidebar({ role, userName }: { role: string; userName?: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <button 
        className="mobile-nav-toggle" 
        onClick={() => setIsOpen(true)}
      >
        <MenuIcon className="w-5 h-5" />
      </button>

      <div 
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(false)}
      ></div>

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {isOpen && (
          <button 
            className="absolute top-4 right-4 p-2 text-[var(--dim)] hover:text-[var(--danger)] md:hidden z-50 bg-[var(--bg-card)] rounded-full shadow-sm"
            onClick={() => setIsOpen(false)}
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}

        <div className="brand">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
              <path d="M9 22V12h6v10"/>
            </svg>
          </div>
          <div>
            <div className="brand-name">KC <em>Asesorías</em></div>
            <div className="brand-sub">Panel Admin</div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => {
            const normalizedRole = String(role || 'asesor').toLowerCase().trim();
            const allowedItems = section.items.filter((item) => 
              item.roles.map(r => r.toLowerCase()).includes(normalizedRole)
            );
            if (allowedItems.length === 0) return null;

            return (
              <div key={section.title}>
                <div className="nav-section-label">
                  {section.title}
                </div>
                {allowedItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                      <Icon strokeWidth={2} className="w-4 h-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="user-card mt-auto">
          <div className="avatar">
            {userName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{userName}</div>
            <div className="user-role">{role}</div>
          </div>
          <form action={logout}>
            <button className="icon-btn" title="Cerrar sesión" style={{border: 'none', background: 'transparent'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-500 hover:text-red-500 cursor-pointer">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
