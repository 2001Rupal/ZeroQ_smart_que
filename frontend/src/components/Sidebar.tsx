'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Smartphone,
  Layers,
  Tv,
  Settings,
  Home,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ExternalLink
} from 'lucide-react';
import { getStoreBySlug } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) => {
  const pathname = usePathname();
  const [counters, setCounters] = useState<any[]>([]);
  const [storeSlug, setStoreSlug] = useState('express-store');
  const [storeId, setStoreId] = useState<string | null>(null);

  const fetchCounters = () => {
    getStoreBySlug('express-store', false)
      .then((data) => {
        if (data?.counters) {
          // Ensure only active counters display in sidebar
          setCounters(data.counters.filter((c: any) => c.isActive !== false));
        }
        if (data?.store?.slug) setStoreSlug(data.store.slug);
        if (data?.store?._id) setStoreId(data.store._id);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCounters();
  }, [pathname]);

  useSocket({
    storeId: storeId || undefined,
    onQueueStateChanged: () => {
      fetchCounters();
    }
  });

  const isDisplayPage = pathname.startsWith('/display');

  // Completely hide sidebar on TV Lounge display for pure fullscreen presentation
  if (isDisplayPage) {
    return null;
  }

  const isHome = pathname === '/';
  const isQueue = pathname === '/queue';
  const isAdmin = pathname.startsWith('/admin');

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar - Permanently Dark Theme with Crystal-Clear High Contrast */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0b101b] border-r border-slate-800 text-slate-100 shadow-xl transition-all duration-200 select-none ${
          collapsed ? 'w-16' : 'w-60'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-800 bg-[#0b101b]">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center overflow-hidden focus:outline-none focus:ring-0 outline-none select-none"
          >
            {!collapsed ? (
              <div className="flex flex-col truncate">
                <span className="brand-title font-extrabold text-base tracking-tight text-white leading-tight">
                  ZeroQ
                </span>
                <span className="brand-sub text-[10px] text-slate-400 font-medium truncate">
                  Smart Queue System
                </span>
              </div>
            ) : (
              <span className="brand-title font-extrabold text-sm text-white px-1">
                ZeroQ
              </span>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          
          {/* Section 1: WORKSPACE */}
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="section-title px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Workspace
              </p>
            )}

            <Link
              href="/"
              onClick={onCloseMobile}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition ${
                isHome
                  ? 'active-blue bg-blue-600/25 text-white border border-blue-500/50 shadow-xs'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Overview"
            >
              <Home className={`w-4 h-4 shrink-0 ${isHome ? 'text-blue-400' : 'text-slate-400'}`} />
              {!collapsed && <span>Overview</span>}
            </Link>

            <Link
              href="/queue"
              onClick={onCloseMobile}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition ${
                isQueue
                  ? 'active-blue bg-blue-600/25 text-white border border-blue-500/50 shadow-xs'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Live Queue"
            >
              <Users className={`w-4 h-4 shrink-0 ${isQueue ? 'text-blue-400' : 'text-slate-400'}`} />
              {!collapsed && <span>Live Queue</span>}
            </Link>
          </div>

          {/* Section 2: COUNTER DESKS (Active Only) */}
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="section-title px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Counter Desks
              </p>
            )}

            {counters.map((c) => {
              const isActive = pathname === `/staff/${c._id}`;
              return (
                <Link
                  key={c._id}
                  href={`/staff/${c._id}`}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'active-emerald bg-emerald-600/25 text-white border border-emerald-500/50 shadow-xs'
                      : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
                  }`}
                  title={c.counterName}
                >
                  <Layers className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {!collapsed && (
                    <span className="truncate">
                      Counter {c.counterNumber} - {c.counterName}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Section 3: PORTALS */}
          <div className="pt-1 border-t border-slate-800 space-y-0.5">
            {!collapsed && (
              <p className="section-title px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Portals
              </p>
            )}

            <Link
              href={`/display/${storeSlug}`}
              target="_blank"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition"
              title="Open Public TV Display"
            >
              <div className="flex items-center gap-2.5">
                <Tv className="w-3.5 h-3.5 text-slate-400" />
                {!collapsed && <span>Lounge TV Board</span>}
              </div>
              {!collapsed && <ExternalLink className="w-3 h-3 text-slate-500" />}
            </Link>

            <Link
              href={`/q/${storeSlug}`}
              target="_blank"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition"
              title="Open Customer QR Pass"
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                {!collapsed && <span>Customer Pass</span>}
              </div>
              {!collapsed && <ExternalLink className="w-3 h-3 text-slate-500" />}
            </Link>
          </div>

        </div>

        {/* Footer: DOCKED SETTINGS TAB (Replaced Appearance as requested) */}
        <div className="p-2.5 border-t border-slate-800 bg-[#080d16]">
          <Link
            href="/admin"
            onClick={onCloseMobile}
            className={`flex items-center rounded-lg text-xs font-semibold transition ${
              collapsed
                ? 'justify-center p-2'
                : 'gap-2.5 px-2.5 py-2'
            } ${
              isAdmin
                ? 'active-blue bg-blue-600/25 text-white border border-blue-500/50 shadow-xs'
                : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Settings"
          >
            <Settings className={`w-4 h-4 shrink-0 ${isAdmin ? 'text-blue-400' : 'text-slate-400'}`} />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </aside>
    </>
  );
};
