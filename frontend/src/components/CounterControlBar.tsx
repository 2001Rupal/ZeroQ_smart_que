'use client';

import React from 'react';
import { PhoneCall, Users, Clock, CheckCircle2, UserX, Loader2 } from 'lucide-react';

interface CounterControlBarProps {
  onCallNext: () => void;
  onCallBatch?: () => void;
  onSnooze: () => void;
  onComplete: () => void;
  onSkip: () => void;
  hasServingToken: boolean;
  isLoading: boolean;
  actionType: string | null;
}

export const CounterControlBar: React.FC<CounterControlBarProps> = ({
  onCallNext,
  onCallBatch,
  onSnooze,
  onComplete,
  onSkip,
  hasServingToken,
  isLoading,
  actionType
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Counter Actions
        </h3>
        <span className="text-xs font-medium flex items-center gap-1.5">
          {hasServingToken ? (
            <span className="text-amber-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Serving in Progress
            </span>
          ) : (
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ready for Next
            </span>
          )}
        </span>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        
        {/* 1. CALL NEXT BUTTON (1-Click, Single) */}
        <button
          type="button"
          onClick={onCallNext}
          disabled={isLoading || hasServingToken}
          title={hasServingToken ? 'Complete current token first' : 'Call next customer in line (Spacebar)'}
          className={`flex flex-col items-center justify-between p-3 rounded-xl transition cursor-pointer h-24 text-center border ${
            hasServingToken
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs font-semibold active:scale-[0.98]'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5 mt-1">
            {isLoading && actionType === 'call' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <PhoneCall className={`w-5 h-5 ${hasServingToken ? 'text-slate-400' : 'text-white'}`} />
            )}
            <span className="text-xs font-bold tracking-tight">Call Next</span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            hasServingToken ? 'bg-slate-200 text-slate-500' : 'bg-emerald-700 text-white'
          }`}>
            Space
          </span>
        </button>

        {/* 2. LAYER 2: CALL NEXT BATCH BUTTON (1-Click Action, NO Pop-up) */}
        <button
          type="button"
          onClick={onCallBatch}
          disabled={isLoading}
          title="1-Click Action: Atomically call the next batch of 3 waiting customers"
          className="flex flex-col items-center justify-between p-3 rounded-xl transition cursor-pointer h-24 text-center border bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-2xs font-semibold active:scale-[0.98]"
        >
          <div className="flex flex-col items-center gap-1.5 mt-1">
            {isLoading && actionType === 'batch' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Users className="w-5 h-5 text-white" />
            )}
            <span className="text-xs font-bold tracking-tight leading-tight">Call Next Batch</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-700 text-white">
            Batch of 3
          </span>
        </button>

        {/* 3. SNOOZE (+2) BUTTON */}
        <button
          type="button"
          onClick={onSnooze}
          disabled={isLoading || !hasServingToken}
          title={!hasServingToken ? 'No active token to snooze' : 'Shift customer 2 positions back'}
          className={`flex flex-col items-center justify-between p-3 rounded-xl transition cursor-pointer h-24 text-center border ${
            !hasServingToken
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-2xs font-semibold active:scale-[0.98]'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5 mt-1">
            {isLoading && actionType === 'snooze' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Clock className={`w-5 h-5 ${!hasServingToken ? 'text-slate-400' : 'text-white'}`} />
            )}
            <span className="text-xs font-bold tracking-tight">Snooze (+2)</span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            !hasServingToken ? 'bg-slate-200 text-slate-500' : 'bg-amber-600 text-white'
          }`}>
            Key: S
          </span>
        </button>

        {/* 4. COMPLETE BUTTON */}
        <button
          type="button"
          onClick={onComplete}
          disabled={isLoading || !hasServingToken}
          title={!hasServingToken ? 'No active token to complete' : 'Mark visit completed (Enter)'}
          className={`flex flex-col items-center justify-between p-3 rounded-xl transition cursor-pointer h-24 text-center border ${
            !hasServingToken
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-2xs font-semibold active:scale-[0.98]'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5 mt-1">
            {isLoading && actionType === 'complete' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <CheckCircle2 className={`w-5 h-5 ${!hasServingToken ? 'text-slate-400' : 'text-white'}`} />
            )}
            <span className="text-xs font-bold tracking-tight">Complete</span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            !hasServingToken ? 'bg-slate-200 text-slate-500' : 'bg-blue-700 text-white'
          }`}>
            Enter ↵
          </span>
        </button>

        {/* 5. SKIP / ABSENT BUTTON */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isLoading || !hasServingToken}
          title={!hasServingToken ? 'No active token to skip' : 'Mark visitor as absent (X)'}
          className={`flex flex-col items-center justify-between p-3 rounded-xl transition cursor-pointer h-24 text-center border ${
            !hasServingToken
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              : 'bg-white hover:bg-rose-50 text-rose-600 border-rose-300 shadow-2xs font-semibold active:scale-[0.98]'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5 mt-1">
            {isLoading && actionType === 'skip' ? (
              <Loader2 className="w-5 h-5 animate-spin text-rose-600" />
            ) : (
              <UserX className={`w-5 h-5 ${!hasServingToken ? 'text-slate-400' : 'text-rose-600'}`} />
            )}
            <span className="text-xs font-bold tracking-tight">Skip / Absent</span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            !hasServingToken ? 'bg-slate-200 text-slate-500' : 'bg-rose-100 text-rose-700'
          }`}>
            Key: X
          </span>
        </button>

      </div>
    </div>
  );
};
