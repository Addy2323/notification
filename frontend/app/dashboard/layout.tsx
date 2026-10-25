'use client';

import { T, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Truck, Palette, Settings, LogOut, Plus, Shield, Menu, X, 
  Bell, ShoppingBag, Users, DollarSign, Contact, BarChart3, FileText, Search, 
  RefreshCw, Store, Star, CheckCircle2, MessageSquare 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import LanguageSelector from '@/components/LanguageSelector';
import { LumoLogo } from '@/components/landing/LumoLogo';
import { MobileBottomNav } from '@/app/components/MobileBottomNav';
import { PWAInstallButton } from '@/app/components/pwa/PWAInstallButton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t, label: uiLabel, locale } = useLanguage();

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

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
    }
  };

  const getItemLabel = (name: string) => {
    if (name === 'Receipt Confirmations') return locale === 'sw' ? 'Uthibitisho wa Kupokea' : 'Receipt Confirmations';
    if (name === 'SMS Management') return locale === 'sw' ? 'Usimamizi wa SMS' : 'SMS Management';
    return uiLabel(name);
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Sales Ledger', href: '/dashboard/sales', icon: DollarSign },
    { name: 'Customers', href: '/dashboard/customers', icon: Contact },
    { name: 'Deliveries', href: '/dashboard/deliveries', icon: Truck },
    { name: 'Drivers', href: '/dashboard/drivers', icon: Users },
    { name: 'Customer Ratings', href: '/dashboard/ratings', icon: Star },
    { name: 'Receipt Confirmations', href: '/dashboard/receipt-confirmations', icon: CheckCircle2 },
    { name: 'SMS Management', href: '/dashboard/sms', icon: MessageSquare },
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
          <p className="text-xs font-bold text-slate-500"><T k="merchant.loading_lumo_workspace" /></p>
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
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-extrabold text-xs active:scale-95 hover:scale-[1.01] transition-all duration-150 ${
                  active
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#FF5500]' : 'text-slate-400'}`} />
                <span>{getItemLabel(item.name)}</span>
              </Link>
            );
          })}

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-extrabold text-xs text-amber-700 hover:bg-amber-50 border border-amber-200 mt-4 active:scale-95 transition-all duration-150"
            >
              <Shield className="w-4 h-4 text-[#FF5500]" />
              <span><T k="merchant.admin_console" /></span>
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
            <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center text-xs font-black overflow-hidden shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={t("merchant.profile")} className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'M'
              )}
            </div>
            <div className="truncate">
              <p className="text-xs font-extrabold text-slate-900 truncate">{merchant?.business_name || user?.name}</p>
              <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase">{uiLabel(user?.role)}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title={t("merchant.sign_out")}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 active:scale-90 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header: Adaptive, uncrowded, works seamlessly at 320px+ */}
      <div className="md:hidden bg-white border-b border-slate-200 text-slate-900 px-3 py-2.5 sticky top-0 z-40 shadow-xs flex flex-col gap-2">
        {/* Row 1: Brand & Key Header Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Accessible Hamburger + LUMO Logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-dashboard-drawer"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]"
              aria-label={t("merchant.open_navigation_menu")}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
            </button>
            <Link href="/" className="flex items-center">
              <LumoLogo size={28} showText={true} />
            </Link>
          </div>

          {/* Right: Compact Language + Refresh + User Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSelector compact={true} />
            
            <button
              onClick={() => window.location.reload()}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]"
              title={t("common.refresh")}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <Link
              href="/dashboard/settings"
              className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs overflow-hidden border border-slate-200 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]"
              title={t("merchant.profile")}
              aria-label={t("merchant.profile")}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={t("merchant.profile")} className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'M'
              )}
            </Link>
          </div>
        </div>

        {/* Row 2: Business & Store Context Selector */}
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-lg bg-slate-200/80 text-slate-800 shrink-0">
              <Store className="w-3.5 h-3.5 text-[#FF5500]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-slate-900 leading-tight tracking-tight uppercase truncate">
                {merchant?.business_name || 'HOME DECO'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 leading-tight">
                <T k="merchant.live_dispatch_portal" />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
              {t("common.live") || 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div 
          id="mobile-dashboard-drawer"
          className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2 sticky top-[105px] z-30 shadow-xl animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-110px)] overflow-y-auto"
        >
          {/* PWA App Installation CTA in mobile drawer */}
          <div className="pb-2 border-b border-slate-100">
            <PWAInstallButton variant="sidebar" />
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold active:scale-95 transition-all duration-150 ${
                    active ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#FF5500]' : 'text-slate-400'}`} />
                  <span>{getItemLabel(item.name)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-extrabold text-rose-600 hover:bg-rose-50 rounded-xl active:scale-95 transition-transform"
            >
              <LogOut className="w-4 h-4" />
              <span><T k="merchant.sign_out" /></span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area (Scrollable with ample padding-bottom pb-28 on mobile so bottom nav never covers content) */}
      <main className="flex-1 h-screen overflow-y-auto p-3.5 sm:p-6 md:p-8 pb-28 md:pb-8 max-w-7xl mx-auto w-full bg-white">
        <div className="hidden md:flex justify-end mb-4">
          <LanguageSelector />
        </div>
        {children}
      </main>

      {/* Native Mobile Bottom Navigation Bar */}
      <MobileBottomNav type="merchant" />
    </div>
  );
}
