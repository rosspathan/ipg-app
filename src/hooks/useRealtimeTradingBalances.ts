import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

/**
 * Real-time trading balance hook
 * Subscribes to wallet_balances, orders, and trades tables
 * Automatically invalidates queries and shows notifications on changes
 */
export function useRealtimeTradingBalances() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastBalanceRef = useRef<Record<string, number>>({});

  const invalidateBalanceQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['bep20-balances'] });
    queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
    queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    queryClient.invalidateQueries({ queryKey: ['transfer-assets'] });
    // Trading balances are fetched from wallet_balances but use a separate query key
    queryClient.invalidateQueries({ queryKey: ['trading-balances'] });
  }, [queryClient]);

  const invalidateOrderQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    queryClient.invalidateQueries({ queryKey: ['internal-order-book'] });
  }, [queryClient]);

  const invalidateTradeQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trade-history'] });
    queryClient.invalidateQueries({ queryKey: ['user-trades'] });
  }, [queryClient]);

  useEffect(() => {
    if (!user?.id) return;

    // Channel for wallet balance changes
    const balanceChannel = supabase
      .channel(`trading-balances-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_balances',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[RealtimeBalance] Balance update:', payload);
          
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // Check if this is a deposit (balance increased)
          if (payload.eventType === 'UPDATE' && newData && oldData) {
            const assetId = newData.asset_id;
            const newTotal = (newData.available || 0) + (newData.locked || 0);
            const oldTotal = (oldData.available || 0) + (oldData.locked || 0);
            
            if (newTotal > oldTotal) {
              const increase = newTotal - oldTotal;
              toast({
                title: "Balance Updated",
                description: `+${increase.toFixed(6)} received`,
              });
            }
          }
          
          // Immediate balance refresh
          invalidateBalanceQueries();
        }
      )
      .subscribe();

    // Channel for order changes (separate for clarity)
    const orderChannel = supabase
      .channel(`trading-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[RealtimeOrders] Order update:', payload);
          
          const order = payload.new as any;
          
          // Notify on order status changes
          if (payload.eventType === 'UPDATE' && order) {
            if (order.status === 'filled') {
              toast({
                title: "Order Filled",
                description: `${order.side.toUpperCase()} ${order.amount} @ ${order.price || 'market'}`,
              });
            } else if (order.status === 'cancelled') {
              toast({
                title: "Order Cancelled",
                description: `${order.side.toUpperCase()} order cancelled`,
              });
            } else if (order.status === 'partially_filled') {
              toast({
                title: "Order Partially Filled",
                description: `${order.filled_amount}/${order.amount} filled`,
              });
            }
          }
          
          invalidateOrderQueries();
          invalidateBalanceQueries(); // Orders affect locked balance
        }
      )
      .subscribe();

    // Channel for trades (user participated)
    const tradeChannel = supabase
      .channel(`trading-trades-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades'
        },
        (payload) => {
          const trade = payload.new as any;
          
          // Only notify if user is buyer or seller
          if (trade.buyer_id === user.id || trade.seller_id === user.id) {
            console.log('[RealtimeTrades] Trade executed:', trade);
            
            const side = trade.buyer_id === user.id ? 'BOUGHT' : 'SOLD';
            toast({
              title: "Trade Executed",
              description: `${side} ${trade.quantity} @ ${trade.price}`,
            });
            
            invalidateTradeQueries();
            invalidateBalanceQueries();
            invalidateOrderQueries();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(tradeChannel);
    };
  }, [user?.id, invalidateBalanceQueries, invalidateOrderQueries, invalidateTradeQueries, toast]);
}
