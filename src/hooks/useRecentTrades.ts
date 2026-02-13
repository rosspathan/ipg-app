import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecentTrade {
  id: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  trade_time: string;
}

export function useRecentTrades(symbol: string, limit = 10) {
  return useQuery({
    queryKey: ['recent-trades', symbol, limit],
    queryFn: async () => {
      if (!symbol) return [];

      const { data, error } = await supabase
        .from('trades')
        .select('id, price, quantity, trade_time, taker_side')
        .eq('symbol', symbol)
        .order('trade_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent trades:', error);
        return [];
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        price: Number(t.price),
        quantity: Number(t.quantity),
        side: (t.taker_side || 'buy') as 'buy' | 'sell',
        trade_time: t.trade_time,
      })) as RecentTrade[];
    },
    enabled: !!symbol,
    refetchInterval: 3000,
  });
}
