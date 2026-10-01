'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Truck, Palette, Settings, LogOut, Plus, Shield, Menu, X, Bell, ShoppingBag, Users, DollarSign, Contact, BarChart3, FileText } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { LumoLogo } from '@/components/landing/LumoLogo';
import { MobileBottomNav } from '@/app/components/MobileBottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [merchant, setMerchant] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/auth/me')
      .then((data) => {
        setUser(data.user);
        setMerchant(data.merchant);
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
    }
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Sales Ledger', href: '/dashboard/sales', icon: DollarSign },
    { name: 'Customers', href: '/dashboard/customers', icon: Contact },
    { name: 'Deliveries', href: '/dashboard/deliveries', icon: Truck },
    { name: 'Drivers', href: '/dashboard/drivers', icon: Users },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Reports', href: '/dashboard/reports', icon: FileText },
    { name: 'Branding', href: '/dashboard/branding', icon: Palette },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] animate-pulse flex items-center justify-center text-[#FF5500] font-black">
            <span>L</span>
          </div>
          <p className="text-xs font-bold text-slate-500">Loading LUMO Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col md:flex-row font-sans text-slate-900 selection:bg-[#FF5500] selection:text-white">
      {/* Sidebar Desktop (Fixed height, sticky left sidebar) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 text-slate-900 h-screen sticky top-0 p-5 shrink-0 shadow-xs overflow-y-auto">
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 mb-8 group active:scale-95 transition-transform duration-150">
          <LumoLogo size={36} />
        </Link>

        {/* Navigation links with Navy Blue & Orange highlights */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === '/dashboard/orders' && pathname.startsWith('/dashboard/orders/'));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-extrabold text-xs active:scale-95 hover:scale-[1.01] transition-all duration-150 ${
                  active
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#FF5500]' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-extrabold text-xs text-amber-700 hover:bg-amber-50 border border-amber-200 mt-4 active:scale-95 transition-all duration-150"
            >
              <Shield className="w-4 h-4 text-[#FF5500]" />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        {/* Merchant Workspace Info & Sign Out Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center text-xs font-black overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'M'
              )}
            </div>
            <div className="truncate">
              <p className="text-xs font-extrabold text-slate-900 truncate">{merchant?.business_name || user?.name}</p>
              <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 active:scale-90 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden bg-[#0F172A] text-white p-4 flex items-center justify-between sticky top-0 z-40">
        <LumoLogo size={28} textColor="text-white" />
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/orders"
            className="py-1.5 px-3 rounded-xl bg-[#FF5500] active:scale-95 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white active:scale-90 transition-transform"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2 sticky top-14 z-30 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold active:scale-95 transition-all duration-150 ${
                  active ? 'bg-[#0F172A] text-white' : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#FF5500]' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-extrabold text-rose-600 hover:bg-rose-50 rounded-xl active:scale-95 transition-transform"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main Content Area (Independently scrollable with padding for mobile bottom bar) */}
      <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full bg-white">{children}</main>

      {/* Native Mobile Bottom Navigation Bar (Visible only on mobile devices) */}
      <MobileBottomNav type="merchant" />
    </div>
  );
}
