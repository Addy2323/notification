'use client';

import React from 'react';
import { Award, Trophy, Star, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AdminAchievementsPage() {
  const achievements = [
    { title: 'First 10 Orders Completed', badge: '🥇', desc: 'Awarded when merchant fulfills 10 orders on LUMO' },
    { title: '100 Orders Centurion', badge: '💯', desc: 'Awarded when merchant reaches 100 successful dispatches' },
    { title: '1,000 Orders Platinum', badge: '👑', desc: 'Awarded to elite high-volume merchants' },
    { title: '7-Day Activity Streak', badge: '🔥', desc: 'Awarded for consecutive daily order processing' },
    { title: 'TZS 10,000,000 Sales Club', badge: '💰', desc: 'Awarded for generating over 10M TZS gross revenue' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            Merchant Achievements & Awards Recognition
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated milestone badges and awards recognizing active, high-volume, and consistent platform merchants.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {achievements.map((item, idx) => (
          <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{item.badge}</span>
              <div>
                <h3 className="font-bold text-white text-sm">{item.title}</h3>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
