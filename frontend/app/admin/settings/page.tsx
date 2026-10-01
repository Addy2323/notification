'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { Settings, Save, Shield, Bell, Sliders } from 'lucide-react';

export default function AdminSettingsPage() {
  const [weights, setWeights] = useState({
    orderVolumeWeight: 25,
    completionRateWeight: 25,
    streakWeight: 20,
    driverUsageWeight: 15,
    notificationWeight: 15,
  });

  const handleSave = () => {
    Swal.fire({
      title: 'Settings Saved',
      text: 'Engagement scoring algorithm weights updated successfully.',
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
            <Settings className="w-6 h-6 text-amber-400" />
            LUMO Administrative Control Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure merchant engagement scoring weights, operational alert thresholds, and platform parameters.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 max-w-3xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-amber-400" />
          Merchant Engagement Scoring Weights (Total 100 Points)
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>Order Volume Weight</span>
              <span className="font-mono text-amber-400">{weights.orderVolumeWeight} pts</span>
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
              <span>Order Completion / Fulfillment Rate Weight</span>
              <span className="font-mono text-amber-400">{weights.completionRateWeight} pts</span>
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
              <span>Daily Order Consistency (Streak Weight)</span>
              <span className="font-mono text-amber-400">{weights.streakWeight} pts</span>
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
              <span>Driver Usage Weight</span>
              <span className="font-mono text-amber-400">{weights.driverUsageWeight} pts</span>
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
              <span>SMS Notification Success Weight</span>
              <span className="font-mono text-amber-400">{weights.notificationWeight} pts</span>
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
