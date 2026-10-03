'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  DollarSign,
  Truck,
  Package,
  UserCheck,
  Bell,
  BarChart3,
  Trophy,
  Award,
  PieChart,
  FileText,
  ShieldAlert,
  Activity,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Sun,
  Moon,
  Star,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { MobileBottomNav } from '@/app/components/MobileBottomNav';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Merchants', href: '/admin/merchants', icon: Users },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Sales', href: '/admin/sales', icon: DollarSign },
  { label: 'Drivers', href: '/admin/drivers', icon: Truck },
  { label: 'Deliveries', href: '/admin/deliveries', icon: Package },
  { label: 'Customer Ratings', href: '/admin/ratings', icon: Star },
  { label: 'Customers', href: '/admin/customers', icon: UserCheck },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Traffic & Growth', href: '/admin/traffic', icon: BarChart3 },
  { label: 'Merchant Rankings', href: '/admin/rankings', icon: Trophy },
  { label: 'Achievements', href: '/admin/achievements', icon: Award },
  { label: 'Analytics', href: '/admin/analytics', icon: PieChart },
  { label: 'Reports', href: '/admin/reports', icon: FileText },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldAlert },
  { label: 'System Health', href: '/admin/health', icon: Activity },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lumo_admin_theme') as 'dark' | 'light';
    if (saved) {
      setTheme(saved);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('lumo_admin_theme', nextTheme);
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Server-side global search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetchApi(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/login');
  };

  return (
    <div
      className={`h-screen w-screen overflow-hidden font-sans flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950 transition-colors ${
        theme === 'light' ? 'theme-light bg-slate-50 text-slate-900' : 'theme-dark bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Header */}
      <header
        className={`h-16 flex-shrink-0 z-40 px-4 md:px-6 flex items-center justify-between gap-4 border-b transition-colors ${
          theme === 'light'
            ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
            : 'bg-slate-900/90 border-slate-800/80 text-white backdrop-blur-md'
        }`}
      >
        {/* Left branding & mobile toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-800"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className={`font-black text-lg tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  LUMO
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                  CONTROL CENTRE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Enterprise Logistics Platform</p>
            </div>
          </Link>
        </div>

        {/* Global Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-xl mx-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Global Search (Merchant, Order ID, Phone, Driver, Customer)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
              className={`w-full rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all ${
                theme === 'light'
                  ? 'bg-slate-100 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                  : 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
              }`}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Search Dropdown Results */}
          {showSearchDropdown && searchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 max-h-[80vh] overflow-y-auto space-y-3">
              {searchResults.merchants?.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2">Merchants</span>
                  <div className="mt-1 space-y-1">
                    {searchResults.merchants.map((m: any) => (
                      <Link
                        key={m.id}
                        href={`/admin/merchants/${m.id}`}
                        onClick={() => setShowSearchDropdown(false)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/80 transition-colors text-xs"
                      >
                        <div>
                          <p className="font-bold text-white">{m.business_name}</p>
                          <p className="text-[10px] text-slate-400">{m.business_phone} • {m.email || 'No email'}</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {m.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.orders?.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2">Orders</span>
                  <div className="mt-1 space-y-1">
                    {searchResults.orders.map((o: any) => (
                      <Link
                        key={o.id}
                        href={`/admin/orders?id=${o.id}`}
                        onClick={() => setShowSearchDropdown(false)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/80 transition-colors text-xs"
                      >
                        <div>
                          <p className="font-bold text-white">Order #{o.order_number}</p>
                          <p className="text-[10px] text-slate-400">{o.merchant?.business_name} • {o.customer_name}</p>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                          TZS {Number(o.total_revenue || o.amount || 0).toLocaleString()}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.drivers?.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 px-2">Drivers</span>
                  <div className="mt-1 space-y-1">
                    {searchResults.drivers.map((d: any) => (
                      <Link
                        key={d.id}
                        href={`/admin/drivers?search=${encodeURIComponent(d.name)}`}
                        onClick={() => setShowSearchDropdown(false)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/80 transition-colors text-xs"
                      >
                        <div>
                          <p className="font-bold text-white">{d.name}</p>
                          <p className="text-[10px] text-slate-400">{d.phone} ({d.merchant?.business_name})</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{d.status}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.merchants?.length === 0 &&
                searchResults.orders?.length === 0 &&
                searchResults.drivers?.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No matching records found for "{searchQuery}"</p>
                )}
            </div>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
              theme === 'light'
                ? 'bg-slate-100 border-slate-300 text-amber-600 hover:bg-slate-200'
                : 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* System Status Pill */}
          <Link
            href="/admin/health"
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 transition-all text-xs font-semibold"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>System Healthy</span>
          </Link>

          {/* Admin Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-xl border relative transition-colors ${
                theme === 'light'
                  ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  : 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Admin System Alerts</span>
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    3 New
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <p className="font-bold text-white text-[11px]">New Merchant Registered</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">David Sportware joined LUMO Tracking</p>
                    <span className="text-[9px] font-mono text-slate-500 mt-1 block">10 mins ago</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <p className="font-bold text-amber-400 text-[11px]">Milestone Achieved</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Platform reached 1,000 completed orders!</p>
                    <span className="text-[9px] font-mono text-slate-500 mt-1 block">1 hour ago</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <p className="font-bold text-emerald-400 text-[11px]">System Health Check</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">All SMS gateways & DB nodes operating at 100%</p>
                    <span className="text-[9px] font-mono text-slate-500 mt-1 block">2 hours ago</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`flex items-center gap-2 p-1.5 rounded-xl border transition-colors ${
                theme === 'light' ? 'border-slate-300 hover:bg-slate-100' : 'border-slate-800 hover:bg-slate-800'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                A
              </div>
              <span className={`hidden sm:inline text-xs font-bold pr-1 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                Admin
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white">Super Administrator</p>
                  <p className="text-[10px] text-slate-400 font-mono">admin@lumo.co.tz</p>
                </div>
                <Link
                  href="/admin/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span>Control Settings</span>
                </Link>
                <Link
                  href="/admin/audit-logs"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Security & Audit</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Control Centre</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body - Fixed Sidebar & Independent Main Content Scroll */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - Strictly Fixed Position on the left (Navy Blue) */}
        <aside
          className={`hidden md:flex flex-col flex-shrink-0 border-r border-slate-800/80 bg-slate-900 h-full overflow-y-auto transition-all duration-300 ${
            collapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Sidebar Header Toggle */}
          <div className="p-4 flex items-center justify-between border-b border-slate-800/60">
            {!collapsed && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                NAVIGATION CENTRE
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          {!collapsed && (
            <div className="p-4 border-t border-slate-800/60 bg-slate-950/80">
              <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>LUMO Control v2.5 • Prod</span>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}></div>
            <div className="relative flex-1 max-w-xs bg-slate-900 border-r border-slate-800 p-4 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-white text-sm">LUMO CONTROL CENTRE</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content Viewport - Only this container scrolls */}
        <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 space-y-6 custom-scrollbar transition-colors">
          {children}
        </main>
      </div>

      {/* Native Mobile Bottom Navigation Bar (Visible only on mobile devices) */}
      <MobileBottomNav type="admin" />
    </div>
  );
}

