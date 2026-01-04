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
 * Real-time order book hook with instant updates
 * Subscribes to orders table changes for the given symbol
 */
export function useRealtimeOrderBook(symbol?: string) {
  const queryClient = useQueryClient();

  // Main query for order book data
  const query = useQuery({
    queryKey: ['internal-order-book', symbol],
    queryFn: async (): Promise<InternalOrderBook> => {
      if (!symbol) {
        return { bids: [], asks: [] };
      }

      // Fetch pending buy orders (bids) - highest price first
      const { data: buyOrders, error: buyError } = await supabase
        .from('orders')
        .select('price, remaining_amount')
        .eq('symbol', symbol)
        .eq('side', 'buy')
        .eq('status', 'pending')
        .eq('order_type', 'limit')
        .not('price', 'is', null)
        .order('price', { ascending: false })
        .limit(50);

      if (buyError) {
        console.error('[useRealtimeOrderBook] Error fetching bids:', buyError);
      }

      // Fetch pending sell orders (asks) - lowest price first
      const { data: sellOrders, error: sellError } = await supabase
        .from('orders')
        .select('price, remaining_amount')
        .eq('symbol', symbol)
        .eq('side', 'sell')
        .eq('status', 'pending')
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
    staleTime: 500, // Keep data fresh for 500ms
    refetchInterval: 5000, // Fallback polling every 5 seconds
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
          // Immediately invalidate and refetch the order book
          queryClient.invalidateQueries({ queryKey: ['internal-order-book', symbol] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol, queryClient]);

  return query;
}
