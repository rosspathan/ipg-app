import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface StakingPlan {
  id: string;
  name: string;
  apy: number;
  minStake: number;
  lockDays: number;
}

export function useStaking() {
  const { user } = useAuthUser();
  const [staking, setStaking] = useState(false);

  const stake = async (plan: StakingPlan, amount: number) => {
    if (!user?.id) {
      toast.error('Please sign in to stake');
      return;
    }

    if (amount < plan.minStake) {
      toast.error(`Minimum stake is ${plan.minStake} BSK`);
      return;
    }

    setStaking(true);
    try {
      // 1. Check user's BSK balance
      const { data: balanceData } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance, holding_balance')
        .eq('user_id', user.id)
        .single();

      const withdrawable = Number(balanceData?.withdrawable_balance || 0);
      const holding = Number(balanceData?.holding_balance || 0);

      if (withdrawable < amount) {
        toast.error('Insufficient BSK balance', {
          description: `You need ${amount} BSK to stake`,
        });
        return;
      }

      // 2. Find matching BSK staking pool
      const { data: pool } = await supabase
        .from('staking_pools')
        .select('*')
        .eq('staking_type', 'bsk')
        .eq('active', true)
        .gte('apy', plan.apy - 1)
        .lte('apy', plan.apy + 1)
        .gte('lock_period_days', plan.lockDays - 5)
        .lte('lock_period_days', plan.lockDays + 5)
        .maybeSingle();

      if (!pool) {
        toast.error('Staking pool not available', {
          description: 'Please try again later',
        });
        return;
      }

      // 3. Move BSK from withdrawable to holding balance
      const { error: balanceError } = await supabase
        .from('user_bsk_balances')
        .update({
          withdrawable_balance: withdrawable - amount,
          holding_balance: holding + amount,
        })
        .eq('user_id', user.id);

      if (balanceError) throw balanceError;

      // 4. Create staking submission record (auto-approved for BSK)
      const { error: stakingError } = await supabase
        .from('user_staking_submissions')
        .insert([{
          user_id: user.id,
          pool_id: pool.id,
          user_email: user.email || '',
          stake_amount: amount,
          currency: 'BSK',
          screenshot_url: '',
          admin_bep20_address: '',
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        }]);

      if (stakingError) throw stakingError;

      // 5. Log transaction in insurance_bsk_ledger
      await supabase.from('insurance_bsk_ledger').insert([{
        user_id: user.id,
        type: 'staking_deposit',
        bsk_amount: -amount,
        inr_amount: 0,
        plan_type: plan.name,
        rate_snapshot: 1,
        destination: 'holding',
      }]);

      // 6. Update pool's current_staked amount
      await supabase
        .from('staking_pools')
        .update({
          current_staked: Number(pool.current_staked || 0) + amount,
        })
        .eq('id', pool.id);

      toast.success('Staking successful!', {
        description: `Staked ${amount} BSK at ${plan.apy}% APY for ${plan.lockDays} days`,
      });

      refetchStakes();

    } catch (error: any) {
      console.error('Staking error:', error);
      toast.error('Staking failed', {
        description: error.message || 'Please try again',
      });
    } finally {
      setStaking(false);
    }
  };

  const { data: activeStakes, refetch: refetchStakes } = useQuery({
    queryKey: ['user-stakes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data } = await supabase
        .from('user_staking_submissions')
        .select(`
          *,
          staking_pools(name, apy, lock_period_days, reward_distribution)
        `)
        .eq('user_id', user.id)
        .eq('currency', 'BSK')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  return {
    stake,
    staking,
    activeStakes,
    refetchStakes,
  };
}
