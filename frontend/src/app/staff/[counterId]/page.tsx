'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getCounterDetails,
  callNext,
  callNextBatch,
  snooze,
  complete,
  skip,
  registerCustomer
} from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { QueueSlidingWindow } from '@/components/QueueSlidingWindow';
import { CounterControlBar } from '@/components/CounterControlBar';
import { playChime } from '@/lib/chime';
import {
  Layers,
  Phone,
  Clock,
  CheckCircle2,
  PlusCircle,
  Loader2,
  Tv,
  ArrowRight,
  Building2,
  Users,
  Timer,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

export default function StaffCounterConsolePage() {
  const params = useParams();
  const router = useRouter();
  const counterId = params?.counterId as string;

  const [counterData, setCounterData] = useState<any>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [queueState, setQueueState] = useState<any>({
    activeServing: [],
    upcomingQueue: [],
    totalWaiting: 0
  });
  const [allCounters, setAllCounters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  // Elapsed service timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Quick walk-in modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCategory, setNewCustCategory] = useState<'GENERAL' | 'BILLING' | 'PHARMACY' | 'PRIORITY'>('GENERAL');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  const fetchDetails = async () => {
    if (!counterId) return;
    try {
      const data = await getCounterDetails(counterId);
      setCounterData(data.counter);
      setStoreData(data.store);
      setQueueState(data.queueState);
      setAllCounters(data.allCounters || []);
    } catch (err: any) {
      console.error('Failed to load counter:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [counterId]);

  // Real-time synchronization via Socket.io
  useSocket({
    storeId: storeData?._id,
    onQueueStateChanged: (newState) => {
      setQueueState(newState);
      fetchDetails();
    },
    onTokenCalled: (callEvent) => {
      if (callEvent.counterNumber === counterData?.counterNumber) {
        playChime();
      }
    }
  });

  // Real-time synchronization via Supabase PostgreSQL replication
  useSupabaseRealtime({
    storeId: storeData?._id,
    onQueueChanged: () => {
      fetchDetails();
    }
  });

  const activeToken = counterData?.currentServingToken;

  // Elapsed timer ticker
  useEffect(() => {
    if (!activeToken) {
      setElapsedSeconds(0);
      return;
    }

    if (activeToken.calledAt) {
      const started = new Date(activeToken.calledAt).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - started) / 1000)));
    } else {
      setElapsedSeconds(0);
    }

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeToken]);

  // Keyboard Shortcuts: Space (Call), S (Snooze), Enter (Complete), X (Skip)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.code === 'Space' && !activeToken && !actionLoading) {
        e.preventDefault();
        handleCallNext();
      } else if (e.key === 's' || e.key === 'S') {
        if (activeToken && !actionLoading) {
          e.preventDefault();
          handleSnooze();
        }
      } else if (e.code === 'Enter' && activeToken && !actionLoading) {
        e.preventDefault();
        handleComplete();
      } else if (e.key === 'x' || e.key === 'X') {
        if (activeToken && !actionLoading) {
          e.preventDefault();
          handleSkip();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeToken, actionLoading]);

  // Action Handlers
  const handleCallNext = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionType('call');
    setStatusMessage(null);

    try {
      const res = await callNext(counterId);
      if (res.token) {
        playChime();
        setStatusMessage({
          text: `Called Token ${res.token.tokenCode || `#${res.token.tokenNumber}`} (${res.token.customerName})`,
          type: 'success'
        });
      } else {
        setStatusMessage({
          text: 'No waiting visitors in the queue right now.',
          type: 'info'
        });
      }
      await fetchDetails();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to call next token', type: 'error' });
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  // Layer 2: Shopkeeper 1-Click Action (Call Next Batch, NO Pop-up)
  const handleCallBatch = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionType('batch');
    setStatusMessage(null);

    try {
      const res = await callNextBatch(counterId, 3);
      if (res.tokens && res.tokens.length > 0) {
        playChime();
        const codes = res.tokens.map((t: any) => t.tokenCode || `#${t.tokenNumber}`).join(', ');
        setStatusMessage({
          text: `Batch of ${res.tokens.length} called: ${codes}`,
          type: 'success'
        });
      } else {
        setStatusMessage({
          text: 'No waiting visitors in the queue to call in batch.',
          type: 'info'
        });
      }
      await fetchDetails();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to call next batch', type: 'error' });
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const handleSnooze = async () => {
    if (!activeToken || actionLoading) return;
    setActionLoading(true);
    setActionType('snooze');
    try {
      const res = await snooze(activeToken._id);
      setStatusMessage({
        text: `Token #${res.token.tokenNumber} shifted 2 spots back. Desk freed.`,
        type: 'info'
      });
      await fetchDetails();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to snooze token', type: 'error' });
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const handleComplete = async () => {
    if (!activeToken || actionLoading) return;
    setActionLoading(true);
    setActionType('complete');
    try {
      await complete(activeToken._id);
      setStatusMessage({
        text: `Consultation marked completed. Desk freed.`,
        type: 'success'
      });
      await fetchDetails();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to complete visit', type: 'error' });
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const handleSkip = async () => {
    if (!activeToken || actionLoading) return;
    setActionLoading(true);
    setActionType('skip');
    try {
      await skip(activeToken._id);
      setStatusMessage({
        text: `Visitor marked absent. Desk freed.`,
        type: 'info'
      });
      await fetchDetails();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to skip token', type: 'error' });
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !storeData?.slug) return;
    setIsAddingCustomer(true);
    try {
      const phone = newCustPhone.trim() || `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`;
      const res = await registerCustomer(storeData.slug, newCustName.trim(), phone, newCustCategory);
      setStatusMessage({
        text: `Created ticket ${res.tokenCode || `#${res.tokenNumber}`} (${newCustCategory})`,
        type: 'success'
      });
      setNewCustName('');
      setNewCustPhone('');
      setShowAddModal(false);
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to add customer');
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-xs font-semibold">Loading Counter Console...</p>
      </div>
    );
  }

  const storeSlug = storeData?.slug || 'express-store';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Top Console Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
              {counterData?.counterNumber || 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {counterData?.counterName}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {storeData?.name || 'Express Health & Pharmacy'}
              </p>
            </div>
          </div>

          {/* Quick Counter Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {allCounters.map((c) => (
                <button
                  key={c._id}
                  onClick={() => router.push(`/staff/${c._id}`)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    c._id === counterId
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Desk {c.counterNumber}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Walk-in</span>
            </button>
          </div>
        </div>

        {/* Status Feedback Banner */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Workstation 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Serving Ticket & Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Current Serving Ticket Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs text-center relative overflow-hidden">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Currently Serving
              </span>

              {activeToken ? (
                <div className="space-y-3 py-2">
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {activeToken.serviceType || 'GENERAL'} SERVICE
                  </div>

                  <div>
                    <h2 className="text-6xl sm:text-7xl font-extrabold font-mono text-slate-900 tracking-tight">
                      {activeToken.tokenCode || `#${String(activeToken.tokenNumber).padStart(2, '0')}`}
                    </h2>
                    <p className="text-lg font-bold text-slate-800 mt-1">
                      {activeToken.customerName}
                    </p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      {activeToken.customerPhone}
                    </p>
                  </div>

                  {/* Stopwatch Service Timer */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-slate-700">
                    <Timer className="w-4 h-4 text-slate-400" />
                    <span>Duration: {formatTimer(elapsedSeconds)}</span>
                  </div>
                </div>
              ) : (
                <div className="py-10 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No Active Visitor</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Counter is idle. Click <strong>Call Next</strong> or tap the spacebar to invite the next person in line.
                  </p>
                </div>
              )}
            </div>

            {/* Operator Control Bar */}
            <CounterControlBar
              onCallNext={handleCallNext}
              onCallBatch={handleCallBatch}
              onSnooze={handleSnooze}
              onComplete={handleComplete}
              onSkip={handleSkip}
              hasServingToken={Boolean(activeToken)}
              isLoading={actionLoading}
              actionType={actionType}
            />

          </div>

          {/* Right Column: Sliding Queue Window (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <QueueSlidingWindow
              upcomingTokens={queueState?.upcomingQueue || []}
              totalWaiting={queueState?.totalWaiting || 0}
            />
          </div>

        </div>

      </main>

      {/* Walk-in Customer Modal */}
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

            <form onSubmit={handleQuickAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visitor Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
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
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Category
                </label>
                <select
                  value={newCustCategory}
                  onChange={(e: any) => setNewCustCategory(e.target.value)}
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
                  disabled={isAddingCustomer || !newCustName.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                >
                  {isAddingCustomer ? 'Issuing...' : 'Generate Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
