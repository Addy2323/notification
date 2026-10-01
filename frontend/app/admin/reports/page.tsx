'use client';

import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter, FileSpreadsheet } from 'lucide-react';

export default function AdminReportsPage() {
  const [period, setPeriod] = useState('THIS_MONTH');
  const [reportType, setReportType] = useState('PLATFORM_OVERVIEW');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-400" />
            Branded Platform Reports & Export Centre
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate executive PDF reports and multi-sheet Excel workbooks for merchants, sales, deliveries, and audit logs.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 max-w-2xl">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-300">Select Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500"
          >
            <option value="PLATFORM_OVERVIEW">Platform Overview Report</option>
            <option value="MERCHANT_PERFORMANCE">Merchant Performance & Rankings</option>
            <option value="SALES">Sales & Financial Ledger</option>
            <option value="DELIVERIES">Deliveries & Dispatch Summary</option>
            <option value="AUDIT_LOGS">Administrative Audit Log</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-300">Select Reporting Period</label>
          <div className="grid grid-cols-3 gap-2">
            {['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_QUARTER', 'SEMI_ANNUAL', 'THIS_YEAR'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  period === p
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-slate-800">
          <a
            href={`/api/admin/reports/pdf?period=${period}&reportType=${reportType}`}
            target="_blank"
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Download PDF Report
          </a>

          <a
            href={`/api/admin/reports/excel?period=${period}&reportType=${reportType}`}
            target="_blank"
            className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel Workbook
          </a>
        </div>
      </div>
    </div>
  );
}
