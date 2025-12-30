import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface AssetBalance {
  asset_id: string;
  symbol: string;
  name: string;
  balance: number;
  available: number;
  locked: number;
  usd_value: number;
  price_usd: number;
  logo_url?: string;
}

export interface PortfolioSummary {
  total_usd: number;
  change_24h_percent: number;
  available_usd: number;
  locked_usd: number;
}

export function useWalletBalances() {
  const { user } = useAuthUser();
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs to prevent infinite loops and debounce updates
  const hasSyncedRef = useRef(false);
  const lastRealtimeUpdateRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  // ONLY reads from database - no sync calls
  const fetchBalances = useCallback(async () => {
    if (!user || !isMountedRef.current) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user's wallet balances with asset details
      const { data: balanceData, error: balanceError } = await supabase
        .from('wallet_balances')
        .select(`
          total,
          available,
          locked,
          asset_id,
          assets (
            symbol,
            name,
            logo_url,
            initial_price,
            network
          )
        `)
        .eq('user_id', user.id)
        .or('total.gt.0,available.gt.0,locked.gt.0');

      if (balanceError) throw balanceError;

      // Get crypto prices from edge function (only if we have balances)
      let priceData: any = null;
      if (balanceData && balanceData.length > 0) {
        const { data, error: priceError } = await supabase.functions.invoke('fetch-crypto-prices', {
          body: { 
            symbols: balanceData.map((b: any) => b.assets.symbol)
          }
        });

        if (priceError) {
          console.warn('Failed to fetch live prices, using fallback:', priceError);
        } else {
          priceData = data;
        }
      }

      // Calculate balances with USD values
      const enrichedBalances: AssetBalance[] = (balanceData || []).map((item: any) => {
        const asset = item.assets;
        const priceUsd = priceData?.prices?.[asset.symbol] || asset.initial_price || 0;
        const totalBalance = (item.total ?? 0) || ((item.available || 0) + (item.locked || 0));
        const usdValue = totalBalance * priceUsd;

        return {
          asset_id: item.asset_id,
          symbol: asset.symbol,
          name: asset.name,
          balance: totalBalance,
          available: item.available,
          locked: item.locked,
          usd_value: usdValue,
          price_usd: priceUsd,
          logo_url: asset.logo_url
        };
      });

      // Calculate portfolio summary
      const totalUsd = enrichedBalances.reduce((sum, b) => sum + b.usd_value, 0);
      const availableUsd = enrichedBalances.reduce((sum, b) => sum + (b.available * b.price_usd), 0);
      const lockedUsd = enrichedBalances.reduce((sum, b) => sum + (b.locked * b.price_usd), 0);
      const change24hPercent = priceData?.change_24h || 0;

      if (isMountedRef.current) {
        setBalances(enrichedBalances);
        setPortfolio({
          total_usd: totalUsd,
          change_24h_percent: change24hPercent,
          available_usd: availableUsd,
          locked_usd: lockedUsd
        });
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching wallet balances:', err);
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  // Runs ONCE on mount - triggers background sync
  const syncOnchainBalances = useCallback(async () => {
    if (!user || hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    setIsSyncing(true);

    try {
      // Run all syncs in parallel, don't wait for them
      await Promise.allSettled([
        supabase.functions.invoke('sync-native-bnb', { body: { userIds: [user.id] } }),
        supabase.functions.invoke('sync-bep20-balances', { body: { userIds: [user.id] } }),
        supabase.functions.invoke('scheduled-discover-deposits', { body: { userIds: [user.id] } })
      ]);

      // Refresh data after sync completes
      if (isMountedRef.current) {
        await fetchBalances();
      }
    } catch (err) {
      console.warn('Background sync failed:', err);
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [user, fetchBalances]);

  useEffect(() => {
    isMountedRef.current = true;
    hasSyncedRef.current = false;

    // 1. Immediately fetch cached data
    fetchBalances();

    // 2. Start background sync (once) after initial fetch
    const syncTimeout = setTimeout(() => {
      syncOnchainBalances();
    }, 100);

    // 3. Set up realtime subscription with debouncing
    let channel: RealtimeChannel | null = null;
    
    const setupRealtimeSubscription = async () => {
      if (!user) return;

      channel = supabase
        .channel('wallet_balances_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallet_balances',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            const now = Date.now();
            // Debounce: ignore updates within 3 seconds of last one
            if (now - lastRealtimeUpdateRef.current < 3000) {
              return;
            }
            lastRealtimeUpdateRef.current = now;
            fetchBalances();
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    // Poll for price updates every 2 minutes (not balance refresh)
    const priceInterval = setInterval(() => {
      if (!isSyncing) {
        fetchBalances();
      }
    }, 120000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(syncTimeout);
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(priceInterval);
    };
  }, [user, fetchBalances, syncOnchainBalances]);

  return {
    balances,
    portfolio,
    loading,
    isSyncing,
    error,
    refetch: fetchBalances
  };
}
