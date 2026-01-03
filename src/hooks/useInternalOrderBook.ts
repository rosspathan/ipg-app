import { useQuery } from '@tanstack/react-query';
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

export const useInternalOrderBook = (symbol?: string) => {
  return useQuery({
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
        console.error('[useInternalOrderBook] Error fetching bids:', buyError);
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
        console.error('[useInternalOrderBook] Error fetching asks:', sellError);
      }

      // Aggregate orders at same price level
      const aggregateLevels = (orders: any[]): OrderBookLevel[] => {
        const priceMap = new Map<number, number>();
        
        orders?.forEach(order => {
          const price = order.price;
          const qty = order.remaining_amount || 0;
          priceMap.set(price, (priceMap.get(price) || 0) + qty);
        });

        let runningTotal = 0;
        return Array.from(priceMap.entries()).map(([price, quantity]) => {
          runningTotal += quantity;
          return {
            price,
            quantity,
            total: runningTotal
          };
        });
      };

      const bids = aggregateLevels(buyOrders || []);
      const asks = aggregateLevels(sellOrders || []);

      return { bids, asks };
    },
    enabled: !!symbol,
    refetchInterval: 3000, // Refresh every 3 seconds
    staleTime: 1000,
  });
};
