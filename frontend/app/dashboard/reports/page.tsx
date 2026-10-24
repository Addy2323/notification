'use client';


import { useLanguage, T } from '@/components/LanguageProvider';
import React, { useState } from 'react';
import { FileText, Download, Calendar, FileSpreadsheet, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';

export default function ReportsPage() {
  const { t, label: uiLabel, locale, language } = useLanguage();

  const [reportType, setReportType] = useState('DAILY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const getApiUrl = (format: 'pdf' | 'excel') => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const params = new URLSearchParams();
    params.append('reportType', reportType);
    params.append('language', language);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return `${backendUrl}/reports/${format}?${params.toString()}`;
  };

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const url = getApiUrl('pdf');
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(url, {
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || t("merchant.failed_to_generate_pdf"));
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `LUMO_${reportType}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      console.error('PDF download error:', err);
      alert(err.message || t("merchant.failed_to_generate_pdf_report_please_try_again"));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const url = getApiUrl('excel');
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || t("merchant.failed_to_generate_excel"));
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `LUMO_${reportType}_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      console.error('Excel download error:', err);
      alert(err.message || t("merchant.failed_to_generate_excel_workbook_please_try_again"));
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5500] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight"><T k="merchant.paperless_sales_delivery_reports" /></h1>
            <p className="text-sm text-slate-400"><T k="merchant.generate_merchant_pdf_reports_multi_sheet_excel_business_workbooks" /></p>
          </div>
        </div>
      </div>

      {/* Main Generator Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Options Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900"><T k="merchant.1_select_report_period_preset" /></h3>
            <p className="text-xs text-slate-500 mt-1"><T k="merchant.choose_predefined_timeframe_or_specify_custom_dates" /></p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'DAILY', title: 'Daily Report', desc: "Today's sales & orders" },
              { id: 'WEEKLY', title: 'Weekly Report', desc: 'Current week performance' },
              { id: 'MONTHLY', title: 'Monthly Report', desc: 'Full monthly breakdown' },
              { id: 'QUARTERLY', title: 'Quarterly', desc: '3-month sales summary' },
              { id: 'SEMI_ANNUAL', title: 'Semi-Annual', desc: '6-month ledger record' },
              { id: 'ANNUAL', title: 'Annual', desc: 'Full year financial report' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setReportType(p.id)}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                  reportType === p.id
                    ? 'border-[#FF5500] bg-orange-50/50 ring-2 ring-[#FF5500]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className={`text-xs font-bold block ${reportType === p.id ? 'text-[#FF5500]' : 'text-slate-900'}`}>
                    {uiLabel(p.title)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block mt-1">{uiLabel(p.desc)}</span>
                </div>
                {reportType === p.id && <CheckCircle2 className="w-4 h-4 text-[#FF5500] mt-3 self-end" />}
              </button>
            ))}
          </div>

          {/* Download Buttons */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="flex-1 py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {downloadingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#FF5500]" />
              ) : (
                <FileText className="w-4 h-4 text-[#FF5500]" />
              )}
              {downloadingPdf ? t("merchant.generating_pdf") : t("merchant.download_vector_pdf_report")}
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {downloadingExcel ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-white" />
              )}
              {downloadingExcel ? t("merchant.generating_excel") : t("merchant.download_excel_xlsx_workbook")}
            </button>
          </div>
        </div>

        {/* Feature Explanation & Workbook Tabs Info */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[#FF5500]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base"><T k="merchant.paperless_merchant_operations" /></h3>
              <p className="text-xs text-slate-400"><T k="merchant.replaces_physical_paper_order_books" /></p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#FF5500]" />{' '}<T k="merchant.branded_pdf_reports" />{' '}</h4>
              <p className="text-slate-400"><T k="merchant.vector_pdf_featuring_merchant_logo_tanzanian_skyline_branding_summary_cards_and_itemi" /></p>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />{' '}<T k="merchant.multi_sheet_excel_workbook" />{' '}</h4>
              <p className="text-slate-400"><T k="merchant.exports_8_dedicated_sheets_summary_sales_ledger_orders_products_customers_deliveries_" /></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
