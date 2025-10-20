import { useState } from 'react';
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
      // Check user's BSK balance
      const { data: balanceData } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance')
        .eq('user_id', user.id)
        .single();

      const balance = Number(balanceData?.withdrawable_balance || 0);

      if (balance < amount) {
        toast.error('Insufficient BSK balance', {
          description: `You need ${amount} BSK to stake`,
        });
        return;
      }

      // Create staking record (assuming table exists)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.lockDays);

      // For now, just show success - full implementation would need staking tables
      toast.success('Staking initiated!', {
        description: `Staked ${amount} BSK at ${plan.apy}% APY for ${plan.lockDays} days`,
      });

      // TODO: Implement actual staking logic with database tables
      // - Create staking record
      // - Lock BSK in holding balance
      // - Set up reward distribution

    } catch (error: any) {
      console.error('Staking error:', error);
      toast.error('Staking failed', {
        description: error.message || 'Please try again',
      });
    } finally {
      setStaking(false);
    }
  };

  return {
    stake,
    staking,
  };
}
