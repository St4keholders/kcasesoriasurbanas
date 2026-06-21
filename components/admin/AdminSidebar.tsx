'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/constants';
import { logout } from '@/app/admin/login/actions';
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  TruckIcon,
  ChartBarIcon, // using ChartBarIcon instead of ChartIcon
  UserCogIcon,
  TagIcon,
  ListIcon,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Inicio', href: '/admin', roles: ['admin', 'asesor', 'tesoreria'], icon: HomeIcon },
  { label: 'Citas', href: '/admin/citas', roles: ['admin', 'asesor'], icon: CalendarIcon },
  { label: 'Leads', href: '/admin/leads', roles: ['admin', 'asesor'], icon: UsersIcon },
  { label: 'Ventas', href: '/admin/ventas', roles: ['admin', 'asesor'], icon: ShoppingCartIcon },
  { label: 'Compras', href: '/admin/compras', roles: ['admin', 'tesoreria'], icon: ReceiptIcon },
  { label: 'Proveedores', href: '/admin/proveedores', roles: ['admin', 'tesoreria'], icon: TruckIcon },
  { label: 'KPIs', href: '/admin/kpis', roles: ['admin'], icon: ChartBarIcon },
  { label: 'Usuarios', href: '/admin/usuarios', roles: ['admin'], icon: UserCogIcon },
  { label: 'Catálogos', href: '/admin/catalogos', roles: ['admin'], icon: TagIcon },
  { label: 'Auditoría', href: '/admin/auditoria', roles: ['admin'], icon: ListIcon },
];

export function AdminSidebar({ role, userName }: { role: string; userName?: string }) {
  const pathname = usePathname();

  const allowedItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="w-64 bg-white border-r border-[#a8c4d9]/40 flex flex-col justify-between">
      <div>
        <div className="h-16 flex items-center px-6 border-b border-[#a8c4d9]/40">
          <Link href="/admin" className="font-[var(--font-display)] text-lg text-[#3b7dbf] flex items-center gap-2">
            <svg viewBox="0 0 30 30" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 3L3 13V27H12V19H18V27H27V13L15 3Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="truncate">{SITE.shortName}</span>
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {allowedItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#dceefb] text-[#3b7dbf]'
                    : 'text-[#3d5a73] hover:bg-[#f7fbff] hover:text-[#1a2d3d]'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[#a8c4d9]/40">
        <div className="px-4 py-2 mb-2">
          <p className="text-sm font-medium text-[#1a2d3d] truncate">{userName}</p>
          <p className="text-xs text-[#7a99b5] uppercase tracking-wider mt-0.5">{role}</p>
        </div>
        <form action={logout}>
          <button className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-[#e11d48] hover:bg-[#ffe4e6] transition-colors">
            Cerrar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}
