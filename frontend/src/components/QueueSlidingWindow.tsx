'use client';

import React from 'react';
import { Users, Clock } from 'lucide-react';

interface UpcomingToken {
  tokenNumber: number;
  tokenCode?: string;
  serviceType?: string;
  priority?: boolean;
  customerName: string;
  queuePosition: number;
  uuid: string;
  snoozeCount?: number;
}

interface QueueSlidingWindowProps {
  upcomingTokens: UpcomingToken[];
  totalWaiting: number;
}

export const QueueSlidingWindow: React.FC<QueueSlidingWindowProps> = ({
  upcomingTokens,
  totalWaiting
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Upcoming Queue
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Next callers in line</p>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
          {totalWaiting} Waiting
        </span>
      </div>

      {/* Token List */}
      {upcomingTokens.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Users className="w-7 h-7 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold text-slate-700">No visitors waiting</p>
          <p className="text-[11px] text-slate-400 mt-0.5">New check-ins will appear live</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {upcomingTokens.map((t, idx) => {
            const categoryColors: Record<string, string> = {
              BILLING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              PHARMACY: 'bg-purple-50 text-purple-700 border-purple-200',
              PRIORITY: 'bg-amber-50 text-amber-700 border-amber-200',
              GENERAL: 'bg-blue-50 text-blue-700 border-blue-200'
            };
            const colorClass = categoryColors[t.serviceType || 'GENERAL'] || categoryColors.GENERAL;

            return (
              <div
                key={t.uuid || t.tokenNumber}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {t.tokenCode || `#${String(t.tokenNumber).padStart(2, '0')}`}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${colorClass}`}>
                        {t.serviceType || 'GENERAL'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                      {t.customerName}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500 font-medium">
                    ~{(idx + 1) * 3}m
                  </span>
                  {t.snoozeCount && t.snoozeCount > 0 ? (
                    <span className="block text-[10px] text-amber-600 font-medium">
                      Snoozed
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
