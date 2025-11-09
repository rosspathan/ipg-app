import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

/**
 * useHomePageData - Batch all home page data fetching for optimal performance
 * Single query prevents cascading re-renders and flicker
 */
export function useHomePageData() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['home-page-data', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          balance: null,
          recentActivity: [],
          displayName: 'User',
        };
      }

      // Parallel fetch all data at once
      const [balanceResult, withdrawableTx, holdingTx] = await Promise.all([
        supabase
          .from('user_bsk_balances')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('bsk_withdrawable_ledger')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('bsk_holding_ledger')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // Process balance with today/week calculations
      let balanceStats = {
        withdrawable: 0,
        holding: 0,
        total: 0,
        earnedWithdrawable: 0,
        earnedHolding: 0,
        todayEarned: 0,
        weekEarned: 0,
      };

      if (balanceResult.data) {
        const withdrawable = Number(balanceResult.data.withdrawable_balance || 0);
        const holding = Number(balanceResult.data.holding_balance || 0);

        // Calculate today's and week's earnings
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

        balanceStats = {
          withdrawable,
          holding,
          total: withdrawable + holding,
          earnedWithdrawable: Number(balanceResult.data.total_earned_withdrawable || 0),
          earnedHolding: Number(balanceResult.data.total_earned_holding || 0),
          todayEarned,
          weekEarned,
        };
      }

      // Combine and sort activity
      const combined = [
        ...(withdrawableTx.data || []).map((tx) => ({ ...tx, source: 'withdrawable' })),
        ...(holdingTx.data || []).map((tx) => ({ ...tx, source: 'holding' })),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      // Extract display name from user email
      const displayName = user.email?.split('@')[0] || 'User';

      return {
        balance: balanceStats,
        recentActivity: combined,
        displayName,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
    refetchOnWindowFocus: false, // Don't refetch on tab switch (prevents flicker)
  });
}
