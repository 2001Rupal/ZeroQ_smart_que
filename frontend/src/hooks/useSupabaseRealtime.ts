'use client';

import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface UseSupabaseRealtimeProps {
  tokenUuid?: string;
  storeId?: string;
  onTokenUpdated?: (tokenData: any) => void;
  onQueueChanged?: () => void;
}

export function useSupabaseRealtime({
  tokenUuid,
  storeId,
  onTokenUpdated,
  onQueueChanged
}: UseSupabaseRealtimeProps) {
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channels: any[] = [];

    // 1. Subscribe to individual token changes
    if (tokenUuid && onTokenUpdated) {
      const tokenChannel = supabase
        .channel(`realtime_token_${tokenUuid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tokens',
            filter: `uuid=eq.${tokenUuid}`
          },
          (payload) => {
            console.log('⚡ [Supabase Realtime] Token update received:', payload);
            if (payload.new) {
              onTokenUpdated(payload.new);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Supabase Realtime] Subscribed to token:${tokenUuid}`);
          }
        });

      channels.push(tokenChannel);
    }

    // 2. Subscribe to store-wide token and counter changes
    if (storeId && onQueueChanged) {
      const storeChannel = supabase
        .channel(`realtime_store_${storeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tokens',
            filter: `store_id=eq.${storeId}`
          },
          () => {
            console.log('⚡ [Supabase Realtime] Queue state changed for store:', storeId);
            onQueueChanged();
          }
        )
        .subscribe();

      channels.push(storeChannel);
    }

    return () => {
      channels.forEach((ch) => {
        if (supabase) supabase.removeChannel(ch);
      });
    };
  }, [tokenUuid, storeId, onTokenUpdated, onQueueChanged]);
}
