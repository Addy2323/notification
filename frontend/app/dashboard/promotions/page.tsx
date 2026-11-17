'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Send,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Copy,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Eye,
  AlertTriangle,
  Save,
  X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

const PROMOTION_TYPES = [
  { value: 'CHRISTMAS_OFFERS', label: 'Christmas Offers' },
  { value: 'NEW_ARRIVALS', label: 'New Arrivals' },
  { value: 'DISCOUNT_OFFERS', label: 'Discount Offers' },
  { value: 'SPECIAL_OFFERS', label: 'Special Offers' },
  { value: 'CLEARANCE_SALES', label: 'Clearance Sales' },
  { value: 'SEASONAL_PROMOTIONS', label: 'Seasonal Promotions' },
  { value: 'PRODUCT_LAUNCH', label: 'Product Launch' },
  { value: 'GENERAL_ANNOUNCEMENT', label: 'General Announcement' },
  { value: 'CUSTOM_PROMOTION', label: 'Custom Promotion' },
];

const VARIABLES = [
  '[Customer Name]',
  '[Merchant Name]',
  '[Store Name]',
  '[Promotion Name]',
  '[Discount]',
  '[Expiration Date]',
  '[Store Link]',
];

export default function MerchantPromotionsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [totalEligible, setTotalEligible] = useState(0);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  const [campaignName, setCampaignName] = useState('');
  const [promotionType, setPromotionType] = useState('NEW_ARRIVALS');
  const [messageBody, setMessageBody] = useState('');
  const [discountVar, setDiscountVar] = useState('20% OFF');
  const [expiryVar, setExpiryVar] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [custSearch, setCustSearch] = useState('');
  const [custFilter, setCustFilter] = useState<'ALL' | 'ELIGIBLE' | 'OPTED_IN'>('ELIGIBLE');

  const [previewData, setPreviewData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [detailsModal, setDetailsModal] = useState<any>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, tplRes, custRes] = await Promise.all([
        fetchApi('/promotions/overview'),
        fetchApi('/promotions/templates'),
        fetchApi('/promotions/customers?filter=ALL'),
      ]);
      const ovData = ovRes?.data || ovRes;
      const tplData = (tplRes?.data || tplRes)?.templates || [];
      const custData = custRes?.data || custRes;

      setOverview(ovData);
      setTemplates(tplData);
      setCustomers(custData?.customers || []);
      setTotalEligible(custData?.totalEligible || 0);
      if (!messageBody && tplData.length > 0) {
        setMessageBody(tplData[0].body);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredCustomers = customers.filter((c) => {
    const q = custSearch.trim().toLowerCase();
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.maskedPhone?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (custFilter === 'ELIGIBLE') return c.eligible;
    if (custFilter === 'OPTED_IN') return c.marketingOptIn;
    return true;
  });

  const handleSelectAllEligible = () => {
    setSelectedIds(filteredCustomers.filter((c) => c.eligible).map((c) => c.id));
  };

  const handleDeselectAll = () => setSelectedIds([]);

  const toggleCustomer = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSaveTemplate = async () => {
    if (!messageBody.trim()) return;
    const name = campaignName.trim() || `Saved Template ${templates.length + 1}`;
    try {
      await fetchApi('/promotions/templates', {
        method: 'POST',
        body: JSON.stringify({ name, promotionType, body: messageBody }),
      });
      showToast('success', `Template "${name}" saved`);
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Could not save template');
    }
  };

  const handleProceedToConfirm = async () => {
    if (!campaignName.trim()) {
      showToast('error', 'Please enter a Campaign Name first');
      return;
    }
    if (!messageBody.trim()) {
      showToast('error', 'SMS message content cannot be empty');
      return;
    }
    if (selectedIds.length === 0) {
      showToast('error', 'Select at least one customer recipient');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchApi('/promotions/campaigns/preview', {
        method: 'POST',
        body: JSON.stringify({
          name: campaignName,
          promotionType,
          messageBody,
          customerIds: selectedIds,
          discount: discountVar,
          expirationDate: expiryVar,
        }),
      });
      setPreviewData(res?.data || res);
      setWizardStep(3);
    } catch (err: any) {
      showToast('error', err.message || 'Unable to preview campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAndSend = async () => {
    setSubmitting(true);
    try {
      await fetchApi('/promotions/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: campaignName,
          promotionType,
          messageBody,
          customerIds: selectedIds,
          discount: discountVar,
          expirationDate: expiryVar,
          confirmSend: true,
        }),
      });
      showToast('success', 'Promotion campaign confirmed and queued for delivery!');
      setCreating(false);
      setWizardStep(1);
      setCampaignName('');
      setSelectedIds([]);
      setPreviewData(null);
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to launch SMS campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (campaignId: string) => {
    try {
      const res = await fetchApi(`/promotions/campaigns/${campaignId}`);
      setDetailsModal((res?.data || res)?.campaign);
    } catch (err: any) {
      showToast('error', err.message || 'Unable to load campaign details');
    }
  };

  const handleDuplicate = async (campaignId: string) => {
    try {
      await fetchApi(`/promotions/campaigns/${campaignId}/duplicate`, { method: 'POST' });
      showToast('success', 'Campaign duplicated as draft');
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to duplicate campaign');
    }
  };

  const handleRetryFailed = async (campaignId: string) => {
    try {
      await fetchApi(`/promotions/campaigns/${campaignId}/retry-failed`, { method: 'POST' });
      showToast('success', 'Failed messages queued for retry');
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to retry failed messages');
    }
  };

  const stats = overview?.stats || {};
  const campaigns = overview?.campaigns || [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {toast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#FF5500]" />
            Marketing & Bulk SMS Promotions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Engage your customers directly with targeted SMS promotions powered by your LUMO SMS Wallet.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setWizardStep(1);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create New Promotion
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Campaigns', value: stats.totalCampaigns || 0 },
          { label: 'Messages Sent', value: stats.totalMessagesSent || 0 },
          { label: 'Successful', value: stats.successfulDeliveries || 0 },
          { label: 'Failed', value: stats.failedDeliveries || 0 },
          { label: 'Available Credits', value: `${Number(stats.availableCredits || 0).toLocaleString()} SMS` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">{kpi.label}</p>
            <p className="text-xl font-black text-slate-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Create Campaign Wizard */}
      {creating && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-[#0F172A] text-white text-xs font-bold">
                Step {wizardStep} of 3
              </span>
              <h2 className="text-base font-extrabold text-slate-900">
                {wizardStep === 1
                  ? 'Campaign Details & SMS Template'
                  : wizardStep === 2
                  ? 'Select Your Customer Audience'
                  : 'Preview & Confirm Campaign'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {wizardStep === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Name *</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Weekend Flash Sale"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Promotion Type</label>
                  <select
                    value={promotionType}
                    onChange={(e) => setPromotionType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {PROMOTION_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Template Library */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">Quick Templates</p>
                <div className="flex flex-wrap gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setMessageBody(tpl.body);
                        if (tpl.promotion_type) setPromotionType(tpl.promotion_type);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700">SMS Message *</label>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5500] hover:underline"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save as Custom Template
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMessageBody((m) => `${m}${m ? ' ' : ''}${v}`)}
                      className="px-2.5 py-1 rounded-lg bg-orange-50 text-[#FF5500] border border-orange-100 text-[11px] font-mono"
                    >
                      + {v}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={4}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      [Discount] Value (optional)
                    </label>
                    <input
                      type="text"
                      value={discountVar}
                      onChange={(e) => setDiscountVar(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      [Expiration Date] Value (optional)
                    </label>
                    <input
                      type="text"
                      value={expiryVar}
                      onChange={(e) => setExpiryVar(e.target.value)}
                      placeholder="e.g. 30 Nov"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800"
                >
                  Next: Select Customers
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="text-xs">
                  <p className="font-bold text-slate-900">
                    Total Eligible Customers: {totalEligible} • Selected: {selectedIds.length}
                  </p>
                  <p className="text-slate-500">Only customers belonging to your business are accessible.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllEligible}
                    className="px-3 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold"
                  >
                    Select All Eligible
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={custSearch}
                    onChange={(e) => setCustSearch(e.target.value)}
                    placeholder="Search your customers by name or phone..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <select
                  value={custFilter}
                  onChange={(e) => setCustFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="ELIGIBLE">Eligible Customers</option>
                  <option value="OPTED_IN">Opted-In Only</option>
                  <option value="ALL">All Customers</option>
                </select>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                {filteredCustomers.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-500">No customers match your filter.</p>
                ) : (
                  filteredCustomers.map((c) => {
                    const checked = selectedIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 ${
                          !c.eligible ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={!c.eligible}
                            checked={checked}
                            onChange={() => toggleCustomer(c.id)}
                            className="w-4 h-4 accent-[#FF5500]"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">{c.name}</p>
                            <p className="text-[11px] font-mono text-slate-500">{c.maskedPhone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500">{c.totalOrders} orders</span>
                          {!c.eligible && (
                            <p className="text-[10px] text-rose-600 font-semibold">Opted out / Invalid</p>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleProceedToConfirm}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50"
                >
                  {submitting ? 'Calculating...' : 'Preview & Confirm'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {wizardStep === 3 && previewData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] text-slate-500">Recipients</p>
                  <p className="text-lg font-black text-slate-900">{previewData.totalEligibleRecipients}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] text-slate-500">Estimated SMS Units</p>
                  <p className="text-lg font-black text-slate-900">{previewData.estimatedUnits}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] text-slate-500">Estimated Cost</p>
                  <p className="text-lg font-black text-slate-900">
                    TZS {Number(previewData.estimatedCostTzs || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] text-slate-500">Available Credits</p>
                  <p className={`text-lg font-black ${previewData.hasSufficientCredits ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {previewData.availableCredits}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <p className="text-[11px] font-bold uppercase text-slate-500">Sample Rendered Message</p>
                <p className="text-xs font-mono text-slate-900 whitespace-pre-wrap">{previewData.sampleMessage}</p>
              </div>

              {!previewData.hasSufficientCredits && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                  Insufficient SMS credits. Please top up your SMS balance in SMS Management before sending.
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Edit
                </button>
                <button
                  type="button"
                  disabled={submitting || !previewData.hasSufficientCredits}
                  onClick={handleConfirmAndSend}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Launching...' : 'Confirm & Send Promotion'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Campaign History */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">Promotion Campaign History</h2>
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading && campaigns.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No promotional campaigns yet</p>
            <p className="text-xs text-slate-500">Create your first bulk SMS campaign to bring customers back to your store.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((camp: any) => (
              <div
                key={camp.id}
                className="p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{camp.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">{camp.message_body}</p>
                  <p className="text-[11px] text-slate-500">
                    Recipients: {camp.total_recipients} • Sent: {camp.sent_count} • Failed: {camp.failed_count} • Cost: TZS {Number(camp.total_cost_tzs || camp.estimated_cost_tzs || 0).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewDetails(camp.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(camp.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicate
                  </button>
                  {camp.failed_count > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRetryFailed(camp.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Failed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">{detailsModal.name}</h2>
                <p className="text-xs text-slate-500">Status: {detailsModal.status}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModal(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono">
              {detailsModal.message_body}
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl max-h-64 overflow-y-auto">
              {(detailsModal.recipients || []).map((rec: any) => (
                <div key={rec.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{rec.customerName}</p>
                    <p className="font-mono text-slate-500">{rec.maskedPhone}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.status === 'SENT'
                          ? 'bg-emerald-100 text-emerald-700'
                          : rec.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rec.status}
                    </span>
                    {rec.failureReason && <p className="text-[10px] text-rose-600 mt-0.5">{rec.failureReason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

