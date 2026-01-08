import { useEffect, useRef } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SYNC_KEY_PREFIX = 'last_trading_deposit_sync_';

/**
 * Automatically syncs on-chain deposits to trading balance on page load
 * - Only runs once per session unless interval passed
 * - Uses localStorage to prevent excessive calls
 * - Silently runs in background without blocking UI
 */
export function useAutoSyncDeposits() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const syncTriggered = useRef(false);

  useEffect(() => {
    if (!user?.id || syncTriggered.current) return;

    const syncKey = `${SYNC_KEY_PREFIX}${user.id}`;
    const lastSync = localStorage.getItem(syncKey);
    const now = Date.now();

    // Only sync if no recent sync (> 5 minutes ago)
    if (lastSync && now - parseInt(lastSync) < AUTO_SYNC_INTERVAL_MS) {
      console.log('[useAutoSyncDeposits] Skipping - recent sync exists');
      return;
    }

    syncTriggered.current = true;

    // Run auto-detect-deposits silently in background
    const runAutoSync = async () => {
      try {
        console.log('[useAutoSyncDeposits] Starting background deposit sync...');
        
        const { data, error } = await supabase.functions.invoke('auto-detect-deposits', {
          body: {}
        });

        if (error) {
          console.warn('[useAutoSyncDeposits] Sync failed:', error);
          return;
        }

        // Update last sync time
        localStorage.setItem(syncKey, now.toString());

        // Invalidate balance queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['user-balance'] });
        queryClient.invalidateQueries({ queryKey: ['bep20-balances'] });
        queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });

        if (data?.deposits?.length > 0) {
          console.log(`[useAutoSyncDeposits] Credited ${data.deposits.length} deposits`);
        } else {
          console.log('[useAutoSyncDeposits] No new deposits found');
        }
      } catch (err) {
        console.warn('[useAutoSyncDeposits] Background sync error:', err);
      }
    };

    // Delay slightly to not block initial page render
    const timer = setTimeout(runAutoSync, 1000);
    return () => clearTimeout(timer);
  }, [user?.id, queryClient]);
}
