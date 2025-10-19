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
    let effectiveUserId = user?.id;

    // If no Supabase user but we have a Web3 wallet, try to find user by wallet address
    if (!effectiveUserId && wallet?.address) {
      console.log('[BSK Balance] No Supabase session - attempting Web3 wallet lookup:', wallet.address);
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('wallet_address', wallet.address)
          .maybeSingle();
        
        if (profile?.user_id) {
          effectiveUserId = profile.user_id;
          console.log('[BSK Balance] Found user via wallet address:', effectiveUserId);
        } else {
          console.log('[BSK Balance] No profile found for wallet:', wallet.address);
        }
      } catch (lookupError) {
        console.error('[BSK Balance] Error looking up user by wallet:', lookupError);
      }
    }

    if (!effectiveUserId) {
      console.log('[BSK Balance] No user ID available (neither Supabase auth nor wallet lookup)');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch BSK balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_bsk_balances')
        .select('*')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (balanceError && balanceError.code !== 'PGRST116') {
        throw balanceError;
      }

      if (!balanceData) {
        // Create initial balance record
        const { data: newBalance, error: createError } = await supabase
          .from('user_bsk_balances')
          .insert({
            user_id: effectiveUserId,
            withdrawable_balance: 0,
            holding_balance: 0,
            total_earned_withdrawable: 0,
            total_earned_holding: 0,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating BSK balance:', createError);
        }

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
          .eq('user_id', effectiveUserId)
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
    // Use user.id if available, otherwise try wallet address lookup
    const subscriptionKey = user?.id || wallet?.address;
    
    if (subscriptionKey) {
      const channel = supabase
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

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, wallet?.address]);

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
