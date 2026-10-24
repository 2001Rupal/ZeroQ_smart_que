'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStoreBySlug, registerCustomer, getCachedStore } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import {
  Users,
  Clock,
  PlusCircle,
  Loader2,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function LiveVisitorsQueuePage() {
  const [storeData, setStoreData] = useState<any>(null);
  const [queueState, setQueueState] = useState<any>({
    activeServing: [],
    upcomingQueue: [],
    totalWaiting: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCategory, setGuestCategory] = useState<'GENERAL' | 'BILLING' | 'PHARMACY' | 'PRIORITY'>('GENERAL');
  const [isAdding, setIsAdding] = useState(false);

  const loadData = async () => {
    try {
      const data = await getStoreBySlug('express-store');
      setStoreData(data.store);
      setQueueState(data.queueState);
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = getCachedStore('express-store', false);
    if (cached?.store) {
      setStoreData(cached.store);
      if (cached.queueState) {
        setQueueState(cached.queueState);
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useSocket({
    storeId: storeData?._id,
    onQueueStateChanged: (newState) => {
      setQueueState(newState);
      loadData();
    }
  });

  const handleIssueTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setIsAdding(true);
    try {
      const phone = guestPhone.trim() || `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`;
      await registerCustomer('express-store', guestName.trim(), phone, guestCategory);
      setGuestName('');
      setGuestPhone('');
      setShowAddModal(false);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to issue ticket');
    } finally {
      setIsAdding(false);
    }
  };

  const filteredUpcoming = (queueState?.upcomingQueue || []).filter((token: any) => {
    const matchesSearch =
      token.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(token.tokenNumber).includes(searchQuery) ||
      (token.tokenCode && token.tokenCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' || token.serviceType === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Live Queue Line
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Real-time monitoring of all waiting visitors and ticket assignments.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Walk-in Visitor</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, token #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['ALL', 'GENERAL', 'BILLING', 'PHARMACY', 'PRIORITY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Services' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Active Serving Cards */}
        {queueState?.activeServing?.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Currently Serving at Stations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {queueState.activeServing.map((item: any) => (
                <div key={item.counterId} className="bg-white rounded-xl border border-emerald-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      Counter {item.counterNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Serving
                    </span>
                  </div>
                  <p className="text-lg font-bold font-mono text-slate-900">
                    {item.tokenCode || `#${String(item.tokenNumber).padStart(2, '0')}`}
                  </p>
                  <p className="text-xs text-slate-600 truncate mt-0.5">{item.customerName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Waiting Visitors ({filteredUpcoming.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              FIFO Sequence Order
            </span>
          </div>

          {filteredUpcoming.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No visitors found in this filter</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Tokens will appear automatically when customers check in</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredUpcoming.map((t: any, idx: number) => {
                const categoryColors: Record<string, string> = {
                  BILLING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  PHARMACY: 'bg-purple-50 text-purple-700 border-purple-200',
                  PRIORITY: 'bg-amber-50 text-amber-700 border-amber-200',
                  GENERAL: 'bg-blue-50 text-blue-700 border-blue-200'
                };
                const colorClass = categoryColors[t.serviceType] || categoryColors.GENERAL;

                return (
                  <div key={t.uuid || t.tokenNumber} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-7 text-center font-mono text-xs font-bold text-slate-400">
                        #{idx + 1}
                      </div>
                      <div className="text-base font-bold font-mono text-slate-900 w-16">
                        {t.tokenCode || `#${String(t.tokenNumber).padStart(2, '0')}`}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-900">{t.customerName}</p>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-semibold border ${colorClass}`}>
                            {t.serviceType || 'GENERAL'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          Position: {idx + 1} • Snoozed: {t.snoozeCount || 0} times
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                        ~{(idx + 1) * 3} mins
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Manual Issue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Visitor to Queue</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueTicket} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anjali Sharma"
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
                  Service Category
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
                  disabled={isAdding || !guestName.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                >
                  {isAdding ? 'Adding...' : 'Add to Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
