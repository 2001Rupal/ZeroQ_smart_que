'use client';

import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

export const ServerWarmingIndicator: React.FC = () => {
  const [isWarming, setIsWarming] = useState(false);
  const [justConnected, setJustConnected] = useState(false);

  useEffect(() => {
    const handleWarming = (e: any) => {
      const warmingState = Boolean(e?.detail?.isWarming);
      if (warmingState) {
        setIsWarming(true);
      } else if (isWarming) {
        setIsWarming(false);
        setJustConnected(true);
        setTimeout(() => setJustConnected(false), 2500);
      }
    };

    window.addEventListener('zeroq-server-warming', handleWarming);
    return () => {
      window.removeEventListener('zeroq-server-warming', handleWarming);
    };
  }, [isWarming]);

  if (!isWarming && !justConnected) {
    return null;
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
      {isWarming ? (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-amber-500/50 text-amber-300 shadow-xl backdrop-blur-md text-xs font-semibold animate-pulse">
          <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
          <span>Connecting to cloud server (waking up instance)...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-emerald-500/50 text-emerald-300 shadow-xl backdrop-blur-md text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Live Queue Server Connected</span>
        </div>
      )}
    </div>
  );
};
