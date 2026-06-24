'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { HomeIcon, UsersIcon, CalendarIcon, ShoppingCartIcon, WalletIcon } from 'lucide-react';

const TABS = [
  { path: '/admin', icon: HomeIcon, color: 'var(--sky-deep)' },
  { path: '/admin/leads', icon: UsersIcon, color: 'var(--sky-deep)' },
  { path: '/admin/citas', icon: CalendarIcon, color: 'var(--sky-deep)' },
  { path: '/admin/ventas', icon: ShoppingCartIcon, color: 'var(--sky-deep)' },
  { path: '/admin/caja-menor', icon: WalletIcon, color: 'var(--sky-deep)' }
];

export function MobileTabBar() {
  const pathname = usePathname();
  
  const activeIndex = TABS.findIndex(tab => 
    pathname === tab.path || (tab.path !== '/admin' && pathname.startsWith(tab.path))
  );

  const bubblePositions = ['10%', '30%', '50%', '70%', '90%'];
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 w-full" style={{ zIndex: 100 }}>
      <div className="relative w-full bg-[var(--bg-card)] border-t border-[var(--border)]" style={{ height: '65px', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Animated Bubble */}
        {activeIndex !== -1 && (
          <div 
            className="absolute rounded-full ease-in-out"
            style={{ 
              top: '-8px',
              width: '50px',
              height: '50px',
              boxShadow: 'var(--shadow-md)',
              zIndex: 0,
              transition: 'all 300ms',
              left: `calc(${bubblePositions[activeIndex]} - 25px)`,
              backgroundColor: TABS[activeIndex].color
            }}
          >
          </div>
        )}

        {/* Tab Items */}
        <ul className="absolute bottom-0 w-full z-10 m-0 p-0" style={{ height: '65px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {TABS.map((tab, idx) => {
            const isActive = activeIndex === idx;
            const Icon = tab.icon;
            return (
              <li key={tab.path} className="relative" style={{ width: '20%', height: '65px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Link 
                  href={tab.path} 
                  className={`flex justify-center items-center w-full h-full ease-out ${isActive ? 'text-white' : 'text-[var(--dim)] hover:text-[var(--sky)]'}`}
                  style={{ transition: 'all 300ms', transform: isActive ? 'translateY(-16px)' : 'none' }}
                >
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
