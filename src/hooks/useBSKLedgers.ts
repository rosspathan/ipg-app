import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface BSKLedgerEntry {
  id: string;
  user_id: string;
  amount_bsk: number;
  amount_inr: number;
  rate_snapshot: number;
  tx_type: string;
  tx_subtype?: string;
  reference_id?: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
  notes?: string;
  metadata?: any;
  locked_until?: string;
  release_schedule_id?: string;
}

export interface BSKBalanceSummary {
  user_id: string;
  withdrawable_balance: number;
  holding_balance: number;
  lifetime_withdrawable_earned: number;
  lifetime_holding_earned: number;
  lifetime_withdrawn: number;
  created_at: string;
  updated_at: string;
}

export const useBSKLedgers = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<BSKBalanceSummary | null>(null);
  const [withdrawableHistory, setWithdrawableHistory] = useState<BSKLedgerEntry[]>([]);
  const [holdingHistory, setHoldingHistory] = useState<BSKLedgerEntry[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      await Promise.all([
        loadBalances(),
        loadWithdrawableHistory(),
        loadHoldingHistory()
      ]);
    } catch (error) {
      console.error('Error loading BSK data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load BSK balance data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('user_bsk_balance_summary')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      // Initialize balance record
      const { data: newBalance, error: insertError } = await supabase
        .from('user_bsk_balance_summary')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) throw insertError;
      setBalances(newBalance);
    } else {
      setBalances(data);
    }
  };

  const loadWithdrawableHistory = async (limit: number = 50) => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('bsk_withdrawable_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    setWithdrawableHistory(data || []);
  };

  const loadHoldingHistory = async (limit: number = 50) => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('bsk_holding_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    setHoldingHistory(data || []);
  };

  const getCurrentBSKRate = async (): Promise<number> => {
    const { data, error } = await supabase
      .from('bsk_rates')
      .select('rate_inr_per_bsk')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn('BSK rate not found, using default 1.0');
      return 1.0;
    }

    return data.rate_inr_per_bsk;
  };

  return {
    loading,
    balances,
    withdrawableHistory,
    holdingHistory,
    loadData,
    loadBalances,
    loadWithdrawableHistory,
    loadHoldingHistory,
    getCurrentBSKRate
  };
};
