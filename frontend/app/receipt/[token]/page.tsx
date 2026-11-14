'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Store,
  User,
  Phone,
  MapPin,
  Receipt,
  CreditCard,
  Loader2,
  X,
  ExternalLink,
  Globe,
  Mail,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

interface ReceiptMerchant {
  businessName: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface ReceiptItem {
  no: number;
  productName: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  lineTotal: number;
}

interface ReceiptFinancials {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  outstandingBalance: number;
}

interface PublicReceiptData {
  receiptNumber: string;
  orderNumber: string;
  receiptGeneratedAt: string;
  orderCompletedAt: string;
  transactionReference?: string | null;
  orderStatus: string;
  paymentStatus: 'PAID' | 'PARTIALLY PAID' | 'UNPAID' | 'REFUNDED';
  currency: string;
  merchant: ReceiptMerchant;
  customer: {
    name: string;
    phone: string;
    deliveryAddress?: string | null;
  };
  items: ReceiptItem[];
  financials: ReceiptFinancials;
}

function resolveAssetUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const backendOrigin = API_BASE.replace(/\/api\/?$/, '');
  return trimmed.startsWith('/') ? `${backendOrigin}${trimmed}` : `${backendOrigin}/${trimmed}`;
}

function formatMoney(amount: number, currency: string) {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `${currency || 'TZS'} ${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getPaymentBadge(status: PublicReceiptData['paymentStatus']) {
  switch (status) {
    case 'PAID':
      return {
        label: 'PAID',
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        note: 'Full payment has been recorded for this order.',
      };
    case 'PARTIALLY PAID':
      return {
        label: 'PARTIALLY PAID',
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        note: 'Partial payment received. An outstanding balance remains due.',
      };
    case 'REFUNDED':
      return {
        label: 'REFUNDED',
        bg: 'bg-slate-100 border-slate-300',
        text: 'text-slate-700',
        dot: 'bg-slate-500',
        note: 'Payment for this order has been marked as refunded.',
      };
    default:
      return {
        label: 'UNPAID',
        bg: 'bg-rose-50 border-rose-200',
        text: 'text-rose-700',
        dot: 'bg-rose-500',
        note: 'Order is completed, while payment settlement is still pending.',
      };
  }
}

export default function PublicConfirmationReceiptPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token || '');

  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<PublicReceiptData | null>(null);
  const [errorState, setErrorState] = useState<{
    code: 'NOT_FOUND' | 'REVOKED' | 'EXPIRED' | 'ERROR';
    message: string;
    receiptNumber?: string;
  } | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const pdfInlineUrl = `${API_BASE}/receipts/public/${encodeURIComponent(token)}/pdf`;
  const pdfDownloadUrl = `${API_BASE}/receipts/public/${encodeURIComponent(token)}/pdf?download=1`;

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function load() {
      setLoading(true);
      setErrorState(null);
      try {
        const res = await fetch(`${API_BASE}/receipts/public/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        const payload = await res.json().catch(() => null);

        if (!active) return;

        if (!res.ok || !payload?.success) {
          const code = payload?.error?.code || (res.status === 404 ? 'NOT_FOUND' : 'ERROR');
          if (code === 'RECEIPT_REVOKED') {
            setErrorState({
              code: 'REVOKED',
              message: payload?.error?.message || 'This confirmation receipt link has been revoked.',
              receiptNumber: payload?.data?.receiptNumber,
            });
          } else if (code === 'RECEIPT_EXPIRED') {
            setErrorState({
              code: 'EXPIRED',
              message: payload?.error?.message || 'This confirmation receipt link has expired.',
              receiptNumber: payload?.data?.receiptNumber,
            });
          } else if (res.status === 404 || code === 'RECEIPT_NOT_FOUND') {
            setErrorState({
              code: 'NOT_FOUND',
              message: payload?.error?.message || 'This confirmation receipt could not be found.',
            });
          } else {
            setErrorState({
              code: 'ERROR',
              message: payload?.error?.message || 'Unable to load confirmation receipt right now.',
            });
          }
          return;
        }

        setReceipt(payload.data);
      } catch {
        if (!active) return;
        setErrorState({
          code: 'ERROR',
          message: 'Network error while retrieving your confirmation receipt.',
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm max-w-sm w-full text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF5500] mx-auto" />
          <div>
            <p className="text-sm font-bold text-slate-900">Loading Confirmation Receipt</p>
            <p className="text-xs text-slate-500 mt-1">Verifying your secure LUMO Track receipt link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorState || !receipt) {
    const isRevoked = errorState?.code === 'REVOKED';
    const isExpired = errorState?.code === 'EXPIRED';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm max-w-md w-full text-center space-y-4">
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
              isRevoked || isExpired ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isRevoked ? (
              <ShieldAlert className="w-7 h-7" />
            ) : isExpired ? (
              <Clock className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-black text-slate-900">
              {isRevoked
                ? 'Receipt Link Revoked'
                : isExpired
                ? 'Receipt Link Expired'
                : 'Receipt Unavailable'}
            </h1>
            <p className="text-sm text-slate-600">{errorState?.message}</p>
            {errorState?.receiptNumber && (
              <p className="text-xs font-mono text-slate-400 pt-1">
                Reference: {errorState.receiptNumber}
              </p>
            )}
          </div>
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Please contact the merchant directly if you need an updated confirmation receipt.
            <div className="mt-2 font-semibold text-slate-500">Powered by LUMO Track</div>
          </div>
        </div>
      </div>
    );
  }

  const logoSrc = resolveAssetUrl(receipt.merchant.logoUrl);
  const payBadge = getPaymentBadge(receipt.paymentStatus);

  return (
    <div className="min-h-screen bg-slate-100/80 py-6 sm:py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Top Action & Header Banner */}
        <div className="bg-[#0F172A] text-white rounded-3xl shadow-lg overflow-hidden border border-slate-800">
          <div className="h-1.5 w-full bg-[#FF5500]" />
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={receipt.merchant.businessName}
                  className="w-14 h-14 rounded-2xl object-contain bg-white p-1.5 shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                  {receipt.merchant.businessName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#FF5500]">
                  <Receipt className="w-3.5 h-3.5" />
                  Official Document
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  CONFIRMATION RECEIPT
                </h1>
                <p className="text-sm font-semibold text-slate-300 truncate">
                  {receipt.merchant.businessName}
                </p>
              </div>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl px-4 py-3 sm:text-right flex-shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Receipt Reference
              </div>
              <div className="text-sm font-black font-mono text-white mt-0.5">
                {receipt.receiptNumber}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Order #{receipt.orderNumber}
              </div>
            </div>
          </div>

          {/* Primary Customer Actions */}
          <div className="bg-slate-900/60 border-t border-slate-800 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Order status: <strong className="text-white">{receipt.orderStatus}</strong></span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-extrabold uppercase tracking-wider transition-colors"
              >
                <Eye className="w-4 h-4 text-[#FF5500]" />
                PREVIEW RECEIPT
              </button>
              <a
                href={pdfDownloadUrl}
                download={`Confirmation-Receipt-${receipt.receiptNumber}.pdf`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                DOWNLOAD PDF
              </a>
            </div>
          </div>
        </div>

        {/* Main Receipt Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Merchant & Receipt Metadata Grid */}
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100">
            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Store className="w-3.5 h-3.5 text-[#FF5500]" />
                Business Information
              </div>
              <p className="text-sm font-black text-slate-900">{receipt.merchant.businessName}</p>
              <div className="space-y-1 text-xs text-slate-600">
                {receipt.merchant.address && (
                  <p className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{receipt.merchant.address}</span>
                  </p>
                )}
                {receipt.merchant.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{receipt.merchant.phone}</span>
                  </p>
                )}
                {receipt.merchant.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{receipt.merchant.email}</span>
                  </p>
                )}
                {receipt.merchant.website && (
                  <p className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{receipt.merchant.website}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <FileText className="w-3.5 h-3.5 text-[#FF5500]" />
                Receipt & Order Details
              </div>
              <dl className="grid grid-cols-2 gap-y-2 text-xs">
                <dt className="text-slate-500">Receipt No.</dt>
                <dd className="font-mono font-bold text-slate-900 text-right">{receipt.receiptNumber}</dd>

                <dt className="text-slate-500">Order No.</dt>
                <dd className="font-mono font-bold text-slate-900 text-right">#{receipt.orderNumber}</dd>

                <dt className="text-slate-500">Generated Date</dt>
                <dd className="font-medium text-slate-800 text-right">{formatDateTime(receipt.receiptGeneratedAt)}</dd>

                <dt className="text-slate-500">Completed Date</dt>
                <dd className="font-medium text-slate-800 text-right">{formatDateTime(receipt.orderCompletedAt)}</dd>

                {receipt.transactionReference && (
                  <>
                    <dt className="text-slate-500">Transaction Ref</dt>
                    <dd className="font-mono font-semibold text-slate-900 text-right">{receipt.transactionReference}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          {/* Customer Information & Payment Status */}
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <User className="w-3.5 h-3.5 text-[#0F172A]" />
                Customer Information
              </div>
              <p className="text-sm font-bold text-slate-900">{receipt.customer.name}</p>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {receipt.customer.phone}
              </p>
              {receipt.customer.deliveryAddress && (
                <p className="text-xs text-slate-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>{receipt.customer.deliveryAddress}</span>
                </p>
              )}
            </div>

            <div className={`rounded-2xl border p-4 space-y-1.5 ${payBadge.bg}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Payment Status
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${payBadge.text} bg-white/80 border border-current/15`}
                >
                  <span className={`w-2 h-2 rounded-full ${payBadge.dot}`} />
                  {payBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-700 pt-1">{payBadge.note}</p>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A] mb-4">
              Order Items
            </h2>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0F172A] text-white text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold w-12">No.</th>
                    <th className="py-3 px-4 font-bold">Product</th>
                    <th className="py-3 px-4 font-bold text-right">Qty</th>
                    <th className="py-3 px-4 font-bold text-right">Unit Price</th>
                    <th className="py-3 px-4 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {receipt.items.map((item) => (
                    <tr key={item.no} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-slate-500">{item.no}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.productName}</div>
                        {item.description && (
                          <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatMoney(item.unitPrice, receipt.currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatMoney(item.lineTotal, receipt.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="p-6 sm:p-8 bg-slate-50/60">
            <div className="max-w-sm ml-auto space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatMoney(receipt.financials.subtotal, receipt.currency)}
                </span>
              </div>
              {receipt.financials.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-mono font-semibold">
                    - {formatMoney(receipt.financials.discountAmount, receipt.currency)}
                  </span>
                </div>
              )}
              {receipt.financials.deliveryFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charges</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatMoney(receipt.financials.deliveryFee, receipt.currency)}
                  </span>
                </div>
              )}
              {receipt.financials.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Taxes</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatMoney(receipt.financials.taxAmount, receipt.currency)}
                  </span>
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-base font-black text-[#0F172A]">
                <span>Grand Total</span>
                <span className="font-mono">
                  {formatMoney(receipt.financials.grandTotal, receipt.currency)}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 pt-1">
                <span>Amount Paid</span>
                <span className="font-mono font-bold">
                  {formatMoney(receipt.financials.amountPaid, receipt.currency)}
                </span>
              </div>

              <div
                className={`flex justify-between font-bold ${
                  receipt.financials.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                <span>Outstanding Balance</span>
                <span className="font-mono">
                  {formatMoney(receipt.financials.outstandingBalance, receipt.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="px-6 sm:px-8 py-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              <p className="font-bold text-slate-800">
                Thank you for choosing {receipt.merchant.businessName}.
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {[receipt.merchant.phone, receipt.merchant.email, receipt.merchant.website]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              Powered by <span className="text-[#0F172A] font-black">LUMO</span>{' '}
              <span className="text-[#FF5500] font-black">Track</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline PDF Document Preview Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#0F172A] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-[#FF5500] flex-shrink-0" />
                <span className="text-xs sm:text-sm font-bold truncate">
                  PDF Preview — {receipt.receiptNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfInlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Tab
                </a>
                <a
                  href={pdfDownloadUrl}
                  download={`Confirmation-Receipt-${receipt.receiptNumber}.pdf`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5500] hover:bg-[#E04B00] text-xs font-bold text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </a>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  aria-label="Close preview"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src={pdfInlineUrl}
                title={`Confirmation Receipt ${receipt.receiptNumber}`}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

