import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InternalMarketPrice {
  currentPrice: number;
  priceChange24h: number;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null;
}

// List of Binance-listed pairs that use WebSocket data
const BINANCE_PAIRS = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT', 'XRP/USDT'];

export function isInternalPair(symbol: string): boolean {
  return !BINANCE_PAIRS.includes(symbol);
}

export function useInternalMarketPrice(symbol?: string): InternalMarketPrice | null {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['internal-market-price', symbol],
    queryFn: async () => {
      if (!symbol) return null;

      // Convert symbol format: IPG/USDT -> IPGUSDT
      const dbSymbol = symbol.replace('/', '');

      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .eq('symbol', dbSymbol)
        .maybeSingle();

      if (error) {
        console.error('[useInternalMarketPrice] Error fetching price:', error);
        return null;
      }

      if (!data) {
        console.log('[useInternalMarketPrice] No price data found for:', dbSymbol);
        return null;
      }

      return {
        currentPrice: data.current_price || 0,
        priceChange24h: data.price_change_percentage_24h || 0,
        high24h: data.high_24h,
        low24h: data.low_24h,
        volume24h: data.volume_24h,
      };
    },
    enabled: !!symbol && isInternalPair(symbol),
    staleTime: 5000,
    refetchInterval: 10000,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!symbol || !isInternalPair(symbol)) return;

    const dbSymbol = symbol.replace('/', '');
    
    const channel = supabase
      .channel(`market-price-${dbSymbol}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_prices',
          filter: `symbol=eq.${dbSymbol}`
        },
        (payload) => {
          console.log('[useInternalMarketPrice] Real-time update:', payload);
          queryClient.invalidateQueries({ queryKey: ['internal-market-price', symbol] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol, queryClient]);

  return data || null;
}
