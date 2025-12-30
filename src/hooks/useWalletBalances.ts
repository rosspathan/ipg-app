import { useState, useEffect, useCallback } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Trigger native BNB sync in background (non-blocking)
      supabase.functions.invoke('sync-native-bnb', {
        body: { userIds: [user.id] }
      }).catch(err => console.warn('Native BNB sync failed:', err));

      // Trigger BEP20 token sync in background (non-blocking)
      supabase.functions.invoke('sync-bep20-balances', {
        body: { userIds: [user.id] }
      }).catch(err => console.warn('BEP20 sync failed:', err));

      // Trigger deposit discovery in background (non-blocking)
      supabase.functions.invoke('scheduled-discover-deposits', {
        body: { userIds: [user.id] }
      }).catch(err => console.warn('Deposit discovery failed:', err));

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
        .or('total.gt.0,available.gt.0,locked.gt.0'); // Include any positive balances (total may be null)

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

      // Mock 24h change for now - would come from price history
      const change24hPercent = priceData?.change_24h || 0;

      setBalances(enrichedBalances);
      setPortfolio({
        total_usd: totalUsd,
        change_24h_percent: change24hPercent,
        available_usd: availableUsd,
        locked_usd: lockedUsd
      });
    } catch (err: any) {
      console.error('Error fetching wallet balances:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();

    // Set up real-time subscription for balance updates
    let channel: RealtimeChannel | null = null;
    
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
          (payload) => {
            console.log('Balance updated:', payload);
            fetchBalances();
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    // Poll for price updates every 2 minutes (reduced to avoid rate limits)
    const interval = setInterval(() => {
      fetchBalances();
    }, 120000);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(interval);
    };
  }, [user]);

  return {
    balances,
    portfolio,
    loading,
    error,
    refetch: fetchBalances
  };
}
