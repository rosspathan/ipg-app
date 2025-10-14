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
          status: params.type === 'market' ? 'filled' : 'pending',
          trading_type: params.trading_type || 'spot',
        })
        .select()
        .single();

      if (error) throw error;

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
