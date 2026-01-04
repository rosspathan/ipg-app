import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlaceOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop_limit';
  quantity: number;
  price?: number;
  stop_price?: number;
  time_in_force?: 'GTC' | 'IOC' | 'FOK';
  client_order_id?: string;
  trading_mode?: 'internal' | 'onchain';
}

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  quantity: number;
  price?: number;
  status: string;
  filled_quantity: number;
  remaining_quantity: number;
  created_at: string;
  client_order_id?: string;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_value: number;
  fee: number;
  trade_time: string;
  order_id: string;
}

export const useTradingAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const placeOrder = async (params: PlaceOrderParams) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('place-order', {
        body: params
      });

      if (error) {
        // Try to extract the actual error message from the edge function response
        let errorMessage = error.message || 'Failed to place order';
        
        // The error.context?.body often contains the JSON response from the edge function
        if (error.context?.body) {
          try {
            const bodyText = await error.context.body.text?.() || error.context.body;
            const parsed = typeof bodyText === 'string' ? JSON.parse(bodyText) : bodyText;
            if (parsed?.error) {
              errorMessage = parsed.error;
            }
          } catch {
            // If parsing fails, check if error already has a meaningful message
          }
        }
        
        throw new Error(errorMessage);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to place order');
      }

      toast({
        title: "Order Placed",
        description: `${params.side.toUpperCase()} order for ${params.quantity} ${params.symbol.split('/')[0]} placed successfully`,
      });

      return { success: true, order: data.order };

    } catch (error: any) {
      console.error('Place order error:', error);
      
      toast({
        title: "Order Failed",
        description: error.message || 'Failed to place order',
        variant: "destructive",
      });

      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string, clientOrderId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-order', {
        body: {
          order_id: orderId,
          client_order_id: clientOrderId
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      toast({
        title: "Order Cancelled",
        description: "Order cancelled successfully",
      });

      return { success: true, order: data.order };

    } catch (error: any) {
      console.error('Cancel order error:', error);
      
      toast({
        title: "Cancel Failed",
        description: error.message || 'Failed to cancel order',
        variant: "destructive",
      });

      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const getOrderHistory = async (params?: {
    symbol?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (params?.symbol) searchParams.set('symbol', params.symbol);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());

      const { data, error } = await supabase.functions.invoke('order-history', {
        body: null,
        method: 'GET'
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch order history');
      }

      return { success: true, orders: data.data as Order[] };

    } catch (error: any) {
      console.error('Get order history error:', error);
      return { success: false, error: error.message, orders: [] };
    } finally {
      setLoading(false);
    }
  };

  const getTradeHistory = async (params?: {
    symbol?: string;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams({ type: 'trades' });
      if (params?.symbol) searchParams.set('symbol', params.symbol);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());

      const { data, error } = await supabase.functions.invoke('order-history', {
        body: null,
        method: 'GET'
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch trade history');
      }

      return { success: true, trades: data.data as Trade[] };

    } catch (error: any) {
      console.error('Get trade history error:', error);
      return { success: false, error: error.message, trades: [] };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    placeOrder,
    cancelOrder,
    getOrderHistory,
    getTradeHistory
  };
};