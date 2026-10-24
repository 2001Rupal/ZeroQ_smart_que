'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getCustomerStatus,
  cancelCustomerToken,
  customerHold,
  customerDone
} from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { CustomerTicketCard } from '@/components/CustomerTicketCard';
import { usePersistentTicket } from '@/hooks/usePersistentTicket';
import { Loader2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

function CustomerLiveTicketContent() {
  const params = useParams();
  const router = useRouter();
  const tokenUuid = params?.tokenUuid as string;

  const [ticketData, setTicketData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { clearTicket } = usePersistentTicket();

  const fetchStatus = async () => {
    if (!tokenUuid) return;
    try {
      const data = await getCustomerStatus(tokenUuid);
      setTicketData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ticket not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [tokenUuid]);

  // 1. Supabase Realtime Subscription (PostgreSQL WAL changes)
  useSupabaseRealtime({
    tokenUuid,
    onTokenUpdated: (supabaseToken) => {
      console.log('⚡ Received live Supabase update for pass:', supabaseToken.token_code);
      setTicketData((prev: any) => ({
        ...prev,
        status: supabaseToken.status,
        assignedCounter: supabaseToken.assigned_counter_name || prev?.assignedCounter,
        holdUntil: supabaseToken.hold_until
      }));
      // Re-fetch aggregated position ahead
      fetchStatus();
    }
  });

  // 2. Dual Fallback: Socket.io Real-time connection
  useSocket({
    tokenUuid,
    onTicketUpdated: (updatedTicket) => {
      setTicketData((prev: any) => ({
        ...prev,
        ...updatedTicket
      }));
    }
  });

  // Layer 1 Action: Customer Clicks "Done"
  const handleDoneTicket = async () => {
    setIsProcessing(true);
    try {
      await customerDone(tokenUuid);
      clearTicket();
      await fetchStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to complete visit');
    } finally {
      setIsProcessing(false);
    }
  };

  // Layer 1 Action: Customer Clicks "5 Min Hold"
  const handleHoldTicket = async () => {
    setIsProcessing(true);
    try {
      await customerHold(tokenUuid, 5);
      await fetchStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to apply 5-minute hold');
    } finally {
      setIsProcessing(false);
    }
  };

  // Layer 1 Action: Customer Clicks "Cancel"
  const handleCancelTicket = async () => {
    setIsProcessing(true);
    try {
      await cancelCustomerToken(tokenUuid);
      clearTicket();
      await fetchStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-xs font-semibold">Retrieving your queue ticket...</p>
      </div>
    );
  }

  if (errorMessage || !ticketData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Pass Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-5">
          {errorMessage || 'This ticket may have been expired or cancelled.'}
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-2xs cursor-pointer"
        >
          Return to Portal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2 mb-4">
        <button
          onClick={() => router.push('/')}
          className="text-slate-600 hover:text-slate-900 p-2 rounded-lg bg-white border border-slate-200 shadow-2xs transition cursor-pointer"
          title="Back to portal"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full shadow-2xs">
          Pass {ticketData.tokenCode || `#${ticketData.tokenNumber}`}
        </span>

        <button
          onClick={fetchStatus}
          title="Refresh ticket status"
          className="text-slate-600 hover:text-slate-900 p-2 rounded-lg bg-white border border-slate-200 shadow-2xs transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Live Ticket Card */}
      <div className="my-auto py-2">
        <CustomerTicketCard
          tokenNumber={ticketData.tokenNumber}
          tokenCode={ticketData.tokenCode}
          serviceType={ticketData.serviceType}
          customerName={ticketData.customerName}
          status={ticketData.status}
          peopleAhead={ticketData.peopleAhead}
          assignedCounter={ticketData.assignedCounter}
          assignedCounterNumber={ticketData.assignedCounterNumber}
          estimatedWaitMinutes={ticketData.estimatedWaitMinutes}
          holdUntil={ticketData.holdUntil}
          onDone={handleDoneTicket}
          onHold={handleHoldTicket}
          onCancel={handleCancelTicket}
          isProcessing={isProcessing}
        />
      </div>

      {/* Notice */}
      <div className="max-w-md w-full mx-auto pb-4 text-center">
        <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 shadow-2xs">
          You can safely minimize this screen. Turn alerts and progress updates are delivered via SMS & Supabase Realtime.
        </div>
      </div>
    </div>
  );
}

export default function CustomerLiveTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <p className="text-xs font-semibold">Loading Ticket Pass...</p>
        </div>
      }
    >
      <CustomerLiveTicketContent />
    </Suspense>
  );
}
