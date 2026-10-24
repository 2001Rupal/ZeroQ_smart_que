'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { useTheme } from '@/context/ThemeContext';
import { Menu } from 'lucide-react';
import Link from 'next/link';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { theme, resolvedTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDisplayPage = pathname.startsWith('/display');
  const isCustomerPage = pathname.startsWith('/q/') || pathname.startsWith('/ticket/');

  // TV display and customer pages are full-screen without admin sidebar or shell padding
  if (isDisplayPage || isCustomerPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  const isLight = resolvedTheme === 'light';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#080c16] text-slate-100'
    } selection:bg-blue-600 selection:text-white`}>
      {/* Collapsible Left Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Mobile Top Header (only visible on mobile screens) */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-[#080c16] border-b border-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center">
            <span className="font-extrabold text-white text-base tracking-tight">ZeroQ</span>
          </Link>
        </div>

        <Link
          href="/q/express-store"
          className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
        >
          Take Ticket
        </Link>
      </header>

      {/* Main Content Area: dynamically padded according to sidebar width */}
      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <div className="min-h-screen w-full">
          {children}
        </div>
      </div>
    </div>
  );
};
