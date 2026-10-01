'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Truck, Bell, Settings, Users, BarChart3 } from 'lucide-react';

interface MobileBottomNavProps {
  type?: 'merchant' | 'admin';
  unreadCount?: number;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export function MobileBottomNav({ type = 'merchant', unreadCount = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();

  const merchantItems: NavItem[] = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Deliveries', href: '/dashboard/deliveries', icon: Truck },
    { name: 'Alerts', href: '/dashboard/notifications', icon: Bell, badge: unreadCount },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const adminItems: NavItem[] = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Stores', href: '/admin/merchants', icon: Users },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const items = type === 'admin' ? adminItems : merchantItems;
  const accentGlow = type === 'admin' ? 'bg-amber-500' : 'bg-[#FF5500]';
  const activeIconColor = type === 'admin' ? 'text-amber-400' : 'text-[#FF5500]';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/95 text-white backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.4)] pb-[env(safe-area-inset-bottom)] transition-all">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-90 select-none ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active Tab Highlight Indicator Bar */}
              {isActive && (
                <div
                  className={`absolute top-0 w-8 h-1 rounded-b-full ${accentGlow} shadow-[0_2px_8px_rgba(255,85,0,0.6)] animate-in fade-in duration-200`}
                />
              )}

              {/* Icon Container with Badge */}
              <div className="relative mt-1">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? `${activeIconColor} scale-110` : 'scale-100'
                  }`}
                />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-[#0F172A] shadow-sm animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-bold mt-1 tracking-tight transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
