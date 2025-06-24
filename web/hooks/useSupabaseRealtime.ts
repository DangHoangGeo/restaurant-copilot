'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseSupabaseRealtimeOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: Record<string, unknown>) => void;
  onUpdate?: (payload: Record<string, unknown>) => void;
  onDelete?: (payload: Record<string, unknown>) => void;
  enabled?: boolean;
}

export function useSupabaseRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true
}: UseSupabaseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, [supabase]);

  const setupSubscription = useCallback(async () => {
    if (!enabled) return;

    try {
      // Clean up existing subscription
      cleanup();

      // Create channel name with filter to avoid conflicts
      const channelName = filter ? `${table}-${filter}` : table;
      const channel = supabase.channel(channelName);

      // Configure postgres changes subscription
      const subscription = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter && { filter })
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }
        }
      );

      // Subscribe and handle connection status
      subscription.subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError('Failed to connect to realtime');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setError('Connection timed out');
        }
      });

      channelRef.current = channel;
    } catch (err) {
      console.error('Error setting up realtime subscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
    }
  }, [enabled, table, filter, onInsert, onUpdate, onDelete, cleanup, supabase]);

  useEffect(() => {
    setupSubscription();
    return cleanup;
  }, [setupSubscription, cleanup]);

  return {
    isConnected,
    error,
    reconnect: setupSubscription
  };
}
