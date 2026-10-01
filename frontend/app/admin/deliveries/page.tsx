'use client';

import React, { useState, useEffect } from 'react';
import { Package, Search, Truck, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminDeliveriesPage() {
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const overview = await fetchApi('/admin/overview?period=THIS_MONTH');
      // Or fetch from traffic stream / search
      const stream = await fetchApi('/admin/traffic/live');
      setDeliveries(stream?.stream?.filter((item: any) => item.type === 'DELIVERY') || []);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-400" />
            Deliveries Command Centre
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time delivery status, dispatch timelines, and fulfillment tracking.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white">Live Delivery Stream</h3>
        {loading ? (
          <div className="py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
            Loading delivery status...
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.map((d) => (
              <div key={d.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-white">{d.text}</span>
                <span className="text-[10px] font-mono text-slate-500">{new Date(d.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
            {deliveries.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">All active deliveries running smoothly.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
