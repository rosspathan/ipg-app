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

      // Parse symbol to get quote asset for balance locking
      const [baseSymbol, quoteSymbol] = params.symbol.split('/');
      const assetToLock = params.side === 'buy' ? quoteSymbol : baseSymbol;
      const amountToLock = params.side === 'buy' 
        ? params.quantity * (params.price || 0) 
        : params.quantity;

      // Lock balance before placing order (only for limit orders)
      if (params.type === 'limit') {
        const { data: locked, error: lockError } = await supabase.rpc('lock_balance_for_order', {
          p_user_id: user.id,
          p_asset_symbol: assetToLock,
          p_amount: amountToLock
        });

        if (lockError || !locked) {
          throw new Error('Insufficient balance');
        }
      }

      // Insert order into database using correct column names
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          symbol: params.symbol,
          side: params.side,
          order_type: params.type,
          amount: params.quantity,
          price: params.price,
          filled_amount: 0,
          remaining_amount: params.quantity,
          status: 'pending',
          trading_type: params.trading_type || 'spot',
        })
        .select()
        .single();

      if (error) {
        // Unlock balance if order creation failed
        if (params.type === 'limit') {
          await supabase.rpc('unlock_balance_for_order', {
            p_user_id: user.id,
            p_asset_symbol: assetToLock,
            p_amount: amountToLock
          });
        }
        throw error;
      }

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

      // Unlock balance if it's a pending limit order
      if (order.status === 'pending' && order.order_type === 'limit') {
        const [baseSymbol, quoteSymbol] = order.symbol.split('/');
        const assetToUnlock = order.side === 'buy' ? quoteSymbol : baseSymbol;
        const amountToUnlock = order.side === 'buy' 
          ? order.remaining_amount * order.price 
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
    placeOrder: placeOrderMutation.mutateAsync,
    cancelOrder: cancelOrderMutation.mutateAsync,
    isPlacingOrder: placeOrderMutation.isPending,
  };
};
