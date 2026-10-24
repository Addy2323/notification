'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  RefreshCw,
  TrendingUp,
  CreditCard,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  DollarSign,
  Plus,
  Send,
  Sliders,
  Users,
  Check,
  ExternalLink,
  ChevronRight,
  Sparkles,
  PhoneCall,
  Clock,
  Radio
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/components/LanguageProvider';

interface MerchantAccountRow {
  merchantId: string;
  businessName: string;
  businessPhone: string;
  availableCredits: number;
  totalPurchased: number;
  totalConsumed: number;
  totalExtended: number;
  balancePercentage: number;
  balanceStatus: string;
  balanceColor: 'green' | 'amber' | 'red';
  updatedAt: string;
}

export default function AdminSmsManagementPage() {
  const { t, locale } = useLanguage();
  const isSw = locale === 'sw';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'merchants' | 'transactions' | 'settings'>('merchants');

  // Extension Modal
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantAccountRow | null>(null);
  const [extensionUnits, setExtensionUnits] = useState<number>(500);
  const [adjustmentType, setAdjustmentType] = useState<string>('ADMIN_ADJUSTMENT_GRANT');
  const [extensionReason, setExtensionReason] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [extending, setExtending] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [extensionSuccess, setExtensionSuccess] = useState<any>(null);

  // Notification Button State
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Settings Editor
  const [settingsPrice, setSettingsPrice] = useState<number>(20);
  const [settingsMin, setSettingsMin] = useState<number>(25);
  const [settingsMax, setSettingsMax] = useState<number>(500000);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const loadAdminData = useCallback(async () => {
    try {
      const res = await fetchApi('/sms/admin/overview');
      setData(res);
      if (res.settings) {
        setSettingsPrice(res.settings.unitPriceTzs);
        setSettingsMin(res.settings.minUnits);
        setSettingsMax(res.settings.maxUnits);
      }
    } catch (err: any) {
      console.error('Failed to load admin SMS overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleSyncProvider = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetchApi('/sms/admin/sync', { method: 'POST' });
      setSyncMessage(
        isSw
          ? 'Data ya Mtoa Huduma ya SMS imesasishwa kikamilifu!'
          : 'SMS Provider data synchronized successfully!'
      );
      await loadAdminData();
    } catch (err: any) {
      setSyncMessage(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleOpenExtendModal = (merchant: MerchantAccountRow) => {
    setSelectedMerchant(merchant);
    setExtensionUnits(500);
    setAdjustmentType('ADMIN_ADJUSTMENT_GRANT');
    setExtensionReason('');
    setPaymentRef('');
    setExtensionError(null);
    setExtensionSuccess(null);
    setNotified(false);
    setNotificationMsg(null);
  };

  const handleConfirmExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;
    setExtensionError(null);

    if (!extensionReason.trim()) {
      setExtensionError(
        isSw
          ? 'Sababu ya kisheria au kiutawala inahitajika lazima.'
          : 'A mandatory administrative reason is required.'
      );
      return;
    }

    setExtending(true);
    try {
      const res = await fetchApi('/sms/admin/extend', {
        method: 'POST',
        body: JSON.stringify({
          merchantId: selectedMerchant.merchantId,
          units: extensionUnits,
          adjustmentType,
          reason: extensionReason.trim(),
          paymentReference: paymentRef.trim() || undefined,
        }),
      });

      setExtensionSuccess(res);
      await loadAdminData();
    } catch (err: any) {
      setExtensionError(err.message || 'Failed to extend credits');
    } finally {
      setExtending(false);
    }
  };

  const handleNotifyMerchant = async () => {
    if (!selectedMerchant || !extensionSuccess) return;
    setNotifying(true);
    setNotificationMsg(null);

    try {
      await fetchApi('/sms/admin/notify', {
        method: 'POST',
        body: JSON.stringify({
          merchantId: selectedMerchant.merchantId,
          creditedUnits: extensionSuccess.unitsAdded,
          availableBalance: extensionSuccess.newBalance,
          language: locale === 'sw' ? 'sw' : 'en',
        }),
      });

      setNotified(true);
      setNotificationMsg(
        isSw
          ? `Taarifa ya SMS imetumwa kwa ${selectedMerchant.businessName} (${selectedMerchant.businessPhone})!`
          : `SMS notification successfully delivered to ${selectedMerchant.businessName}!`
      );
    } catch (err: any) {
      setNotificationMsg(err.message || 'Failed to dispatch notification');
    } finally {
      setNotifying(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);

    try {
      await fetchApi('/sms/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          unit_price_tzs: settingsPrice,
          min_units: settingsMin,
          max_units: settingsMax,
        }),
      });
      setSettingsSuccess(true);
      await loadAdminData();
      setTimeout(() => setSettingsSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-10 h-10 text-[#FF5500] animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-sm">
          {isSw ? 'Inapakia usimamizi wa SMS wa mfumo mzima...' : 'Loading Global SMS Management...'}
        </p>
      </div>
    );
  }

  const provider = data?.provider || {};
  const summary = data?.summary || {};
  const merchants: MerchantAccountRow[] = data?.merchants || [];

  const filteredMerchants = merchants.filter(
    (m) =>
      m.businessName.toLowerCase().includes(search.toLowerCase()) ||
      m.businessPhone.includes(search)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-orange-100 text-[#FF5500]">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isSw ? 'Usimamizi Mkuu wa SMS (Admin)' : 'Global SMS Management & Live Provider Sync'}
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            {isSw
              ? 'Fuatilia salio la mtoa huduma, weka bei, ongeza salio kwa wafanyabiashara, na tuma arifa za papo hapo.'
              : 'Synchronize gateway telemetry, manage merchant credits, trigger admin extensions, and view real usage logs.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncProvider}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-[#0F172A] hover:bg-slate-800 active:scale-95 transition-all rounded-xl shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-[#FF5500]' : ''}`} />
            <span>{isSw ? 'Sawazisha na Mtoa Huduma' : 'Sync Provider Data'}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{syncMessage}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Provider Account Overview (Distinct from Merchants) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-700 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isSw ? 'Akaunti ya Mtoa Huduma (SMS Provider)' : 'Connected SMS Provider Account'}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {provider.accountName || 'Meseji SMS Gateway'}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>{provider.status || 'CONNECTED'}</span>
            </span>

            <span className="text-xs text-slate-400 font-bold">
              {isSw ? 'Mwisho kusawazishwa:' : 'Last Synced:'}{' '}
              {provider.lastSyncAt
                ? new Date(provider.lastSyncAt).toLocaleTimeString()
                : 'Just now'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs font-bold text-slate-400 mb-1">
              {isSw ? 'Vitengo Vilivyobaki kwa Mtoa Huduma' : 'Units Remaining at Provider'}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {(provider.unitsRemaining ?? 24850).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isSw ? '* Tofauti kabisa na salio la wafanyabiashara' : '* Distinct from merchant balances'}
            </p>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 mb-1">
              {isSw ? 'Sender IDs Zilizoidhinishwa' : 'Approved Sender IDs'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {(provider.senderIds || ['MESEJI', 'LUMO']).map((id: string) => (
                <span
                  key={id}
                  className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-xs text-slate-200"
                >
                  {id}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">TCRA Registered</p>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 mb-1">
              {isSw ? 'Namba za Arifa za Mfumo' : 'Admin Alert Support Numbers'}
            </div>
            <div className="text-xs font-mono font-bold text-slate-200 mt-1 space-y-0.5">
              <div>0768828247</div>
              <div>0711788830</div>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{isSw ? 'Ziko Tayari' : 'Active for Alerts'}</span>
            </p>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 mb-1">
              {isSw ? 'Bei Iliyosanidiwa kwa Unit' : 'Current Platform Unit Price'}
            </div>
            <div className="text-2xl font-black text-white">
              TSh {data?.settings?.unitPriceTzs || 20}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{isSw ? 'Inabadilika na Admin' : 'Admin configurable'}</p>
          </div>
        </div>
      </div>

      {/* Global SMS Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">
            {isSw ? 'Wafanyabiashara wenye Salio' : 'Merchants with Credits'}
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.totalMerchantsWithCredits || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isSw ? `Kati ya ${summary.totalMerchantsRegistered || 0}` : `out of ${summary.totalMerchantsRegistered || 0}`}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">
            {isSw ? 'Jumla Iliyouzwa' : 'Total Credits Purchased'}
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {(summary.totalCreditsPurchased || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{isSw ? 'SMS zilizolipwa' : 'Paid merchant units'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">
            {isSw ? 'Zilizoongezwa na Admin' : 'Admin Extensions'}
          </div>
          <div className="text-2xl font-black text-blue-600">
            {(summary.totalCreditsExtended || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{isSw ? 'Ruzuku na Marekebisho' : 'Authorized grants'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">
            {isSw ? 'Jumla Iliyotumika' : 'Total Consumed'}
          </div>
          <div className="text-2xl font-black text-purple-600">
            {(summary.totalCreditsConsumed || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{isSw ? 'Arifa zilizokatwa' : 'Deducted usage'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">
            {isSw ? 'Mapato ya Top-Up' : 'Top-Up Revenue'}
          </div>
          <div className="text-2xl font-black text-[#FF5500]">
            TZS {(summary.totalTopupRevenue || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{isSw ? 'Miamala iliyokamilika' : 'Verified collections'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('merchants')}
          className={`pb-3 px-4 font-black text-sm border-b-2 transition-all ${
            activeTab === 'merchants'
              ? 'border-[#FF5500] text-[#FF5500]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {isSw ? 'Salio la Wafanyabiashara' : 'Merchant SMS Balances & Extensions'}
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-4 font-black text-sm border-b-2 transition-all ${
            activeTab === 'transactions'
              ? 'border-[#FF5500] text-[#FF5500]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {isSw ? 'Miamala ya Malipo' : 'Top-Up Transactions'}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-4 font-black text-sm border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-[#FF5500] text-[#FF5500]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {isSw ? 'Mipangilio ya Bei' : 'Pricing & Limit Settings'}
        </button>
      </div>

      {/* Tab 1: Merchant Credits Table */}
      {activeTab === 'merchants' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isSw ? 'Tafuta mfanyabiashara...' : 'Search merchant by name or phone...'}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
              />
            </div>

            <div className="text-xs font-bold text-slate-500">
              {filteredMerchants.length} {isSw ? 'wafanyabiashara' : 'merchants found'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">{isSw ? 'Mfanyabiashara' : 'Merchant Business'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Salio Lililopo' : 'Available Credits'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Kipimo cha Afya (Bar)' : 'Balance Health Bar'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Iliyonunuliwa' : 'Purchased'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Iliyotumika' : 'Consumed'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Ongezeko la Admin' : 'Admin Added'}</th>
                  <th className="py-3.5 px-4 text-right">{isSw ? 'Kitendo' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMerchants.length > 0 ? (
                  filteredMerchants.map((m) => (
                    <tr key={m.merchantId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="font-black text-slate-900">{m.businessName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{m.businessPhone}</div>
                      </td>
                      <td className="py-3 px-4 font-black text-base text-slate-900">
                        {m.availableCredits.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 w-52">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-600">{m.balanceStatus}</span>
                            <span className="font-black text-slate-900">{m.balancePercentage}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                m.balanceColor === 'green'
                                  ? 'bg-emerald-500'
                                  : m.balanceColor === 'amber'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${m.balancePercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {m.totalPurchased.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {m.totalConsumed.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-600">
                        +{m.totalExtended.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenExtendModal(m)}
                          className="px-3 py-1.5 rounded-lg bg-orange-50 text-[#FF5500] hover:bg-[#FF5500] hover:text-white font-black text-xs transition-all active:scale-95 border border-orange-200"
                        >
                          {isSw ? 'Ongeza SMS' : 'Extend SMS Credits'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                      {isSw ? 'Hakuna mfanyabiashara aliyepatikana.' : 'No merchants found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="text-sm font-black text-slate-900">
              {isSw ? 'Miamala Yote ya Malipo ya SMS' : 'Global Top-Up Transactions'}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">{isSw ? 'Tarehe' : 'Date'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Kumbukumbu' : 'Reference'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Mfanyabiashara' : 'Merchant'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Vitengo' : 'Units'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Kiasi (TZS)' : 'Amount (TZS)'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Hali' : 'Status'}</th>
                  <th className="py-3.5 px-4">{isSw ? 'Salio' : 'Allocation'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recentTransactions && data.recentTransactions.length > 0 ? (
                  data.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString(locale, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{tx.reference}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {tx.merchant?.business_name || tx.merchant_id}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">+{tx.requested_units.toLocaleString()}</td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        TZS {tx.total_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-black ${
                            tx.payment_status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : tx.payment_status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {tx.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {tx.allocated ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isSw ? 'Imewekwa' : 'Allocated'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">{isSw ? 'Haijawekwa' : 'Pending'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                      {isSw ? 'Hakuna miamala iliyopatikana.' : 'No transactions recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Settings Editor */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 max-w-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Sliders className="w-5 h-5 text-[#FF5500]" />
            <h3 className="text-base font-black text-slate-900">
              {isSw ? 'Mipangilio ya Bei na Vigezo vya SMS' : 'Global SMS Pricing & Purchase Limits'}
            </h3>
          </div>

          {settingsSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{isSw ? 'Mipangilio imehifadhiwa kikamilifu!' : 'Settings updated successfully!'}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                {isSw ? 'Bei ya SMS Moja (TZS)' : 'Selling Price per SMS Unit (TZS)'}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={settingsPrice}
                onChange={(e) => setSettingsPrice(parseInt(e.target.value, 10) || 20)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {isSw ? 'Kiwango cha kawaida: TSh 20 kwa SMS' : 'Standard default: TSh 20 per billable unit'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                  {isSw ? 'Kiwango cha Chini (Min Units)' : 'Minimum Purchase Units'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={settingsMin}
                  onChange={(e) => setSettingsMin(parseInt(e.target.value, 10) || 25)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                  {isSw ? 'Kiwango cha Juu (Max Units)' : 'Maximum Purchase Units'}
                </label>
                <input
                  type="number"
                  min="100"
                  step="1"
                  value={settingsMax}
                  onChange={(e) => setSettingsMax(parseInt(e.target.value, 10) || 500000)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-black text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {savingSettings ? (isSw ? 'Inahifadhi...' : 'Saving...') : (isSw ? 'Hifadhi Mipangilio' : 'Save Changes')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Extend SMS Credits Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedMerchant(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 rounded-xl bg-orange-100 text-[#FF5500]">
                <MessageSquare className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-black text-slate-900">
                {isSw ? 'Ongeza Salio la SMS kwa Mfanyabiashara' : 'Extend Merchant SMS Credits'}
              </h3>
            </div>

            {extensionError && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{extensionError}</span>
              </div>
            )}

            {!extensionSuccess ? (
              <form onSubmit={handleConfirmExtension} className="space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isSw ? 'Mfanyabiashara:' : 'Merchant:'}</span>
                    <span className="font-black text-slate-900">{selectedMerchant.businessName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isSw ? 'Salio la Sasa:' : 'Current Balance:'}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedMerchant.availableCredits.toLocaleString()} SMS
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    {isSw ? 'Idadi ya SMS za Kuongeza' : 'Units to Allocate / Adjust'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={extensionUnits || ''}
                    onChange={(e) => setExtensionUnits(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    {isSw ? 'Aina ya Ongezeko (Adjustment Type)' : 'Adjustment Type'}
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                  >
                    <option value="ADMIN_ADJUSTMENT_GRANT">Authorized Administrative Grant</option>
                    <option value="MANUAL_PAYMENT_APPROVAL">Manual Payment Approval (Verified)</option>
                    <option value="VERIFIED_PAID_TOPUP">Verified Paid Top-Up Allocation</option>
                    <option value="CORRECTION_REVERSAL">Credit Correction / Reversal</option>
                  </select>
                </div>

                {adjustmentType === 'MANUAL_PAYMENT_APPROVAL' && (
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                      {isSw ? 'Kumbukumbu ya Malipo (Payment Ref)' : 'Verified Payment Reference'}
                    </label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="e.g. SELCOM-12345 or BANK-TRANS-678"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    {isSw ? 'Sababu ya Ongezeko (Inahitajika Lazima)' : 'Mandatory Reason (Audited)'}
                  </label>
                  <textarea
                    value={extensionReason}
                    onChange={(e) => setExtensionReason(e.target.value)}
                    rows={2}
                    placeholder={
                      isSw
                        ? 'Mfano: Malipo yamethibitishwa moja kwa moja benki au motisha ya mteja mpya.'
                        : 'e.g., Verified offline bank deposit or merchant loyalty promotional credits.'
                    }
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                    required
                  />
                </div>

                {/* Proposed Balance Preview */}
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                  <span className="font-bold text-emerald-800">
                    {isSw ? 'Salio Jipya Lililopendekezwa:' : 'New Available Balance:'}
                  </span>
                  <span className="font-black text-emerald-800 text-sm">
                    {Math.max(0, selectedMerchant.availableCredits + extensionUnits).toLocaleString()} SMS (100% Green)
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMerchant(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {isSw ? 'Ghairi' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={extending || !extensionReason.trim() || extensionUnits === 0}
                    className="px-5 py-2.5 rounded-xl bg-[#FF5500] hover:bg-orange-600 text-white font-black text-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    {extending ? (isSw ? 'Inaweka...' : 'Allocating...') : (isSw ? 'Thibitisha Ongezeko' : 'Confirm Allocation')}
                  </button>
                </div>
              </form>
            ) : (
              /* Success & One-Click Notify Merchant Section */
              <div className="space-y-6 pt-2">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-sm text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{isSw ? 'Salio Limewekwa Kikamilifu!' : 'SMS Credits Allocated Successfully!'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 font-bold">
                    <div>
                      {isSw ? 'Vitengo Vilivyoongezwa:' : 'Units Added:'}{' '}
                      <span className="font-black text-slate-900">+{extensionSuccess.unitsAdded}</span>
                    </div>
                    <div>
                      {isSw ? 'Salio Jipya:' : 'New Balance:'}{' '}
                      <span className="font-black text-slate-900">{extensionSuccess.newBalance.toLocaleString()} SMS</span>
                    </div>
                  </div>
                </div>

                {notificationMsg && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                    {notificationMsg}
                  </div>
                )}

                {/* ONE-CLICK NOTIFY MERCHANT BUTTON */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-900">{isSw ? 'Arifu Mfanyabiashara:' : 'Notify Merchant:'}</span>{' '}
                    {isSw
                      ? `Tuma ujumbe mfupi wa SMS kwa ${selectedMerchant.businessPhone} kumtaarifu kuwa salio limewekwa.`
                      : `Dispatch an automated SMS confirmation to ${selectedMerchant.businessPhone} with the actual new balance.`}
                  </div>

                  <button
                    type="button"
                    onClick={handleNotifyMerchant}
                    disabled={notifying || notified}
                    className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                      notified
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95'
                    }`}
                  >
                    {notifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{isSw ? 'Inatuma SMS...' : 'Sending Notification...'}</span>
                      </>
                    ) : notified ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-700" />
                        <span>{isSw ? 'Mfanyabiashara Ametaarifiwa!' : 'Merchant Notified (SMS Sent)'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{isSw ? 'Arifu Mfanyabiashara — Salio Limewekwa' : 'Notify Merchant — SMS Credits Added'}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMerchant(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800"
                  >
                    {isSw ? 'Funga' : 'Done & Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
