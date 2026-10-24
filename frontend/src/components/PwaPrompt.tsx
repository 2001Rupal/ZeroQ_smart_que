'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

export const PwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[ZeroQ PWA] Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[ZeroQ PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 2. Check if already installed as standalone PWA
    if (typeof window !== 'undefined') {
      const isRunningStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isRunningStandalone);

      // Check if iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isAppleMobile);

      // Check if user dismissed recently
      const dismissedUntil = localStorage.getItem('zeroq_pwa_dismissed');
      if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
        return;
      }

      // 3. Listen for native Android / Chrome beforeinstallprompt event
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        if (!isRunningStandalone) {
          setShowPrompt(true);
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('[ZeroQ PWA] User accepted the install prompt');
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIos) {
      setShowIosInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosInstructions(false);
    // Dismiss for 5 days
    localStorage.setItem('zeroq_pwa_dismissed', String(Date.now() + 5 * 24 * 60 * 60 * 1000));
  };

  if (isStandalone || (!showPrompt && !showIosInstructions)) {
    return null;
  }

  return (
    <>
      {/* Sleek Bottom Install Banner */}
      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#0b101b] border border-blue-500/40 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              ZQ
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Install ZeroQ App</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Faster alerts, live ticket tracker & offline access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b101b] border border-slate-800 text-white p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIosInstructions(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <ol className="text-xs text-slate-300 space-y-3 list-decimal list-inside">
              <li>
                Tap the <strong className="text-white">Share</strong> button{' '}
                <Share className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" /> at the bottom of Safari.
              </li>
              <li>
                Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong className="text-white">Add</strong> in the top-right corner.
              </li>
            </ol>

            <button
              onClick={handleDismiss}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
