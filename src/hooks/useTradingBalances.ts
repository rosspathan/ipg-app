import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface TradingBalance {
  asset_id: string;
  asset_symbol: string;
  available: number;
  locked: number;
  total: number;
}

interface BalanceUpdate {
  asset_symbol: string;
  available_change: number;
  locked_change: number;
  reason: string;
  reference_id?: string;
}

export const useTradingBalances = () => {
  const [balances, setBalances] = useState<TradingBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBalances = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const { data, error } = await supabase
        .from('user_trading_balances')
        .select(`
          *,
          assets (
            symbol,
            name
          )
        `)
        .eq('user_id', userData.user.id);

      if (error) throw error;

      const formattedBalances: TradingBalance[] = (data || []).map(balance => ({
        asset_id: balance.asset_id,
        asset_symbol: balance.assets?.symbol || 'UNKNOWN',
        available: parseFloat(balance.available_balance || '0'),
        locked: parseFloat(balance.locked_balance || '0'),
        total: parseFloat(balance.available_balance || '0') + parseFloat(balance.locked_balance || '0')
      }));

      setBalances(formattedBalances);
    } catch (error: any) {
      console.error('Error fetching balances:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trading balances",
        variant: "destructive",
      });
    }
  };

  const getBalance = (symbol: string): TradingBalance | null => {
    return balances.find(b => b.asset_symbol === symbol) || null;
  };

  const hasBalance = (symbol: string, amount: number): boolean => {
    const balance = getBalance(symbol);
    return balance ? balance.available >= amount : false;
  };

  // Lock balance for order placement
  const lockBalance = async (symbol: string, amount: number, orderId: string): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return false;

      const { error } = await supabase.rpc('update_trading_balance', {
        p_user_id: userData.user.id,
        p_asset_symbol: symbol,
        p_available_change: -amount,
        p_locked_change: amount,
        p_reason: 'order_lock',
        p_reference_id: orderId
      });

      if (error) throw error;

      await fetchBalances();
      return true;
    } catch (error: any) {
      console.error('Error locking balance:', error);
      toast({
        title: "Error",
        description: "Failed to lock balance for order",
        variant: "destructive",
      });
      return false;
    }
  };

  // Unlock balance when order is cancelled
  const unlockBalance = async (symbol: string, amount: number, orderId: string): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return false;

      const { error } = await supabase.rpc('update_trading_balance', {
        p_user_id: userData.user.id,
        p_asset_symbol: symbol,
        p_available_change: amount,
        p_locked_change: -amount,
        p_reason: 'order_unlock',
        p_reference_id: orderId
      });

      if (error) throw error;

      await fetchBalances();
      return true;
    } catch (error: any) {
      console.error('Error unlocking balance:', error);
      toast({
        title: "Error",
        description: "Failed to unlock balance",
        variant: "destructive",
      });
      return false;
    }
  };

  // Update balance after trade execution
  const updateBalance = async (updates: BalanceUpdate[]): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return false;

      for (const update of updates) {
        const { error } = await supabase.rpc('update_trading_balance', {
          p_user_id: userData.user.id,
          p_asset_symbol: update.asset_symbol,
          p_available_change: update.available_change,
          p_locked_change: update.locked_change,
          p_reason: update.reason,
          p_reference_id: update.reference_id
        });

        if (error) throw error;
      }

      await fetchBalances();
      return true;
    } catch (error: any) {
      console.error('Error updating balances:', error);
      toast({
        title: "Error",
        description: "Failed to update balances",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    const loadBalances = async () => {
      setLoading(true);
      await fetchBalances();
      setLoading(false);
    };

    loadBalances();

    // Subscribe to balance changes
    const channel = supabase
      .channel('balance-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_trading_balances' 
      }, () => {
        fetchBalances();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    balances,
    loading,
    fetchBalances,
    getBalance,
    hasBalance,
    lockBalance,
    unlockBalance,
    updateBalance,
  };
};