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
    
    setLoading(true);
    try {
      await Promise.all([
        loadBalances(),
        loadWithdrawableHistory(),
        loadHoldingHistory()
      ]);
    } catch (error) {
      console.error('Error loading BSK data:', error);
      // Don't show toast, just log error and continue with default values
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('user_bsk_balances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading BSK balances:', error);
      // Set default balance instead of throwing
      setBalances({
        user_id: user.id,
        withdrawable_balance: 0,
        holding_balance: 0,
        lifetime_withdrawable_earned: 0,
        lifetime_holding_earned: 0,
        lifetime_withdrawn: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any);
      return;
    }

    if (!data) {
      // Initialize balance record
      const { data: newBalance, error: insertError } = await supabase
        .from('user_bsk_balances')
        .insert({ user_id: user.id })
        .select()
        .maybeSingle();

      if (insertError) {
        console.error('Error creating BSK balance:', insertError);
        // Set default balance instead of throwing
        setBalances({
          user_id: user.id,
          withdrawable_balance: 0,
          holding_balance: 0,
          total_earned_withdrawable: 0,
          total_earned_holding: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);
        return;
      }
      
      setBalances(newBalance as any);
    } else {
      setBalances(data as any);
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

    if (error) {
      console.error('Error loading withdrawable history:', error);
      setWithdrawableHistory([]);
      return;
    }
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

    if (error) {
      console.error('Error loading holding history:', error);
      setHoldingHistory([]);
      return;
    }
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
