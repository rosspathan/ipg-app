import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlaceOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  trading_type?: 'spot' | 'futures';
}

export const useUserOrders = (symbol?: string) => {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['user-orders', symbol],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (params: PlaceOrderParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Note: Balance locking is handled by the place-order edge function
      // to avoid duplicate locking and race conditions

      // Call the place-order edge function which handles balance locking atomically
      const { data: orderResult, error } = await supabase.functions.invoke('place-order', {
        body: {
          symbol: params.symbol,
          side: params.side,
          type: params.type,
          quantity: params.quantity,
          price: params.price,
          trading_type: params.trading_type || 'spot',
          trading_mode: 'internal'
        }
      });

      if (error) {
        throw error;
      }

      if (!orderResult?.success) {
        throw new Error(orderResult?.error || 'Failed to place order');
      }

      const order = orderResult.order;

      // Matching engine is triggered by place-order edge function

      return order;
    },
    onSuccess: (order, params) => {
      toast.success(
        `${params.side.toUpperCase()} order placed`,
        {
          description: `${params.quantity} ${params.symbol.split('/')[0]} @ ${params.price ? `$${params.price}` : 'Market'}`,
        }
      );
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    },
    onError: (error: any) => {
      toast.error('Order failed', {
        description: error.message || 'Failed to place order',
      });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get order details first
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      // Unlock balance if it's a pending limit order (include fee buffer for buy orders)
      if (order.status === 'pending' && order.order_type === 'limit') {
        const [baseSymbol, quoteSymbol] = order.symbol.split('/');
        const assetToUnlock = order.side === 'buy' ? quoteSymbol : baseSymbol;
        const FEE_PERCENT = 0.005; // 0.5% fee
        const amountToUnlock = order.side === 'buy' 
          ? order.remaining_amount * order.price * (1 + FEE_PERCENT)
          : order.remaining_amount;

        await supabase.rpc('unlock_balance_for_order', {
          p_user_id: user.id,
          p_asset_symbol: assetToUnlock,
          p_amount: amountToUnlock
        });
      }

      // Update order status
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
    onError: (error: any) => {
      toast.error('Cancel failed', {
        description: error.message,
      });
    },
  });

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    refetch: ordersQuery.refetch,
    placeOrder: placeOrderMutation.mutateAsync,
    cancelOrder: cancelOrderMutation.mutateAsync,
    isPlacingOrder: placeOrderMutation.isPending,
  };
};
