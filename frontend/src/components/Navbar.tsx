'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  QrCode,
  Smartphone,
  Layers,
  Tv,
  Settings,
  Home,
  ChevronDown,
  Menu,
  X,
  Volume2
} from 'lucide-react';
import { getStoreBySlug } from '@/lib/api';
import { playChime } from '@/lib/chime';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [counters, setCounters] = useState<any[]>([]);
  const [storeSlug, setStoreSlug] = useState('express-store');
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);

  useEffect(() => {
    getStoreBySlug('express-store')
      .then((data) => {
        if (data?.counters) setCounters(data.counters);
        if (data?.store?.slug) setStoreSlug(data.store.slug);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setStaffDropdownOpen(false);
  }, [pathname]);

  const isCustomerPage = pathname.startsWith('/q') || pathname.startsWith('/ticket');
  const isStaffPage = pathname.startsWith('/staff');
  const isDisplayPage = pathname.startsWith('/display');
  const isAdminPage = pathname.startsWith('/admin');
  const isHomePage = pathname === '/';

  // TV lounge display provides its own dedicated high-visibility integrated header
  if (isDisplayPage) {
    return null;
  }

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/30 group-hover:scale-105 transition">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-sm tracking-tight">
                  ZeroQ
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-700/60">
                  v2.0
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Segmented Navigation */}
          <nav className="hidden md:flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                isHomePage
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Overview
            </Link>

            <Link
              href={`/q/${storeSlug}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                isCustomerPage
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Pass</span>
            </Link>

            {/* Staff Desk Dropdown */}
            <div className="relative">
              <button
                onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isStaffPage
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Staff Desks</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {staffDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Select Active Desk
                  </div>
                  {counters.length > 0 ? (
                    counters.map((c) => (
                      <Link
                        key={c._id}
                        href={`/staff/${c._id}`}
                        className="block px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-blue-400 transition"
                      >
                        Station #{c.counterNumber}: {c.counterName}
                      </Link>
                    ))
                  ) : (
                    <Link
                      href="/staff/default"
                      className="block px-3 py-2 text-xs text-slate-400 hover:bg-slate-800"
                    >
                      Counter 1 Console
                    </Link>
                  )}
                </div>
              )}
            </div>

            <Link
              href={`/display/${storeSlug}`}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
            >
              <Tv className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lounge TV</span>
            </Link>

            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                isAdminPage
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          </nav>

          {/* Quick Chime & CTA on Desktop */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              onClick={() => playChime()}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
              title="Test chime sound"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            <Link
              href={`/q/${storeSlug}`}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-900/40 flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Take Ticket</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1 shadow-2xl">
            <Link
              href="/"
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold ${
                isHomePage ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>System Overview</span>
            </Link>

            <Link
              href={`/q/${storeSlug}`}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold ${
                isCustomerPage ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>Customer Mobile Pass</span>
            </Link>

            <div className="pt-2 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Staff Service Counters
            </div>
            {counters.map((c) => (
              <Link
                key={c._id}
                href={`/staff/${c._id}`}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-900"
              >
                <span>Station #{c.counterNumber}: {c.counterName}</span>
                <span className="text-[10px] text-blue-400 font-bold">Open Desk →</span>
              </Link>
            ))}

            <div className="pt-2 border-t border-slate-800 mt-2 space-y-1">
              <Link
                href={`/display/${storeSlug}`}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900"
              >
                <Tv className="w-4 h-4 text-indigo-400" />
                <span>Waiting Lounge TV Display</span>
              </Link>

              <Link
                href="/admin"
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  isAdminPage ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Admin & Standee Signage</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <Link
          href="/"
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold ${
            isHomePage ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </Link>

        <Link
          href={`/q/${storeSlug}`}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold ${
            isCustomerPage ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Smartphone className="w-4 h-4 mb-0.5" />
          <span>Pass</span>
        </Link>

        {counters[0] && (
          <Link
            href={`/staff/${counters[0]._id}`}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold ${
              isStaffPage ? 'text-blue-400' : 'text-slate-400'
            }`}
          >
            <Layers className="w-4 h-4 mb-0.5" />
            <span>Desk</span>
          </Link>
        )}

        <Link
          href={`/display/${storeSlug}`}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold ${
            isDisplayPage ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Tv className="w-4 h-4 mb-0.5" />
          <span>TV</span>
        </Link>

        <Link
          href="/admin"
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold ${
            isAdminPage ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Settings className="w-4 h-4 mb-0.5" />
          <span>Admin</span>
        </Link>
      </nav>
    </>
  );
};
