import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { ThemeProvider } from '@/context/ThemeContext';
import { PwaPrompt } from '@/components/PwaPrompt';
import { ServerWarmingIndicator } from '@/components/ServerWarmingIndicator';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ZeroQ | Smart Queue & Token Management System',
  description:
    'Real-time enterprise virtual queue management system with smart category routing, live turn synchronization, and omnichannel alerts.',
  applicationName: 'ZeroQ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZeroQ'
  },
  formatDetection: {
    telephone: true
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  keywords: [
    'ZeroQ',
    'smart queue management system',
    'virtual queue',
    'qr queue',
    'token system'
  ]
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0b101b'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden">
        <ThemeProvider>
          <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
            <AppShell>
              {children}
            </AppShell>
          </Suspense>
          <PwaPrompt />
          <ServerWarmingIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}
