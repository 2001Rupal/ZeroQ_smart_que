'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Tv,
  Layers,
  Settings,
  Sparkles,
  ArrowRight,
  Clock,
  Volume2,
  PlusCircle,
  PhoneCall,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Store,
  ChevronRight
} from 'lucide-react';
import { seedDemoStore, getStoreBySlug, callNext, registerCustomer, getCachedStore } from '@/lib/api';
import { playChime } from '@/lib/chime';
import { useSocket } from '@/hooks/useSocket';

export default function HomePortal() {
  const [storeData, setStoreData] = useState<any>(null);
  const [counters, setCounters] = useState<any[]>([]);
  const [queueState, setQueueState] = useState<any>({
    activeServing: [],
    upcomingQueue: [],
    totalWaiting: 0
  });
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [callingCounterId, setCallingCounterId] = useState<string | null>(null);
  const [recentNotification, setRecentNotification] = useState<string | null>(null);

  // Walk-in modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCategory, setGuestCategory] = useState<'GENERAL' | 'BILLING' | 'PHARMACY' | 'PRIORITY'>('GENERAL');

  const loadData = async () => {
    try {
      const detail = await getStoreBySlug('express-store', false);
      if (detail?.store) {
        setStoreData(detail.store);
        setCounters((detail.counters || []).filter((c: any) => c.isActive !== false));
        setQueueState(detail.queueState);
      }
    } catch (e) {
      console.error('Failed to load store data:', e);
    }
  };

  useEffect(() => {
    // Instant paint from local cache
    const cached = getCachedStore('express-store', false);
    if (cached?.store) {
      setStoreData(cached.store);
      setCounters((cached.counters || []).filter((c: any) => c.isActive !== false));
      if (cached.queueState) setQueueState(cached.queueState);
    }
    loadData();
  }, []);

  // Real-time synchronization
  useSocket({
    storeId: storeData?._id,
    onQueueStateChanged: (newState) => {
      setQueueState(newState);
    },
    onTokenCalled: (callEvent) => {
      playChime();
      setRecentNotification(`Counter ${callEvent.counterNumber} called Token #${callEvent.tokenNumber}`);
      setTimeout(() => setRecentNotification(null), 4000);
      loadData();
    }
  });

  const handleQuickAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeData?.slug || !guestName.trim()) return;
    setIsAddingGuest(true);
    try {
      const phone = guestPhone.trim() || `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`;
      const res = await registerCustomer(storeData.slug, guestName.trim(), phone, guestCategory);
      setRecentNotification(`Issued Token ${res.tokenCode || `#${res.tokenNumber}`} (${guestCategory})`);
      setTimeout(() => setRecentNotification(null), 4000);
      
      setGuestName('');
      setGuestPhone('');
      setShowAddModal(false);

      const detail = await getStoreBySlug(storeData.slug);
      setQueueState(detail.queueState);
    } catch (e: any) {
      alert(e.message || 'Failed to add guest');
    } finally {
      setIsAddingGuest(false);
    }
  };

  const handleQuickCall = async (counterId: string, counterName: string) => {
    setCallingCounterId(counterId);
    try {
      const res = await callNext(counterId);
      if (res.token) {
        playChime();
        setRecentNotification(`${counterName} called Token #${res.token.tokenNumber}`);
        setTimeout(() => setRecentNotification(null), 4000);
      } else {
        setRecentNotification(`No customers waiting for ${counterName}`);
        setTimeout(() => setRecentNotification(null), 3000);
      }
      const detail = await getStoreBySlug(storeSlug);
      setQueueState(detail.queueState);
    } catch (e: any) {
      alert(e.message || 'Failed to call customer');
    } finally {
      setCallingCounterId(null);
    }
  };

  const storeSlug = storeData?.slug || 'express-store';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      
      {/* Toast Notification Banner */}
      {recentNotification && (
        <div role="status" aria-label="Live updates" className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>{recentNotification}</span>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Operations Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {storeData?.name || 'Express Health & Pharmacy'}
                </h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Online</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Live Multi-Counter Dispatch & Virtual Line Management
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Issue Walk-in Token</span>
            </button>

            <button
              onClick={() => playChime()}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5 shadow-2xs"
              title="Test audio chime"
            >
              <Volume2 className="w-4 h-4 text-slate-500" />
              <span>Chime</span>
            </button>

            <Link
              href={`/display/${storeSlug}`}
              target="_blank"
              className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5 shadow-2xs"
            >
              <Tv className="w-4 h-4 text-slate-500" />
              <span>Lounge Board</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Waiting in Queue</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 font-mono">
              {queueState?.totalWaiting || 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">visitors in line</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Stations</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1 font-mono">
              {counters.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">operational desks</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estimated Wait</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 font-mono">
              ~{Math.max(1, Math.ceil((queueState?.totalWaiting || 0) * 2.5))}m
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">average turnaround</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Turn Alert Sync</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
              Active
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">WhatsApp + Twilio SMS</p>
          </div>
        </div>

        {/* Two-Column Section: Active Counters & Upcoming Line */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Active Counter Stations (8 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Staff Counter Desks
              </h2>
              <span className="text-xs text-slate-500">
                Click station to open full operator console
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {counters.map((c: any) => {
                const serving = queueState?.activeServing?.find(
                  (item: any) => item.counterNumber === c.counterNumber
                );
                const isCalling = callingCounterId === c._id;

                return (
                  <div
                    key={c._id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800">
                          Counter {c.counterNumber}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          serving
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {serving ? 'Serving' : 'Idle'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{c.counterName}</p>

                      <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                        {serving ? (
                          <>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Guest</span>
                            <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                              {serving.tokenCode || `#${String(serving.tokenNumber).padStart(2, '0')}`}
                            </p>
                            <p className="text-xs text-slate-700 font-medium truncate mt-0.5">
                              {serving.customerName}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-400 py-2">Desk is ready</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleQuickCall(c._id, c.counterName)}
                        disabled={isCalling}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isCalling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />}
                        <span>Call Next</span>
                      </button>

                      <Link
                        href={`/staff/${c._id}`}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                        title="Open console"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Upcoming 5-Token Queue (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Next in Line ({queueState?.totalWaiting || 0})
              </h2>
              <Link
                href="/queue"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <span>View Full Queue</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              {queueState?.upcomingQueue?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">Queue is clear</p>
                  <p className="text-[11px] mt-0.5">New check-ins will appear live</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {queueState?.upcomingQueue?.map((token: any, idx: number) => {
                    const categoryColors: Record<string, string> = {
                      BILLING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      PHARMACY: 'bg-purple-50 text-purple-700 border-purple-200',
                      PRIORITY: 'bg-amber-50 text-amber-700 border-amber-200',
                      GENERAL: 'bg-blue-50 text-blue-700 border-blue-200'
                    };
                    const colorClass = categoryColors[token.serviceType] || categoryColors.GENERAL;

                    return (
                      <div key={token.uuid || token.tokenNumber} className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="text-sm font-bold font-mono text-slate-900">
                            {token.tokenCode || `#${String(token.tokenNumber).padStart(2, '0')}`}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 leading-tight">
                              {token.customerName}
                            </p>
                            <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold border ${colorClass}`}>
                              {token.serviceType || 'GENERAL'}
                            </span>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono text-slate-400">
                          ~{(idx + 1) * 3}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Manual Walk-In Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Issue Walk-in Ticket</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddGuest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visitor Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Category (Smart Routing)
                </label>
                <select
                  value={guestCategory}
                  onChange={(e: any) => setGuestCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GENERAL">General Consultation (A-xx)</option>
                  <option value="BILLING">Billing & Cashier (B-xx)</option>
                  <option value="PHARMACY">Pharmacy & Pickup (P-xx)</option>
                  <option value="PRIORITY">Priority / Senior Citizen (S-xx)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingGuest || !guestName.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                >
                  {isAddingGuest ? 'Issuing...' : 'Generate Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
