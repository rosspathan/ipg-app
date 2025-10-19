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
        // Normalize wallet address to lowercase for consistent matching
        const normalizedAddress = wallet.address.toLowerCase();
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('wallet_address', normalizedAddress)
          .maybeSingle();
        
        if (profile?.user_id) {
          effectiveUserId = profile.user_id;
          console.log('[BSK Balance] Found user via wallet address:', effectiveUserId);
        } else {
          console.log('[BSK Balance] No profile found for wallet, trying edge function fallback...');
          
          // Fallback: Use edge function to get balance by wallet
          try {
            const { data: edgeData, error: edgeError } = await supabase.functions.invoke('bsk-balance-by-wallet', {
              body: { wallet: wallet.address }
            });

            if (edgeError) {
              console.error('[BSK Balance] Edge function error:', edgeError);
            } else if (edgeData?.linked) {
              console.log('[BSK Balance] ✅ Using edge fallback - balance loaded:', edgeData);
              setBalance({
                withdrawable: Number(edgeData.withdrawable_balance || 0),
                holding: Number(edgeData.holding_balance || 0),
                total: Number(edgeData.withdrawable_balance || 0) + Number(edgeData.holding_balance || 0),
                earnedWithdrawable: Number(edgeData.total_earned_withdrawable || 0),
                earnedHolding: Number(edgeData.total_earned_holding || 0),
                todayEarned: Number(edgeData.today_earned || 0),
                weekEarned: Number(edgeData.week_earned || 0),
              });
              setLoading(false);
              return;
            }
          } catch (fallbackError) {
            console.error('[BSK Balance] Fallback edge function failed:', fallbackError);
          }
        }
      } catch (lookupError) {
        console.error('[BSK Balance] Error looking up user by wallet:', lookupError);
      }
    }

    if (!effectiveUserId) {
      console.log('[BSK Balance] No user ID available - waiting for session or wallet link');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[BSK Balance] Session detected - fetching from user_bsk_balances for user:', effectiveUserId);

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

    // Listen for session restoration event
    const handleSessionRestored = () => {
      console.log('[BSK Balance] Session restored event received - refetching balance');
      fetchBalance();
    };
    window.addEventListener('auth:session:restored', handleSessionRestored);

    // Set up wallet-only polling (when no session but wallet available)
    let pollInterval: NodeJS.Timeout | null = null;
    if (!user?.id && wallet?.address) {
      console.log('[BSK Balance] Starting wallet-only polling (every 30s)');
      pollInterval = setInterval(() => {
        console.log('[BSK Balance] Polling with wallet address...');
        fetchBalance();
      }, 30000); // Poll every 30 seconds
    }

    // Set up realtime subscription for balance updates
    // Use user.id if available, otherwise try wallet address lookup
    const subscriptionKey = user?.id || wallet?.address;
    
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (subscriptionKey) {
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
      window.removeEventListener('auth:session:restored', handleSessionRestored);
      if (pollInterval) {
        console.log('[BSK Balance] Cleaning up wallet-only polling');
        clearInterval(pollInterval);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
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
