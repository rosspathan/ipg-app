import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
 * Real-time PUBLIC order book hook with instant updates
 * Fetches ALL users' pending orders for the given symbol (not just current user)
 * This is essential for a trading platform - order book must show all market depth
 */
export function useRealtimeOrderBook(symbol?: string) {
  const queryClient = useQueryClient();

  // Main query for order book data - fetches ALL pending orders (public order book)
  const query = useQuery({
    queryKey: ['public-order-book', symbol],
    queryFn: async (): Promise<InternalOrderBook> => {
      if (!symbol) {
        return { bids: [], asks: [] };
      }

      // Fetch ALL pending buy orders (bids) - no user filter, highest price first
      const { data: buyOrders, error: buyError } = await supabase
        .from('orders')
        .select('price, remaining_amount')
        .eq('symbol', symbol)
        .eq('side', 'buy')
        .in('status', ['pending', 'partially_filled'])
        .eq('order_type', 'limit')
        .not('price', 'is', null)
        .order('price', { ascending: false })
        .limit(50);

      if (buyError) {
        console.error('[useRealtimeOrderBook] Error fetching bids:', buyError);
      }

      // Fetch ALL pending sell orders (asks) - no user filter, lowest price first
      const { data: sellOrders, error: sellError } = await supabase
        .from('orders')
        .select('price, remaining_amount')
        .eq('symbol', symbol)
        .eq('side', 'sell')
        .in('status', ['pending', 'partially_filled'])
        .eq('order_type', 'limit')
        .not('price', 'is', null)
        .order('price', { ascending: true })
        .limit(50);

      if (sellError) {
        console.error('[useRealtimeOrderBook] Error fetching asks:', sellError);
      }

      // Aggregate orders at same price level
      const aggregateLevels = (orders: any[], ascending: boolean): OrderBookLevel[] => {
        const priceMap = new Map<number, number>();
        
        orders?.forEach(order => {
          const price = order.price;
          const qty = order.remaining_amount || 0;
          priceMap.set(price, (priceMap.get(price) || 0) + qty);
        });

        const levels = Array.from(priceMap.entries())
          .sort((a, b) => ascending ? a[0] - b[0] : b[0] - a[0]);

        let runningTotal = 0;
        return levels.map(([price, quantity]) => {
          runningTotal += quantity;
          return {
            price,
            quantity,
            total: runningTotal
          };
        });
      };

      const bids = aggregateLevels(buyOrders || [], false);
      const asks = aggregateLevels(sellOrders || [], true);

      return { bids, asks };
    },
    enabled: !!symbol,
    staleTime: 3000,
    refetchInterval: 10000, // Fallback polling every 10 seconds
  });

  // Real-time subscription for instant updates
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
          filter: `symbol=eq.${symbol}`
        },
        (payload) => {
          console.log('[RealtimeOrderBook] Order change for', symbol, payload.eventType);
          // Immediately invalidate and refetch the public order book
          queryClient.invalidateQueries({ queryKey: ['public-order-book', symbol] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol, queryClient]);

  return query;
}
