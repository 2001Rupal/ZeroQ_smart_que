'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStoreBySlug, registerCustomer, sendOTP, verifyOTP } from '@/lib/api';
import { usePersistentTicket } from '@/hooks/usePersistentTicket';
import {
  QrCode,
  Users,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Stethoscope,
  CreditCard,
  Pill,
  Star,
  Mail,
  Phone,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react';

export default function CustomerQREntryPage() {
  const params = useParams();
  const router = useRouter();
  const storeSlug = params?.storeSlug as string;

  const [storeData, setStoreData] = useState<any>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [serviceType, setServiceType] = useState<'GENERAL' | 'BILLING' | 'PHARMACY' | 'PRIORITY'>('GENERAL');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingStore, setIsFetchingStore] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Verification State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpChannel, setOtpChannel] = useState<'SMS' | 'EMAIL'>('SMS');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [mockOtpCode, setMockOtpCode] = useState<string | null>(null);

  const { savedTicket, saveTicket, isLoaded } = usePersistentTicket();

  // Channel detection: Email if contains '@' or looks like an email
  const isEmailMode = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim()) || contact.includes('@');
  const detectedChannel = contact.trim().length === 0 ? null : (isEmailMode ? 'EMAIL' : 'PHONE');

  useEffect(() => {
    if (!storeSlug) return;
    setIsFetchingStore(true);
    getStoreBySlug(storeSlug)
      .then((data) => {
        setStoreData(data);
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Store not found');
      })
      .finally(() => {
        setIsFetchingStore(false);
      });
  }, [storeSlug]);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const validateInputs = () => {
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 letters).');
      return false;
    }

    if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
      setErrorMessage('Name should contain only alphabets and spaces.');
      return false;
    }

    if (!trimmedContact) {
      setErrorMessage('Please enter your mobile phone number or email address.');
      return false;
    }

    if (isEmailMode) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedContact)) {
        setErrorMessage('Please enter a valid email address (e.g. name@example.com).');
        return false;
      }
    } else {
      const digitsOnly = trimmedContact.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        setErrorMessage('Please enter a valid 10-digit mobile number.');
        return false;
      }
    }

    setErrorMessage(null);
    return true;
  };

  // Step 1: User initiates ticket check-in -> sends OTP and opens modal
  const handleInitiateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsSendingOtp(true);
    setErrorMessage(null);
    setOtpError(null);

    const trimmedContact = contact.trim();

    try {
      const otpRes = await sendOTP(trimmedContact);
      setOtpChannel(otpRes.channel);
      setMockOtpCode(otpRes.mockCode || null);
      setShowOtpModal(true);
      setResendTimer(30);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpError(null);
    try {
      const otpRes = await sendOTP(contact.trim());
      setMockOtpCode(otpRes.mockCode || null);
      setResendTimer(30);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 3: Verify OTP and Issue Token Pass
  const handleVerifyAndIssueToken = async () => {
    const trimmedCode = otpCode.trim();
    if (!trimmedCode || trimmedCode.length < 4) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    const trimmedName = name.trim();
    const trimmedContact = contact.trim();

    try {
      // 1. Verify OTP
      const verifyRes = await verifyOTP(trimmedContact, trimmedCode);
      if (!verifyRes.success) {
        setOtpError(verifyRes.error || 'Invalid or expired verification code.');
        setIsVerifyingOtp(false);
        return;
      }

      // 2. Issue or Retrieve Token
      const res: any = await registerCustomer(
        storeSlug,
        trimmedName,
        trimmedContact,
        serviceType,
        trimmedCode
      );

      saveTicket(res.uuid, storeSlug, res.tokenNumber);
      setShowOtpModal(false);

      // Instant seamless redirect to live pass
      router.push(`/ticket/${res.uuid}`);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to complete verification and issue ticket.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const hasExistingTicketForStore =
    isLoaded && savedTicket && savedTicket.storeSlug === storeSlug;

  if (isFetchingStore) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-xs font-semibold">Loading Queue Check-In...</p>
      </div>
    );
  }

  const services = [
    {
      id: 'GENERAL',
      label: 'General Consultation',
      code: 'A-xx',
      desc: 'Doctor visit & inquiries',
      icon: Stethoscope,
      wait: '~5 mins'
    },
    {
      id: 'BILLING',
      label: 'Billing & Cashier',
      code: 'B-xx',
      desc: 'Invoices & payments',
      icon: CreditCard,
      wait: '~2 mins'
    },
    {
      id: 'PHARMACY',
      label: 'Pharmacy & Pickup',
      code: 'P-xx',
      desc: 'Medicines & refills',
      icon: Pill,
      wait: '~3 mins'
    },
    {
      id: 'PRIORITY',
      label: 'Priority / Senior Citizen',
      code: 'S-xx',
      desc: 'Expedited fast-track line',
      icon: Star,
      wait: 'Fastest'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between px-4 py-8 sm:p-8 font-sans">
      
      {/* Brand Header */}
      <div className="max-w-md w-full mx-auto text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
          <QrCode className="w-3.5 h-3.5" />
          <span>Self Check-in Pass</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {storeData?.store?.name || 'Express Health & Pharmacy'}
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Take your digital token pass. We'll send live alerts to your phone or email when your turn is called.
        </p>

        {/* Existing Active Ticket Recovery Banner */}
        {hasExistingTicketForStore && (
          <div className="mt-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-left">
            <div>
              <p className="text-xs font-bold text-slate-900">You have an active ticket</p>
              <p className="text-xs text-blue-700 font-mono font-semibold">Token #{savedTicket.tokenNumber}</p>
            </div>
            <button
              onClick={() => router.push(`/ticket/${savedTicket.tokenUuid}`)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
            >
              <span>View Pass</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Main Check-In Card */}
      <div className="max-w-md w-full mx-auto my-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
          
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleInitiateOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Chandra"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Omni-channel Contact Field (Phone or Email) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Mobile Number or Email Address
                </label>
                {detectedChannel === 'EMAIL' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 animate-fadeIn">
                    <Mail className="w-3 h-3 text-indigo-600" />
                    <span>Email Mode</span>
                  </span>
                )}
                {detectedChannel === 'PHONE' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-fadeIn">
                    <Phone className="w-3 h-3 text-blue-600" />
                    <span>SMS Mode</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {detectedChannel === 'EMAIL' ? (
                    <Mail className="w-4 h-4 text-indigo-500" />
                  ) : (
                    <Phone className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. 9876543210 or name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <p className="text-[11px] text-slate-500 mt-1">
                {detectedChannel === 'EMAIL' ? (
                  <span className="text-indigo-600 font-medium">
                    ✉️ Verification code & turn alerts will be sent directly to your email.
                  </span>
                ) : detectedChannel === 'PHONE' ? (
                  <span className="text-blue-600 font-medium">
                    📱 Verification OTP & turn alerts will be sent via SMS to your mobile.
                  </span>
                ) : (
                  <span>Enter a 10-digit mobile number for SMS or an email address for email alerts.</span>
                )}
              </p>
            </div>

            {/* Smart Category Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Service Category (Smart Routing)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {services.map((s) => {
                  const Icon = s.icon;
                  const isSelected = serviceType === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceType(s.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            {s.code}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {s.label}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          {s.desc}
                        </p>
                      </div>

                      <span className="text-[10px] font-semibold text-emerald-600 mt-2 block">
                        Wait: {s.wait}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSendingOtp || !name.trim() || !contact.trim()}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Sending {detectedChannel === 'EMAIL' ? 'Email' : 'SMS'} Verification...
                  </span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Verify & Get Token Pass</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Private & secure OTP verification. No app download required.</span>
          </div>

        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Verify {otpChannel === 'EMAIL' ? 'Email' : 'Mobile Number'}
                </h3>
              </div>
              <button
                onClick={() => setShowOtpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                We sent a 6-digit one-time verification code to{' '}
                <span className="font-semibold text-slate-900 font-mono">{contact.trim()}</span> via{' '}
                <span className="font-semibold text-blue-600">
                  {otpChannel === 'EMAIL' ? 'Email' : 'SMS'}
                </span>.
              </p>

              {otpError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              {mockOtpCode && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">Test Code:</span>
                    <span className="font-mono font-bold text-amber-950 bg-amber-200/80 px-1.5 py-0.5 rounded">{mockOtpCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(mockOtpCode)}
                    className="text-xs text-blue-700 underline font-semibold cursor-pointer hover:text-blue-900"
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  autoFocus
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full text-center tracking-[0.4em] font-mono text-2xl font-bold py-2.5 px-3 rounded-xl border-2 border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 bg-blue-50/20"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Didn't receive code?</span>
                <button
                  type="button"
                  disabled={resendTimer > 0 || isSendingOtp}
                  onClick={handleResendOtp}
                  className="font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:text-slate-400 flex items-center gap-1 cursor-pointer"
                >
                  {isSendingOtp ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleVerifyAndIssueToken}
                disabled={isVerifyingOtp || otpCode.trim().length < 4}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying & Issuing Pass...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Enter Queue</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-700 py-1"
              >
                Change Phone Number or Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 pb-2">
        Powered by ZeroQ Smart Virtual Queue Platform
      </footer>

    </div>
  );
}
