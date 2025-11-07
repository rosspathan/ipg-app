import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeBSKBalance } from '@/hooks/useRealtimeBSKBalance';

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

  const loadBalances = useCallback(async () => {
    if (!user?.id) return;

    console.log('[BSK] Fetching balance for user:', user.id);

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
      
      setBalances({
        user_id: (newBalance as any)?.user_id || user.id,
        withdrawable_balance: Number((newBalance as any)?.withdrawable_balance || 0),
        holding_balance: Number((newBalance as any)?.holding_balance || 0),
        lifetime_withdrawable_earned: Number((newBalance as any)?.total_earned_withdrawable ?? (newBalance as any)?.lifetime_withdrawable_earned ?? 0),
        lifetime_holding_earned: Number((newBalance as any)?.total_earned_holding ?? (newBalance as any)?.lifetime_holding_earned ?? 0),
        lifetime_withdrawn: Number((newBalance as any)?.lifetime_withdrawn ?? 0),
        created_at: (newBalance as any)?.created_at || new Date().toISOString(),
        updated_at: (newBalance as any)?.updated_at || new Date().toISOString()
      } as any);
    } else {
      const balanceData = {
        user_id: (data as any)?.user_id || user.id,
        withdrawable_balance: Number((data as any)?.withdrawable_balance || 0),
        holding_balance: Number((data as any)?.holding_balance || 0),
        lifetime_withdrawable_earned: Number((data as any)?.total_earned_withdrawable ?? (data as any)?.lifetime_withdrawable_earned ?? 0),
        lifetime_holding_earned: Number((data as any)?.total_earned_holding ?? (data as any)?.lifetime_holding_earned ?? 0),
        lifetime_withdrawn: Number((data as any)?.lifetime_withdrawn ?? 0),
        created_at: (data as any)?.created_at || new Date().toISOString(),
        updated_at: (data as any)?.updated_at || new Date().toISOString()
      } as any;
      
      console.log('[BSK] ✅ Loaded:', balanceData.withdrawable_balance, 'withdrawable,', balanceData.holding_balance, 'holding');
      setBalances(balanceData);
    }
  }, [user?.id]);

  // Subscribe to real-time balance updates
  useRealtimeBSKBalance(user?.id, loadBalances);

  useEffect(() => {
    // If no authenticated user, wait for session restoration before showing zeros
    if (!user?.id) {
      setLoading(true);
      
      // Wait 3 seconds for session restoration before showing zeros
      const timeout = setTimeout(() => {
        if (!user?.id) {
          console.log('[BSK] No session after 3s, showing zeros');
          setBalances({
            user_id: 'anonymous',
            withdrawable_balance: 0,
            holding_balance: 0,
            lifetime_withdrawable_earned: 0,
            lifetime_holding_earned: 0,
            lifetime_withdrawn: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any);
          setWithdrawableHistory([]);
          setHoldingHistory([]);
          setLoading(false);
        }
      }, 3000);
      
      return () => clearTimeout(timeout);
    }

    console.log('[BSK] User session detected, loading data for:', user.id);
    loadData();
  }, [user?.id]);

  // Listen for session restoration events
  useEffect(() => {
    const handleSessionRestored = (event: any) => {
      console.log('[BSK] Session restored event received, refreshing data');
      loadData();
    };

    window.addEventListener('auth:session:restored', handleSessionRestored);
    return () => window.removeEventListener('auth:session:restored', handleSessionRestored);
  }, []);

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
    getCurrentBSKRate,
    refresh: loadData  // Expose refresh function
  };
};
