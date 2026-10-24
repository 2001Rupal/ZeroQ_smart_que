'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Users,
  Bell,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  PauseCircle,
  XCircle,
  Loader2,
  Hourglass
} from 'lucide-react';

export type TicketStatus =
  | 'WAITING'
  | 'CALLED'
  | 'SERVING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'EXPIRED';

interface CustomerTicketCardProps {
  tokenNumber: number;
  tokenCode?: string;
  serviceType?: string;
  priority?: boolean;
  customerName: string;
  status: TicketStatus;
  peopleAhead: number;
  assignedCounter: string | null;
  assignedCounterNumber: number | null;
  estimatedWaitMinutes: number;
  holdUntil?: string | Date | null;
  storeName?: string;
  onDone?: () => Promise<void> | void;
  onHold?: () => Promise<void> | void;
  onCancel?: () => Promise<void> | void;
  isProcessing?: boolean;
}

export const CustomerTicketCard: React.FC<CustomerTicketCardProps> = ({
  tokenNumber,
  tokenCode,
  serviceType,
  customerName,
  status,
  peopleAhead,
  assignedCounter,
  assignedCounterNumber,
  estimatedWaitMinutes,
  holdUntil,
  storeName,
  onDone,
  onHold,
  onCancel,
  isProcessing
}) => {
  // Modal state for Confirmation Pop-ups (Layer 1)
  const [activeModal, setActiveModal] = useState<'DONE' | 'HOLD' | 'CANCEL' | null>(null);

  // Trigger vibration when CALLED
  useEffect(() => {
    if (status === 'CALLED' || status === 'SERVING') {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([250, 100, 250]);
        } catch (e) {
          // Vibration not permitted without user gesture
        }
      }
    }
  }, [status]);

  const isCalled = status === 'CALLED';
  const isServing = status === 'SERVING';
  const isCompleted = status === 'COMPLETED';
  const isWaiting = status === 'WAITING';
  const isExpired = status === 'EXPIRED';
  const isCancelled = status === 'CANCELLED';

  const categoryLabels: Record<string, string> = {
    BILLING: 'Billing & Cashier',
    PHARMACY: 'Pharmacy & Pickup',
    PRIORITY: 'Priority / Senior Citizen',
    GENERAL: 'General Consultation'
  };

  const displayCode = tokenCode || `#${String(tokenNumber).padStart(2, '0')}`;

  const handleConfirmAction = async () => {
    if (activeModal === 'DONE' && onDone) {
      await onDone();
    } else if (activeModal === 'HOLD' && onHold) {
      await onHold();
    } else if (activeModal === 'CANCEL' && onCancel) {
      await onCancel();
    }
    setActiveModal(null);
  };

  return (
    <div className="w-full max-w-sm mx-auto relative">
      {/* Turn Alert Banner */}
      {isCalled && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-600 text-white shadow-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">It's Your Turn!</h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              Please proceed to{' '}
              <span className="font-bold underline">
                {assignedCounter || `Counter #${assignedCounterNumber || 1}`}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Main Digital Ticket Pass */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        
        {/* Pass Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700 block">
              {storeName || 'Digital Queue Pass'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {categoryLabels[serviceType || 'GENERAL'] || 'General Service'}
            </span>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
              isCalled
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : isServing
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : isCompleted
                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                : isExpired
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : isCancelled
                ? 'bg-slate-100 text-slate-500'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}
          >
            {isCalled ? 'Now Serving' : isExpired ? 'Expired' : status}
          </span>
        </div>

        {/* Hero Token Number */}
        <div className="px-6 py-7 text-center bg-white">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Your Token Code
          </p>
          <div className="my-1.5">
            <span className="text-6xl font-black font-mono tracking-tight text-slate-900">
              {displayCode}
            </span>
          </div>
          <p className="text-base font-bold text-slate-800">
            {customerName}
          </p>
        </div>

        {/* Perforated Divider */}
        <div className="relative my-0.5">
          <div className="ticket-notch-left border-r border-slate-200 bg-slate-50" />
          <div className="ticket-notch-right border-l border-slate-200 bg-slate-50" />
          <div className="border-t border-dashed border-slate-200 mx-5" />
        </div>

        {/* Live Metrics & Actions Area */}
        <div className="p-5 bg-slate-50/60">
          
          {/* Waiting Metrics */}
          {isWaiting && (
            <>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                  <div className="flex items-center justify-center gap-1 text-xs font-medium text-slate-600 mb-0.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>People Ahead</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-slate-900">
                    {peopleAhead}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {peopleAhead === 0 ? "You're next!" : 'in line'}
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                  <div className="flex items-center justify-center gap-1 text-xs font-medium text-slate-600 mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Est. Wait</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-slate-900">
                    ~{estimatedWaitMinutes}m
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">approx. time</p>
                </div>
              </div>

              {holdUntil && (
                <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <Hourglass className="w-4 h-4 shrink-0 text-amber-600 animate-spin" />
                  <span>Your pass is on <strong>5-minute hold</strong>. It will reactivate shortly.</span>
                </div>
              )}
            </>
          )}

          {/* Called / Serving Station */}
          {(isCalled || isServing) && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center mb-4">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Assigned Counter Station
              </p>
              <p className="text-xl font-bold text-emerald-950 mt-0.5">
                {assignedCounter || `Counter #${assignedCounterNumber || 1}`}
              </p>
              <p className="text-xs text-emerald-700 mt-1 font-medium">
                Please proceed directly to the desk
              </p>
            </div>
          )}

          {/* Expired Notice */}
          {isExpired && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center mb-4">
              <XCircle className="w-6 h-6 text-rose-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-rose-900">Pass Expired</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                This token was marked expired due to inactivity. Please scan the QR code again for a new pass.
              </p>
            </div>
          )}

          {/* Completed Notice */}
          {isCompleted && (
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-800">Service Completed</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Thank you for visiting today.</p>
            </div>
          )}

          {/* ======================================================== */}
          {/* Layer 1: Customer Action Buttons ("Done" / "5 Min Hold" / "Cancel") */}
          {/* ======================================================== */}
          {!isCompleted && !isExpired && !isCancelled && (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                
                {/* 1. "Done" Action (Available during Called/Serving or Waiting) */}
                <button
                  type="button"
                  onClick={() => setActiveModal('DONE')}
                  disabled={isProcessing}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>

                {/* 2. "5 Min Hold" Action */}
                <button
                  type="button"
                  onClick={() => setActiveModal('HOLD')}
                  disabled={isProcessing}
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>5 Min Hold</span>
                </button>

                {/* 3. "Cancel" Action */}
                <button
                  type="button"
                  onClick={() => setActiveModal('CANCEL')}
                  disabled={isProcessing}
                  className="py-2 px-3 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer active:scale-95"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>

              <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Supabase / Socket Realtime Connected</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* Confirmation Pop-up Modal (Layer 1 Hierarchy) */}
      {/* ======================================================== */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150">
            
            {/* Modal Icon */}
            {activeModal === 'DONE' && (
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            )}
            {activeModal === 'HOLD' && (
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-3">
                <Clock className="w-6 h-6" />
              </div>
            )}
            {activeModal === 'CANCEL' && (
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
            )}

            {/* Modal Title & Body */}
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {activeModal === 'DONE' && 'Mark Visit as Done?'}
              {activeModal === 'HOLD' && 'Take a 5-Minute Hold?'}
              {activeModal === 'CANCEL' && 'Cancel Queue Pass?'}
            </h3>

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {activeModal === 'DONE' &&
                'Are you finished at the counter? This will complete your token transaction and release your turn.'}
              {activeModal === 'HOLD' &&
                'Need a few minutes? This puts your pass on hold for 5 minutes and shifts your spot 2 places back in line.'}
              {activeModal === 'CANCEL' &&
                'Are you sure you want to leave the queue? You will permanently lose your position in line.'}
            </p>

            {/* Modal Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                Go Back
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isProcessing}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeModal === 'DONE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : activeModal === 'HOLD'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <span>Yes, Confirm</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
