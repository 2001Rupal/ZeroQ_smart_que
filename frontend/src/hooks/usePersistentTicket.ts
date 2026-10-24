'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'vq_active_ticket';

export interface PersistentTicketInfo {
  tokenUuid: string;
  storeSlug: string;
  tokenNumber: number;
  timestamp: number;
}

export function usePersistentTicket() {
  const [savedTicket, setSavedTicket] = useState<PersistentTicketInfo | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only keep tickets created within last 24 hours
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.timestamp < ONE_DAY) {
          setSavedTicket(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved ticket from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveTicket = (tokenUuid: string, storeSlug: string, tokenNumber: number) => {
    const data: PersistentTicketInfo = {
      tokenUuid,
      storeSlug,
      tokenNumber,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSavedTicket(data);
    } catch (e) {
      console.warn('Failed to save ticket to localStorage', e);
    }
  };

  const clearTicket = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSavedTicket(null);
    } catch (e) {
      console.warn('Failed to clear ticket from localStorage', e);
    }
  };

  return { savedTicket, saveTicket, clearTicket, isLoaded };
}
