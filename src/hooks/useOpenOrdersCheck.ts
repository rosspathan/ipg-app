import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

interface OpenOrdersSummary {
  hasOpenOrders: boolean;
  openOrdersCount: number;
  lockedAssets: Array<{
    symbol: string;
    amount: number;
  }>;
  totalLockedByAsset: Record<string, number>;
}

/**
 * Hook to check for open trading orders
 * Used to warn users before withdrawing assets that are locked in orders
 */
export function useOpenOrdersCheck(assetSymbol?: string) {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['open-orders-check', user?.id, assetSymbol],
    queryFn: async (): Promise<OpenOrdersSummary> => {
      if (!user?.id) {
        return {
          hasOpenOrders: false,
          openOrdersCount: 0,
          lockedAssets: [],
          totalLockedByAsset: {}
        };
      }

      // Get all open/pending orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, symbol, side, amount, filled_amount, price, order_type')
        .eq('user_id', user.id)
        .in('status', ['pending', 'partially_filled']);

      if (error) {
        console.error('[useOpenOrdersCheck] Failed to fetch orders:', error);
        return {
          hasOpenOrders: false,
          openOrdersCount: 0,
          lockedAssets: [],
          totalLockedByAsset: {}
        };
      }

      if (!orders || orders.length === 0) {
        return {
          hasOpenOrders: false,
          openOrdersCount: 0,
          lockedAssets: [],
          totalLockedByAsset: {}
        };
      }

      // Calculate locked amounts per asset
      const lockedByAsset: Record<string, number> = {};

      for (const order of orders) {
        const [baseSymbol, quoteSymbol] = order.symbol.split('/');
        const remainingAmount = parseFloat(String(order.amount)) - parseFloat(String(order.filled_amount || 0));

        if (order.side === 'buy') {
          // Buy orders lock quote asset (e.g., USDT)
          const lockAmount = remainingAmount * parseFloat(String(order.price || 0));
          lockedByAsset[quoteSymbol] = (lockedByAsset[quoteSymbol] || 0) + lockAmount;
        } else {
          // Sell orders lock base asset (e.g., BTC)
          lockedByAsset[baseSymbol] = (lockedByAsset[baseSymbol] || 0) + remainingAmount;
        }
      }

      const lockedAssets = Object.entries(lockedByAsset).map(([symbol, amount]) => ({
        symbol,
        amount
      }));

      return {
        hasOpenOrders: orders.length > 0,
        openOrdersCount: orders.length,
        lockedAssets,
        totalLockedByAsset: lockedByAsset
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // Refresh every minute
  });
}
