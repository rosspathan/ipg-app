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
        // Extract the actual error message from the edge function response
        let errorMessage = error.message || 'Failed to place order';
        
        // Try to parse error body for detailed message
        if (error.context?.body) {
          try {
            const bodyText = await error.context.body.text?.() || error.context.body;
            const parsed = typeof bodyText === 'string' ? JSON.parse(bodyText) : bodyText;
            if (parsed?.error) {
              errorMessage = parsed.error;
            }
          } catch {
            // Keep original error message if parsing fails
          }
        }
        
        throw new Error(errorMessage);
      }

      if (!orderResult?.success) {
        throw new Error(orderResult?.error || 'Failed to place order');
      }

      return orderResult.order;
    },
    onSuccess: (order, params) => {
      const isFilled = order?.status === 'filled';
      const isPartiallyFilled = order?.status === 'partially_filled';
      
      let title: string;
      let description: string;
      
      if (isFilled) {
        title = `${params.side.toUpperCase()} order filled instantly`;
        description = `${params.quantity} ${params.symbol.split('/')[0]} @ ${params.price ? `$${params.price}` : 'Market'}`;
      } else if (isPartiallyFilled) {
        title = `${params.side.toUpperCase()} order partially filled`;
        description = `${params.quantity} ${params.symbol.split('/')[0]} @ ${params.price ? `$${params.price}` : 'Market'} - remaining in order book`;
      } else {
        title = `${params.side.toUpperCase()} order placed`;
        description = `${params.quantity} ${params.symbol.split('/')[0]} @ ${params.price ? `$${params.price}` : 'Market'} - waiting to fill`;
      }
      
      toast.success(title, { description });
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
