'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getStoreBySlug,
  addCounter,
  updateCounter,
  deleteCounter,
  updateStoreSettings,
  seedDemoStore,
  getCachedStore
} from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  Layers,
  Settings,
  Plus,
  Trash2,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  MessageSquare,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Info,
  Edit2,
  Power,
  PowerOff,
  Eye,
  EyeOff
} from 'lucide-react';

export default function AdminManagementPage() {
  const [storeData, setStoreData] = useState<any>(null);
  const [counters, setCounters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'counters' | 'integrations' | 'standee'>('counters');

  // New counter state
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterDesc, setNewCounterDesc] = useState('');
  const [isAddingCounter, setIsAddingCounter] = useState(false);

  // Edit Counter Modal State
  const [editingCounter, setEditingCounter] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [isSavingCounter, setIsSavingCounter] = useState(false);

  // Settings
  const [snoozeOffset, setSnoozeOffset] = useState<number>(2);
  const [smsEnabled, setSmsEnabled] = useState<boolean>(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(true);
  const [walletBalance, setWalletBalance] = useState<number>(15.0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Standee details
  const [qrOrigin, setQrOrigin] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setQrOrigin(window.location.origin);
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Pass includeInactive = true for Admin management screen
      const res = await getStoreBySlug('express-store', true);
      setStoreData(res.store);
      setCounters(res.counters || []);

      if (res.store?.settings) {
        setSnoozeOffset(res.store.settings.snoozeOffset || 2);
        setSmsEnabled(res.store.settings.smsEnabled !== false);
        setWhatsappEnabled(res.store.settings.whatsappEnabled !== false);
        setWalletBalance(res.store.settings.walletBalance || 15.0);
      }
    } catch (e) {
      console.error('Failed to load admin store data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Instant paint from local cache
    const cached = getCachedStore('express-store', true);
    if (cached?.store) {
      setStoreData(cached.store);
      setCounters(cached.counters || []);
      if (cached.store?.settings) {
        setSnoozeOffset(cached.store.settings.snoozeOffset || 2);
        setSmsEnabled(cached.store.settings.smsEnabled !== false);
        setWhatsappEnabled(cached.store.settings.whatsappEnabled !== false);
        setWalletBalance(cached.store.settings.walletBalance || 15.0);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleAddCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounterName.trim()) return;

    setIsAddingCounter(true);
    try {
      await addCounter('express-store', newCounterName.trim(), newCounterDesc.trim());
      setNewCounterName('');
      setNewCounterDesc('');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to add counter');
    } finally {
      setIsAddingCounter(false);
    }
  };

  const openEditModal = (counter: any) => {
    setEditingCounter(counter);
    setEditName(counter.counterName || '');
    setEditDesc(counter.description || '');
    setEditActive(counter.isActive !== false);
  };

  const handleSaveCounterEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounter) return;

    setIsSavingCounter(true);
    try {
      await updateCounter('express-store', editingCounter._id, {
        counterName: editName.trim(),
        description: editDesc.trim(),
        isActive: editActive
      });
      setEditingCounter(null);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to update counter');
    } finally {
      setIsSavingCounter(false);
    }
  };

  const handleToggleActive = async (counter: any) => {
    const nextState = !counter.isActive;
    try {
      await updateCounter('express-store', counter._id, {
        isActive: nextState
      });
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle counter active state');
    }
  };

  const handleDeleteCounter = async (counterId: string) => {
    if (!confirm('Are you sure you want to delete this counter? It will be permanently removed.')) return;
    try {
      await deleteCounter('express-store', counterId);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to delete counter');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccess(false);
    try {
      await updateStoreSettings('express-store', {
        snoozeOffset,
        smsEnabled,
        whatsappEnabled,
        walletBalance
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const storeSlug = storeData?.slug || 'express-store';
  const customerQrUrl = qrOrigin ? `${qrOrigin}/q/${storeSlug}` : `/q/${storeSlug}`;

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(customerQrUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const activeCount = counters.filter(c => c.isActive !== false).length;
  const inactiveCount = counters.filter(c => c.isActive === false).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Settings & Administration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage counter stations, omnichannel turn alert APIs, and printable standees.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Reset demo queue to clean state with 3 active counters & sample visitors?')) {
                  seedDemoStore().then(() => loadData());
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              Reset Demo Store
            </button>
            <Link
              href={`/q/${storeSlug}`}
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
            >
              <span>Test Customer Pass</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('counters')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px flex items-center gap-2 cursor-pointer ${
              activeTab === 'counters'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Counter Stations ({counters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px flex items-center gap-2 cursor-pointer ${
              activeTab === 'integrations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp & SMS Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('standee')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px flex items-center gap-2 cursor-pointer ${
              activeTab === 'standee'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print QR Standee</span>
          </button>
        </div>

        {/* TAB 1: COUNTER MANAGEMENT */}
        {activeTab === 'counters' && (
          <div className="space-y-6">
            
            {/* Add Counter Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Create New Counter Station</h2>
              <p className="text-xs text-slate-500 mb-4">
                Add an operator desk. You can adjust its name, description, or mark it inactive anytime.
              </p>

              <form onSubmit={handleAddCounter} className="space-y-3 max-w-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Counter Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Counter 4 - Express Billing"
                      value={newCounterName}
                      onChange={(e) => setNewCounterName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Card & online payments"
                      value={newCounterDesc}
                      onChange={(e) => setNewCounterDesc(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAddingCounter || !newCounterName.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingCounter ? 'Adding...' : 'Add Station'}</span>
                </button>
              </form>
            </div>

            {/* Counters Overview Header */}
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1">
              <span>{activeCount} Active Stations (visible in app & lounge board) • {inactiveCount} Inactive (hidden)</span>
            </div>

            {/* Existing Counters List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Configured Stations ({counters.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Inactive stations are hidden from staff and TV lounge boards
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {counters.map((c) => {
                  const isActive = c.isActive !== false;
                  return (
                    <div
                      key={c._id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        !isActive ? 'bg-slate-50/70 opacity-75' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-9 h-9 rounded-lg font-bold flex items-center justify-center text-sm border shrink-0 ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {c.counterNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-bold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                              {c.counterName}
                            </p>
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <EyeOff className="w-3 h-3 text-amber-600" />
                                Inactive (Hidden Everywhere)
                              </span>
                            )}
                          </div>

                          {c.description && (
                            <p className="text-xs text-slate-600 mt-0.5">
                              {c.description}
                            </p>
                          )}

                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {c.currentServingToken
                              ? `Serving Token #${c.currentServingToken.tokenNumber}`
                              : 'No active customer at desk'}
                          </p>
                        </div>
                      </div>

                      {/* Station Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                          title="Edit Counter Name & Description"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>

                        {/* Toggle Active Button */}
                        <button
                          onClick={() => handleToggleActive(c)}
                          className={`px-2.5 py-1.5 rounded-md border text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                            isActive
                              ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800'
                              : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                          }`}
                          title={isActive ? 'Mark inactive to hide from everywhere' : 'Activate counter station'}
                        >
                          {isActive ? (
                            <>
                              <EyeOff className="w-3 h-3 text-amber-600" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>

                        {/* Open Console if Active */}
                        {isActive && (
                          <Link
                            href={`/staff/${c._id}`}
                            className="px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                          >
                            Console
                          </Link>
                        )}

                        {/* Delete Counter */}
                        <button
                          onClick={() => handleDeleteCounter(c._id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Permanently delete counter station"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WHATSAPP & SMS SETUP */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {/* Step-by-Step Practical Setup Guide */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span>How to Get WhatsApp Cloud API & Twilio Setup</span>
              </div>
              <div className="text-xs text-blue-950 space-y-2 leading-relaxed">
                <p>
                  <strong>1. Meta WhatsApp Cloud API (Free 1,000 conversations/month):</strong>
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                  <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">developers.facebook.com</a> and create a Meta Business App.</li>
                  <li>Add the <strong>WhatsApp</strong> product to your app.</li>
                  <li>In <em>WhatsApp &gt; API Setup</em>, copy your <strong>Phone Number ID</strong> and generate a <strong>System User Permanent Access Token</strong>.</li>
                  <li>Create a message template named <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-700 font-mono">queue_turn_alert</code> with 3 variables: <em>Customer Name, Token Number, Counter Name</em>.</li>
                  <li>Paste the credentials into <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">backend/.env</code>.</li>
                </ol>

                <p className="pt-2">
                  <strong>2. Twilio SMS Fallback (Pay-as-you-go):</strong>
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                  <li>Create a free account on <a href="https://www.twilio.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">twilio.com</a>.</li>
                  <li>From the Console dashboard, copy your <strong>Account SID</strong> and <strong>Auth Token</strong>.</li>
                  <li>Buy an active SMS-capable phone number and add it as <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">TWILIO_PHONE_NUMBER</code> in <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">backend/.env</code>.</li>
                </ol>
              </div>
            </div>

            {/* Notification Settings Form */}
            <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Notification Channel Toggles & Tenant Wallet
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">WhatsApp Cloud API Alerts</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Primary delivery channel for turn notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Carrier SMS Fallback (Twilio)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Triggers if WhatsApp delivery fails ($0.25/SMS)</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Snooze Slot Offset
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={snoozeOffset}
                    onChange={(e) => setSnoozeOffset(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Number of positions displaced when staff clicks Snooze (+2)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tenant SMS Balance ($)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={walletBalance}
                    onChange={(e) => setWalletBalance(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Deducted when Twilio carrier SMS failover is used</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {saveSuccess ? (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Settings updated successfully</span>
                  </span>
                ) : <span />}

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: PRINTABLE QR STANDEE */}
        {activeTab === 'standee' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">On-Premise Counter Standee Poster</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Print and place on entrance acrylic standees or service counters so walk-in customers can take a ticket.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyUrlToClipboard}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied' : 'Copy URL'}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Standee</span>
                </button>
              </div>
            </div>

            {/* Print Container Preview */}
            <div className="flex justify-center">
              <div
                id="qr-standee-poster"
                className="w-full max-w-md bg-white border border-slate-300 rounded-2xl p-8 text-center shadow-md space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Zero Waiting in Line</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {storeData?.name || 'Express Health & Pharmacy'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Scan with your phone camera to take your digital token pass.
                  </p>
                </div>

                {/* QR Code */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 inline-block shadow-inner">
                  <QRCodeSVG
                    value={customerQrUrl}
                    size={220}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">No App Download Needed</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {customerQrUrl}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-400 font-medium">Step 1</p>
                    <p className="text-xs font-bold text-slate-800">Scan QR</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-400 font-medium">Step 2</p>
                    <p className="text-xs font-bold text-slate-800">Get Pass</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-400 font-medium">Step 3</p>
                    <p className="text-xs font-bold text-slate-800">Turn Alert</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* EDIT COUNTER MODAL */}
      {editingCounter && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Counter #{editingCounter.counterNumber}
              </h3>
              <button
                onClick={() => setEditingCounter(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCounterEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Station Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Station Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Primary cashier and insurance billing desk"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Active / Inactive Toggle */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">Counter Status</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {editActive
                      ? 'Active: Appears on staff sidebar, dashboard, and TV board'
                      : 'Inactive: Hidden everywhere except this admin screen'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    editActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {editActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCounter(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCounter || !editName.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCounter ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
