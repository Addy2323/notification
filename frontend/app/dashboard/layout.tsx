'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Truck, Palette, Settings, LogOut, Plus, Shield, Menu, X, Bell } from 'lucide-react';
import { fetchApi } from '@/lib/api';

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
    { name: 'Deliveries', href: '/dashboard/deliveries', icon: Truck },
    { name: 'Branding', href: '/dashboard/branding', icon: Palette },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-800 animate-pulse flex items-center justify-center text-white font-bold">
            <span>L</span>
          </div>
          <p className="text-xs font-semibold text-slate-500">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row font-sans text-slate-900 selection:bg-teal-700 selection:text-white">
      {/* Sidebar Desktop (Clean White Aesthetic) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 text-slate-800 min-h-screen p-5 shrink-0 shadow-xs">
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 mb-8 group">
          <div className="w-10 h-10 rounded-xl bg-teal-800 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-lg tracking-tight">LUMO</h2>
            <p className="text-[11px] text-slate-500 font-semibold truncate max-w-[140px]">
              {merchant?.business_name || 'Merchant Workspace'}
            </p>
          </div>
        </Link>

        {/* Primary CTA Button */}
        <Link
          href="/dashboard/deliveries/new"
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 mb-6 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>NEW DELIVERY</span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  active
                    ? 'bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-teal-700' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-amber-700 hover:bg-amber-50 border border-amber-200 mt-4 transition-all"
            >
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        {/* User Account Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-extrabold text-slate-700 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'M'
              )}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 text-slate-900 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-800 flex items-center justify-center text-white font-black text-xs">
            L
          </div>
          <span className="font-black text-base tracking-tight">LUMO</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/deliveries/new"
            className="py-1.5 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900"
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
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <Icon className="w-4 h-4 text-teal-700" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Console</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
