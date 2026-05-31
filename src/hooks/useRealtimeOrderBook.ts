import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ORDER_BOOK_DUST_THRESHOLD } from '@/lib/trading/orderBookDust';

interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

interface InternalOrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

/**
 * Real-time PUBLIC order book hook.
 *
 * SECURITY NOTE: The `orders` table RLS now restricts row-level SELECT to the
 * order owner (so that no user_id / PII leaks via Realtime). To still render a
 * truthful market-depth book to every trader, this hook calls the
 * `get_public_order_book` SECURITY DEFINER RPC, which returns aggregated price
 * levels only (price + summed remaining quantity) — never user_id.
 */
export function useRealtimeOrderBook(symbol?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['public-order-book', symbol],
    queryFn: async (): Promise<InternalOrderBook> => {
      if (!symbol) return { bids: [], asks: [] };

      const { data, error } = await supabase.rpc('get_public_order_book', {
        p_symbol: symbol,
        p_depth: 50,
      });

      if (error) {
        console.error('[useRealtimeOrderBook] RPC error:', error);
        return { bids: [], asks: [] };
      }

      const rows = (data as Array<{ side: string; price: number; quantity: number }>) || [];

      const buildLevels = (
        filtered: typeof rows,
        ascending: boolean,
      ): OrderBookLevel[] => {
        // Defense-in-depth: drop any non-finite / zero / dust level that the
        // backend RPC dust filter might have missed (e.g. cached data).
        const tradable = filtered.filter((r) => {
          const q = Number(r.quantity);
          return Number.isFinite(q) && q >= ORDER_BOOK_DUST_THRESHOLD;
        });
        const sorted = [...tradable].sort((a, b) =>
          ascending ? a.price - b.price : b.price - a.price,
        );
        let runningTotal = 0;
        return sorted.map((r) => {
          const quantity = Number(r.quantity) || 0;
          runningTotal += quantity;
          return { price: Number(r.price), quantity, total: runningTotal };
        });
      };

      const bids = buildLevels(rows.filter((r) => r.side === 'buy'), false);
      const asks = buildLevels(rows.filter((r) => r.side === 'sell'), true);

      return { bids, asks };
    },
    enabled: !!symbol,
    staleTime: 1500,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  // Realtime fan-out: postgres_changes respects RLS, so a viewer only sees
  // events for their OWN orders. Treat those as a hint to refetch the public
  // book; the 3s polling above covers third-party activity.
  useEffect(() => {
    if (!symbol) return;

    const channel = supabase
      .channel(`order-book-${symbol}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `symbol=eq.${symbol}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['public-order-book', symbol] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol, queryClient]);

  return query;
}
