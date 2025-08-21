import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface Order {
  id: string;
  symbol: string;
  order_type: string;
  side: string;
  trading_type: string;
  amount: number;
  price?: number;
  filled_amount: number;
  remaining_amount: number;
  average_price?: number;
  status: string;
  leverage?: number;
  total_value?: number;
  fees_paid: number;
  fee_asset: string;
  created_at: string;
  updated_at: string;
  filled_at?: string;
  cancelled_at?: string;
}

interface Trade {
  id: string;
  symbol: string;
  trading_type: string;
  quantity: number;
  price: number;
  total_value: number;
  buyer_fee: number;
  seller_fee: number;
  fee_asset: string;
  trade_time: string;
  side?: string; // Derived from whether user was buyer or seller
}

export const useOrderHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch order history",
          variant: "destructive",
        });
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch order history",
        variant: "destructive",
      });
    }
  };

  const fetchTrades = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .or(`buyer_id.eq.${userData.user.id},seller_id.eq.${userData.user.id}`)
        .order('trade_time', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching trades:', error);
        toast({
          title: "Error",
          description: "Failed to fetch trade history",
          variant: "destructive",
        });
        return;
      }

      // Add side information based on whether user was buyer or seller
      const tradesWithSide = (data || []).map(trade => ({
        ...trade,
        side: trade.buyer_id === userData.user.id ? 'buy' : 'sell'
      }));

      setTrades(tradesWithSide);
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trade history",
        variant: "destructive",
      });
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('status', 'pending'); // Only allow cancelling pending orders

      if (error) {
        console.error('Error cancelling order:', error);
        toast({
          title: "Error",
          description: "Failed to cancel order",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Order cancelled successfully",
      });

      // Refresh orders list
      fetchOrders();
      return true;
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
      return false;
    }
  };

  const createOrder = async (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'filled_amount' | 'remaining_amount'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from('orders')
        .insert([{
          ...orderData,
          user_id: userData.user.id,
          total_value: orderData.price ? orderData.amount * orderData.price : undefined
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating order:', error);
        toast({
          title: "Error",
          description: "Failed to create order",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Order placed successfully",
      });

      // Refresh orders list
      fetchOrders();
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchTrades()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    orders,
    trades,
    loading,
    fetchOrders,
    fetchTrades,
    cancelOrder,
    createOrder,
    refetch: () => {
      fetchOrders();
      fetchTrades();
    }
  };
};