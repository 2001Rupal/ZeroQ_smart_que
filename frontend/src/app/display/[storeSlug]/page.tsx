'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStoreBySlug, getCachedStore } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { playChime, playTripleChime } from '@/lib/chime';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '@/context/ThemeContext';
import {
  Volume2,
  VolumeX,
  Users,
  Bell,
  Loader2,
  Maximize2,
  Tv,
  ArrowLeft,
  Clock,
  QrCode,
  Sun,
  Moon
} from 'lucide-react';

function PublicTVLoungeContent() {
  const params = useParams();
  const router = useRouter();
  const storeSlug = params?.storeSlug as string;
  const { resolvedTheme, setTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const [storeData, setStoreData] = useState<any>(null);
  const [counters, setCounters] = useState<any[]>([]);
  const [queueState, setQueueState] = useState<any>({
    activeServing: [],
    upcomingQueue: [],
    totalWaiting: 0
  });
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentlyCalledToken, setRecentlyCalledToken] = useState<number | null>(null);
  const [recentlyCalledCounter, setRecentlyCalledCounter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string>('');

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && storeSlug) {
      setQrUrl(`${window.location.origin}/q/${storeSlug}`);
    }
  }, [storeSlug]);

  const loadData = async () => {
    if (!storeSlug) return;
    try {
      // Only active counters on public TV display
      const data = await getStoreBySlug(storeSlug, false);
      setStoreData(data.store);
      // Double check active filter
      setCounters((data.counters || []).filter((c: any) => c.isActive !== false));
      setQueueState(data.queueState);
    } catch (err) {
      console.error('Failed to load store display data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (storeSlug) {
      const cached = getCachedStore(storeSlug, false);
      if (cached?.store) {
        setStoreData(cached.store);
        setCounters((cached.counters || []).filter((c: any) => c.isActive !== false));
        if (cached.queueState) setQueueState(cached.queueState);
        setIsLoading(false);
      }
    }
    loadData();
  }, [storeSlug]);

  useSocket({
    storeId: storeData?._id,
    onQueueStateChanged: (newState) => {
      setQueueState(newState);
      loadData();
    },
    onTokenCalled: (callEvent) => {
      setRecentlyCalledToken(callEvent.tokenNumber);
      setRecentlyCalledCounter(callEvent.counterNumber);
      if (soundEnabled) {
        playTripleChime();
      }
      setTimeout(() => {
        setRecentlyCalledToken(null);
        setRecentlyCalledCounter(null);
      }, 8000);
    }
  });

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-sans ${
        isLight ? 'bg-slate-50 text-slate-600' : 'bg-slate-950 text-slate-400'
      }`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-xs font-semibold uppercase tracking-wider">Connecting TV Board...</p>
      </div>
    );
  }

  const activeServing = queueState?.activeServing || [];
  const upcomingQueue = queueState?.upcomingQueue || [];

  return (
    <div className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 select-none font-sans transition-colors duration-150 ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* Top Header */}
      <header className={`flex items-center justify-between pb-4 border-b ${
        isLight ? 'border-slate-300/80 bg-slate-100' : 'border-slate-800 bg-slate-950'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Return to Portal"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal</span>
          </button>

          <div>
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <span className={isLight ? 'text-slate-900' : 'text-white'}>
                {storeData?.name || 'Express Health & Pharmacy'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                isLight
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-800'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>LIVE</span>
              </span>
            </h1>
            <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Public Lounge Display Board
            </p>
          </div>
        </div>

        {/* Clock & Controls */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`text-xl font-bold font-mono tracking-tight leading-none ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {currentTime}
            </div>
            <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {currentDate}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playChime();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                soundEnabled
                  ? isLight
                    ? 'bg-white border-emerald-500 text-emerald-700 shadow-2xs'
                    : 'bg-slate-900 border-emerald-700 text-emerald-400'
                  : isLight
                  ? 'bg-white border-slate-300 text-slate-500'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Chime sound is active' : 'Chime muted'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Chime On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Muted</span>
                </>
              )}
            </button>

            <button
              onClick={toggleFullScreen}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Board Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch py-4">
        
        {/* Left: Station Status Cards (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className={`text-xs font-bold uppercase tracking-wider font-mono ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}>
              Counter Stations
            </h2>
            <span className={`text-xs font-mono font-medium ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
              {counters.length} Active Stations
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 flex-1">
            {counters.map((c: any) => {
              const serving = activeServing.find(
                (item: any) => item.counterNumber === c.counterNumber
              );
              const isFreshCall =
                recentlyCalledCounter === c.counterNumber ||
                (serving && recentlyCalledToken === serving.tokenNumber);

              return (
                <div
                  key={c._id || c.counterNumber}
                  className={`rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between border ${
                    isLight
                      ? serving
                        ? isFreshCall
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500 shadow-md'
                          : 'border-blue-200 bg-white shadow-xs'
                        : 'border-slate-200 bg-white/70 opacity-75'
                      : serving
                      ? isFreshCall
                        ? 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-400/40'
                        : 'border-slate-800 bg-slate-900/90 shadow-lg'
                      : 'border-slate-900 bg-slate-900/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-bold font-mono ${
                      isLight ? 'text-slate-800' : 'text-slate-300'
                    }`}>
                      Counter {c.counterNumber}
                    </span>

                    {serving && isFreshCall ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white animate-pulse flex items-center gap-1 font-mono">
                        <Bell className="w-3 h-3" />
                        <span>NOW CALLING</span>
                      </span>
                    ) : serving ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        isLight
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        SERVING
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        isLight
                          ? 'bg-slate-100 text-slate-500 border border-slate-200'
                          : 'bg-slate-950 text-slate-500 border border-slate-800'
                      }`}>
                        IDLE
                      </span>
                    )}
                  </div>

                  <p className={`text-xs font-semibold mb-2 ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {c.counterName}
                  </p>

                  {/* Token details */}
                  {serving ? (
                    <div className="my-auto py-2 text-center">
                      <span className={`text-[10px] uppercase font-bold block mb-0.5 ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Token Code
                      </span>
                      <div className={`text-5xl font-black font-mono tracking-tight my-1 ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}>
                        {serving.tokenCode || `#${String(serving.tokenNumber).padStart(2, '0')}`}
                      </div>
                      <div className={`text-base font-bold truncate mt-1 ${
                        isLight ? 'text-slate-800' : 'text-slate-200'
                      }`}>
                        {serving.customerName}
                      </div>
                    </div>
                  ) : (
                    <div className="my-auto py-6 text-center text-slate-400">
                      <p className={`text-sm font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Desk Available
                      </p>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>
                        Awaiting next caller
                      </p>
                    </div>
                  )}

                  <div className={`mt-3 pt-2.5 border-t text-center text-[11px] font-semibold ${
                    isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
                  }`}>
                    {serving ? 'Please proceed to desk' : 'Ready'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Upcoming Queue & Scan-to-Join QR (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
          
          {/* Upcoming list */}
          <div className={`rounded-2xl border p-4 flex-1 shadow-2xs ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-slate-900/80 border-slate-800 text-slate-100'
          }`}>
            <div className={`flex items-center justify-between pb-2 mb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-slate-800'
            }`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-800' : 'text-slate-300'
              }`}>
                Next in Line
              </h3>
              <span className="text-xs font-mono font-bold text-blue-600">
                {queueState?.totalWaiting || 0} Waiting
              </span>
            </div>

            {upcomingQueue.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Users className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p>No waiting visitors</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingQueue.map((t: any, idx: number) => (
                  <div
                    key={t.uuid || t.tokenNumber}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-slate-950/70 border-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 text-center text-xs font-mono font-bold ${
                        isLight ? 'text-slate-500' : 'text-slate-500'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="text-sm font-bold font-mono">
                          {t.tokenCode || `#${String(t.tokenNumber).padStart(2, '0')}`}
                        </span>
                        <p className={`text-xs truncate mt-0.5 ${
                          isLight ? 'text-slate-600 font-medium' : 'text-slate-400'
                        }`}>
                          {t.customerName}
                        </p>
                      </div>
                    </div>

                    <span className={`text-xs font-mono font-medium ${
                      isLight ? 'text-slate-600' : 'text-slate-500'
                    }`}>
                      ~{(idx + 1) * 3}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* On-Screen QR Code */}
          <div className={`rounded-2xl border p-4 text-center space-y-3 shadow-2xs ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-slate-900/80 border-slate-800 text-white'
          }`}>
            <div>
              <p className="text-xs font-bold">Scan to Take a Ticket</p>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Receive SMS & turn alerts on your phone
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl inline-block mx-auto border border-slate-200 shadow-2xs">
              <QRCodeSVG value={qrUrl} size={130} level="M" />
            </div>

            <p className={`text-[11px] font-mono truncate ${
              isLight ? 'text-slate-500' : 'text-slate-500'
            }`}>
              {qrUrl}
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className={`pt-3 border-t text-center text-xs flex items-center justify-between ${
        isLight ? 'border-slate-300 text-slate-600' : 'border-slate-800 text-slate-500'
      }`}>
        <span>ZeroQ Smart Digital Signage System</span>
        <span>Audio announcement & turn chime enabled</span>
      </footer>

    </div>
  );
}

export default function PublicTVLoungePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center text-slate-500 font-sans">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <p className="text-xs font-semibold uppercase tracking-wider">Loading TV Lounge Screen...</p>
        </div>
      }
    >
      <PublicTVLoungeContent />
    </Suspense>
  );
}
