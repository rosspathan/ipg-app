import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook to fetch ALL open orders for the current user across ALL trading pairs.
 * This ensures users can always see and cancel their orders regardless of which 
 * trading pair page they're viewing.
 */
export const useAllOpenOrders = () => {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['all-open-orders'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'open', 'partially_filled'])
        .gt('locked_amount', 0)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data || [];
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expired. Please log in again.');
      }

      const { data: result, error } = await supabase.functions.invoke('cancel-order', {
        body: { order_id: orderId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        let errorMessage = error.message || 'Failed to cancel order';
        if (error.context?.body) {
          try {
            const bodyText = await error.context.body.text?.() || error.context.body;
            const parsed = typeof bodyText === 'string' ? JSON.parse(bodyText) : bodyText;
            if (parsed?.error) {
              errorMessage = parsed.error;
            }
          } catch {
            // Keep original error
          }
        }
        throw new Error(errorMessage);
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to cancel order');
      }

      return result;
    },
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries({ queryKey: ['all-open-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['trading-balances'] });
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
    cancelOrder: cancelOrderMutation.mutateAsync,
    isCancelling: cancelOrderMutation.isPending,
  };
};
