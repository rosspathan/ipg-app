import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useOnchainBalances } from '@/hooks/useOnchainBalances';

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

/**
 * useWalletBalances - PRIMARY balance hook
 * 
 * SOURCE OF TRUTH: On-chain balances
 * - Fetches actual token balances from user's BSC wallet
 * - Only shows what user truly owns on the blockchain
 * - Locked amounts come from open orders in the database
 */
export function useWalletBalances() {
  const { user } = useAuthUser();
  const { balances: onchainBalances, isLoading: onchainLoading, refetch: refetchOnchain } = useOnchainBalances();
  
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedAmounts, setLockedAmounts] = useState<Record<string, number>>({});
  
  const isMountedRef = useRef(true);

  // Fetch locked amounts from pending orders
  const fetchLockedAmounts = useCallback(async () => {
    if (!user) return;

    try {
      // Get all pending orders to calculate locked amounts per asset
      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('symbol, side, amount, price, status')
        .eq('user_id', user.id)
        .in('status', ['pending', 'partially_filled']);

      const locked: Record<string, number> = {};

      if (pendingOrders) {
        for (const order of pendingOrders) {
          const [baseSymbol, quoteSymbol] = order.symbol.split('/');
          
          if (order.side === 'buy') {
            // Buy order locks quote currency (e.g., USDT)
            const lockAmount = (order.amount || 0) * (order.price || 0);
            locked[quoteSymbol] = (locked[quoteSymbol] || 0) + lockAmount;
          } else {
            // Sell order locks base currency
            locked[baseSymbol] = (locked[baseSymbol] || 0) + (order.amount || 0);
          }
        }
      }

      if (isMountedRef.current) {
        setLockedAmounts(locked);
      }
    } catch (err) {
      console.error('Error fetching locked amounts:', err);
    }
  }, [user]);

  // Fetch prices for assets - prioritize USDT pairs for accurate USD pricing
  const fetchPrices = useCallback(async (symbols: string[]): Promise<Record<string, number>> => {
    const prices: Record<string, number> = {};
    
    try {
      // Fetch from market_prices table
      const { data: marketPrices } = await supabase
        .from('market_prices')
        .select('symbol, current_price');
      
      // Track which prices came from USD pairs (more accurate for USD valuation)
      const pricesBySymbol: Record<string, { price: number; isUsdPair: boolean }> = {};
      
      for (const mp of marketPrices || []) {
        const [baseSymbol, quoteSymbol] = mp.symbol.split('/');
        const isUsdPair = quoteSymbol === 'USDT' || quoteSymbol === 'USD';
        
        if (mp.current_price) {
          const existing = pricesBySymbol[baseSymbol];
          // Prioritize USD pairs over other pairs
          if (!existing || (isUsdPair && !existing.isUsdPair)) {
            pricesBySymbol[baseSymbol] = { price: mp.current_price, isUsdPair };
          }
        }
      }
      
      // Extract final prices
      for (const [symbol, data] of Object.entries(pricesBySymbol)) {
        prices[symbol] = data.price;
      }

      // Fallback to assets table for initial_price
      for (const symbol of symbols) {
        if (!prices[symbol]) {
          const { data: asset } = await supabase
            .from('assets')
            .select('initial_price')
            .eq('symbol', symbol)
            .single();
          
          if (asset?.initial_price) {
            prices[symbol] = asset.initial_price;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch prices:', err);
    }

    return prices;
  }, []);

  // Combine on-chain balances with locked amounts and prices
  const computeBalances = useCallback(async () => {
    if (!user || onchainBalances.length === 0) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      return;
    }

    try {
      // Get prices for all assets
      const symbols = onchainBalances.map(b => b.symbol);
      const prices = await fetchPrices(symbols);

      // Map on-chain balances to AssetBalance format
      const enrichedBalances: AssetBalance[] = [];

      for (const onchain of onchainBalances) {
        const locked = lockedAmounts[onchain.symbol] || 0;
        const available = Math.max(0, onchain.balance - locked);
        const priceUsd = prices[onchain.symbol] || 0;
        const usdValue = onchain.balance * priceUsd;

        // Get asset_id from database
        const { data: asset } = await supabase
          .from('assets')
          .select('id')
          .eq('symbol', onchain.symbol)
          .single();

        enrichedBalances.push({
          asset_id: asset?.id || onchain.symbol,
          symbol: onchain.symbol,
          name: onchain.name,
          balance: onchain.balance,
          available,
          locked,
          usd_value: usdValue,
          price_usd: priceUsd,
          logo_url: onchain.logoUrl
        });
      }

      // Calculate portfolio summary
      const totalUsd = enrichedBalances.reduce((sum, b) => sum + b.usd_value, 0);
      const availableUsd = enrichedBalances.reduce((sum, b) => sum + (b.available * b.price_usd), 0);
      const lockedUsd = enrichedBalances.reduce((sum, b) => sum + (b.locked * b.price_usd), 0);

      if (isMountedRef.current) {
        setBalances(enrichedBalances);
        setPortfolio({
          total_usd: totalUsd,
          change_24h_percent: 0, // Could fetch from price change data
          available_usd: availableUsd,
          locked_usd: lockedUsd
        });
        setError(null);
      }
    } catch (err: any) {
      console.error('Error computing balances:', err);
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, onchainBalances, lockedAmounts, fetchPrices]);

  // Recompute when on-chain balances or locked amounts change
  useEffect(() => {
    computeBalances();
  }, [computeBalances]);

  // Fetch locked amounts on mount and set up realtime subscription
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!user) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchLockedAmounts();

    // Subscribe to order changes (affects locked amounts)
    const channel = supabase
      .channel('orders_changes_for_balance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchLockedAmounts();
        }
      )
      .subscribe();

    // Poll for price updates every 2 minutes
    const priceInterval = setInterval(() => {
      computeBalances();
    }, 120000);

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
      clearInterval(priceInterval);
    };
  }, [user, fetchLockedAmounts, computeBalances]);

  // Sync function - refreshes on-chain data
  const syncOnchainBalances = useCallback(async () => {
    setIsSyncing(true);
    try {
      await refetchOnchain();
      await fetchLockedAmounts();
    } finally {
      setIsSyncing(false);
    }
  }, [refetchOnchain, fetchLockedAmounts]);

  return {
    balances,
    portfolio,
    loading: loading || onchainLoading,
    isSyncing,
    error,
    refetch: syncOnchainBalances
  };
}
