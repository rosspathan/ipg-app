import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWeb3 } from '@/contexts/Web3Context';

interface BSKBalance {
  withdrawable_balance: number;
  holding_balance: number;
  total_earned_withdrawable: number;
  total_earned_holding: number;
  updated_at: string;
}

interface BSKBalanceStats {
  withdrawable: number;
  holding: number;
  total: number;
  earnedWithdrawable: number;
  earnedHolding: number;
  todayEarned: number;
  weekEarned: number;
}

export const useUserBSKBalance = () => {
  const { wallet } = useWeb3();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<BSKBalanceStats>({
    withdrawable: 0,
    holding: 0,
    total: 0,
    earnedWithdrawable: 0,
    earnedHolding: 0,
    todayEarned: 0,
    weekEarned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchBalance = async () => {
    // Auth-first: Use user.id as single source of truth
    if (!user?.id) {
      console.log('[BSK Balance] No authenticated user - balance unavailable');
      setBalance({
        withdrawable: 0,
        holding: 0,
        total: 0,
        earnedWithdrawable: 0,
        earnedHolding: 0,
        todayEarned: 0,
        weekEarned: 0,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[BSK Balance] Fetching from user_bsk_balances for user:', user.id);

      // Fetch BSK balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_bsk_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (balanceError && balanceError.code !== 'PGRST116') {
        throw balanceError;
      }

      if (!balanceData) {
        console.log('[BSK Balance] No balance record found - setting to zero (skip insert without session)');
        setBalance({
          withdrawable: 0,
          holding: 0,
          total: 0,
          earnedWithdrawable: 0,
          earnedHolding: 0,
          todayEarned: 0,
          weekEarned: 0,
        });
      } else {
        const withdrawable = Number(balanceData.withdrawable_balance || 0);
        const holding = Number(balanceData.holding_balance || 0);

        // Calculate today's and week's earnings from ledger
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const { data: recentLedger } = await supabase
          .from('insurance_bsk_ledger')
          .select('bsk_amount, created_at, type')
          .eq('user_id', user.id)
          .in('type', ['insurance_claim', 'ad_subscription', 'referral_commission'])
          .gte('created_at', weekStart.toISOString());

        let todayEarned = 0;
        let weekEarned = 0;

        if (recentLedger) {
          recentLedger.forEach((entry) => {
            const amount = Number(entry.bsk_amount || 0);
            weekEarned += amount;
            
            const entryDate = new Date(entry.created_at);
            if (entryDate >= todayStart) {
              todayEarned += amount;
            }
          });
        }

        console.log('[BSK Balance] ✅ Loaded from DB:', { withdrawable, holding });
        setBalance({
          withdrawable,
          holding,
          total: withdrawable + holding,
          earnedWithdrawable: Number(balanceData.total_earned_withdrawable || 0),
          earnedHolding: Number(balanceData.total_earned_holding || 0),
          todayEarned,
          weekEarned,
        });
      }
    } catch (err: any) {
      console.error('Error fetching BSK balance:', err);
      setError(err.message || 'Failed to load balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();

    // Set up realtime subscription for balance updates
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (user?.id) {
      channel = supabase
        .channel('bsk-balance-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_bsk_balances',
          },
          (payload) => {
            console.log('BSK balance updated:', payload);
            fetchBalance();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  const refresh = () => {
    fetchBalance();
  };

  return {
    balance,
    loading,
    error,
    refresh,
  };
};
