'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Truck, Palette, Settings, LogOut, Plus, Shield, Menu, X, Bell, ShoppingBag, Users, DollarSign, Contact, BarChart3, FileText, Search, RefreshCw, Store, Star } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { LumoLogo } from '@/components/landing/LumoLogo';
import { MobileBottomNav } from '@/app/components/MobileBottomNav';
import { PWAInstallButton } from '@/app/components/pwa/PWAInstallButton';

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
    { name: 'Customer Ratings', href: '/dashboard/ratings', icon: Star },
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

        {/* PWA App Installation CTA */}
        <div className="mb-4">
          <PWAInstallButton variant="sidebar" />
        </div>

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

      {/* Mobile Top Header (Pixel-perfect matching user image layout with Hamburger bar) */}
      <div className="md:hidden bg-white border-b border-slate-200/90 text-slate-900 px-3 py-3 sticky top-0 z-40 shadow-xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Hamburger Bar + LUMO Logo */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-90 transition-transform"
              title="Open Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
            </button>
            <LumoLogo size={30} showText={true} />
          </div>

          {/* Right Action Icons (Search, Refresh, User Profile) */}
          <div className="flex items-center gap-2">
            <PWAInstallButton variant="header" />
            <button
              onClick={() => {
                const searchInput = document.getElementById('mobile-search-input');
                if (searchInput) searchInput.focus();
              }}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-90 transition-all"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-90 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs overflow-hidden border border-slate-200">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'M'
              )}
            </div>
          </div>
        </div>

        {/* Shop Badge Chip (HOME DECO / Live Dispatch Portal) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 w-fit">
          <div className="p-1 rounded-lg bg-slate-200/70 text-slate-800">
            <Store className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-900 leading-tight tracking-tight uppercase">
              {merchant?.business_name || 'HOME DECO'}
            </span>
            <span className="text-[9px] font-bold text-slate-400 leading-tight">
              Live Dispatch Portal
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2 sticky top-28 z-30 shadow-xl animate-in slide-in-from-top-2 duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold active:scale-95 transition-all duration-150 ${
                  active ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#FF5500]' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100">
            <PWAInstallButton variant="menu" />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-extrabold text-rose-600 hover:bg-rose-50 rounded-xl active:scale-95 transition-transform"
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
