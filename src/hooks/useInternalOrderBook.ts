import { useQuery } from '@tanstack/react-query';
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
 * Public internal order book (aggregated, no PII).
 * Uses the `get_public_order_book` SECURITY DEFINER RPC so it works even though
 * the `orders` table RLS restricts row-level SELECT to the order owner.
 */
export const useInternalOrderBook = (symbol?: string) => {
  return useQuery({
    queryKey: ['internal-order-book', symbol],
    queryFn: async (): Promise<InternalOrderBook> => {
      if (!symbol) return { bids: [], asks: [] };

      const { data, error } = await supabase.rpc('get_public_order_book', {
        p_symbol: symbol,
        p_depth: 50,
      });
      if (error) {
        console.error('[useInternalOrderBook] RPC error:', error);
        return { bids: [], asks: [] };
      }

      const rows = (data as Array<{ side: string; price: number; quantity: number }>) || [];

      const build = (filtered: typeof rows, ascending: boolean): OrderBookLevel[] => {
        // Defense-in-depth: never display non-finite / zero / dust levels.
        const tradable = filtered.filter((r) => {
          const q = Number(r.quantity);
          return Number.isFinite(q) && q >= ORDER_BOOK_DUST_THRESHOLD;
        });
        const sorted = [...tradable].sort((a, b) => (ascending ? a.price - b.price : b.price - a.price));
        let total = 0;
        return sorted.map((r) => {
          const quantity = Number(r.quantity) || 0;
          total += quantity;
          return { price: Number(r.price), quantity, total };
        });
      };

      return {
        bids: build(rows.filter((r) => r.side === 'buy'), false),
        asks: build(rows.filter((r) => r.side === 'sell'), true),
      };
    },
    enabled: !!symbol,
    staleTime: 1500,
    refetchInterval: 5000,
  });
};
