'use client';


import { useLanguage, T } from '@/components/LanguageProvider';
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { Settings, Save, Shield, Bell, Sliders } from 'lucide-react';

export default function AdminSettingsPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const [weights, setWeights] = useState({
    orderVolumeWeight: 25,
    completionRateWeight: 25,
    streakWeight: 20,
    driverUsageWeight: 15,
    notificationWeight: 15,
  });

  const handleSave = () => {
    Swal.fire({
      title: t("admin.settings_saved"),
      text: t("admin.engagement_scoring_algorithm_weights_updated_successfully"),
      icon: 'success',
      background: '#0F172A',
      color: '#FFFFFF',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" />{' '}<T k="admin.lumo_administrative_control_settings" />{' '}</h1>
          <p className="text-xs text-slate-400 mt-1">{' '}<T k="admin.configure_merchant_engagement_scoring_weights_operational_alert_thresholds_and_platfo" />{' '}</p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span><T k="admin.save_changes" /></span>
        </button>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 max-w-3xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-amber-400" />{' '}<T k="admin.merchant_engagement_scoring_weights_total_100_points" />{' '}</h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span><T k="admin.order_volume_weight" /></span>
              <span className="font-mono text-amber-400">{weights.orderVolumeWeight}{' '}<T k="admin.pts" /></span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weights.orderVolumeWeight}
              onChange={(e) => setWeights({ ...weights, orderVolumeWeight: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span><T k="admin.order_completion_fulfillment_rate_weight" /></span>
              <span className="font-mono text-amber-400">{weights.completionRateWeight}{' '}<T k="admin.pts" /></span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weights.completionRateWeight}
              onChange={(e) => setWeights({ ...weights, completionRateWeight: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span><T k="admin.daily_order_consistency_streak_weight" /></span>
              <span className="font-mono text-amber-400">{weights.streakWeight}{' '}<T k="admin.pts" /></span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={weights.streakWeight}
              onChange={(e) => setWeights({ ...weights, streakWeight: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span><T k="admin.driver_usage_weight" /></span>
              <span className="font-mono text-amber-400">{weights.driverUsageWeight}{' '}<T k="admin.pts" /></span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={weights.driverUsageWeight}
              onChange={(e) => setWeights({ ...weights, driverUsageWeight: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span><T k="admin.sms_notification_success_weight" /></span>
              <span className="font-mono text-amber-400">{weights.notificationWeight}{' '}<T k="admin.pts" /></span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={weights.notificationWeight}
              onChange={(e) => setWeights({ ...weights, notificationWeight: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
