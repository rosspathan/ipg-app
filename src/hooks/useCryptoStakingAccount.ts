import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { toast } from 'sonner';

export interface StakingPlan {
  id: string;
  name: string;
  min_amount: number;
  max_amount: number | null;
  monthly_reward_percent: number;
  lock_period_days: number;
  currency: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StakingAccount {
  id: string;
  user_id: string;
  currency: string;
  available_balance: number;
  staked_balance: number;
  total_rewards_earned: number;
  created_at: string;
  updated_at: string;
}

export interface UserStake {
  id: string;
  user_id: string;
  plan_id: string;
  staking_account_id: string;
  stake_amount: number;
  fee_paid: number;
  monthly_reward_percent: number;
  currency: string;
  status: string;
  staked_at: string;
  lock_until: string;
  last_reward_at: string | null;
  total_rewards: number;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
  plan?: StakingPlan;
}

export interface StakingLedgerEntry {
  id: string;
  user_id: string;
  staking_account_id: string | null;
  stake_id: string | null;
  tx_type: string;
  amount: number;
  fee_amount: number;
  currency: string;
  balance_before: number;
  balance_after: number;
  tx_hash: string | null;
  notes: string | null;
  metadata: any;
  created_at: string;
}

export interface StakingConfig {
  id: string;
  admin_hot_wallet_address: string | null;
  staking_fee_percent: number;
  unstaking_fee_percent: number;
  min_stake_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCryptoStakingAccount() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  // Fetch staking config (global settings)
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['staking-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crypto_staking_config')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as StakingConfig | null;
    }
  });

  // Fetch staking plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['staking-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crypto_staking_plans')
        .select('*')
        .eq('is_active', true)
        .order('min_amount', { ascending: true });
      
      if (error) throw error;
      return data as StakingPlan[];
    }
  });

  // Fetch user's staking account
  const { data: account, isLoading: accountLoading, refetch: refetchAccount } = useQuery({
    queryKey: ['user-staking-account', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_staking_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as StakingAccount | null;
    },
    enabled: !!user?.id
  });

  // Fetch user's active stakes
  const { data: activeStakes, isLoading: stakesLoading, refetch: refetchStakes } = useQuery({
    queryKey: ['user-active-stakes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_crypto_stakes')
        .select(`
          *,
          plan:crypto_staking_plans(*)
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserStake[];
    },
    enabled: !!user?.id
  });

  // Fetch staking ledger history
  const { data: ledger, isLoading: ledgerLoading, refetch: refetchLedger } = useQuery({
    queryKey: ['staking-ledger', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('crypto_staking_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as StakingLedgerEntry[];
    },
    enabled: !!user?.id
  });

  // Create stake mutation
  const createStakeMutation = useMutation({
    mutationFn: async ({ planId, amount }: { planId: string; amount: number }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Call edge function to process staking
      const { data, error } = await supabase.functions.invoke('process-staking-stake', {
        body: { plan_id: planId, amount }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-staking-account'] });
      queryClient.invalidateQueries({ queryKey: ['user-active-stakes'] });
      queryClient.invalidateQueries({ queryKey: ['staking-ledger'] });
      toast.success('Staking successful!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to stake');
    }
  });

  // Unstake mutation
  const unstakeMutation = useMutation({
    mutationFn: async ({ stakeId }: { stakeId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('process-staking-unstake', {
        body: { stake_id: stakeId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-staking-account'] });
      queryClient.invalidateQueries({ queryKey: ['user-active-stakes'] });
      queryClient.invalidateQueries({ queryKey: ['staking-ledger'] });
      toast.success('Unstaked successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unstake');
    }
  });

  // Early unstake mutation (with 10% penalty, rewards forfeited)
  const earlyUnstakeMutation = useMutation({
    mutationFn: async ({ stakeId }: { stakeId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('process-staking-early-unstake', {
        body: { stake_id: stakeId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-staking-account'] });
      queryClient.invalidateQueries({ queryKey: ['user-active-stakes'] });
      queryClient.invalidateQueries({ queryKey: ['staking-ledger'] });
      toast.success(`Early exit: ${Number(data.returned_amount).toFixed(4)} IPG returned`, {
        description: `${Number(data.penalty).toFixed(4)} IPG penalty + ${Number(data.rewards_forfeited).toFixed(4)} IPG rewards forfeited`
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to early unstake');
    }
  });

  return {
    // Data
    config,
    plans: plans || [],
    account,
    activeStakes: activeStakes || [],
    ledger: ledger || [],
    
    // Loading states
    isLoading: configLoading || plansLoading || accountLoading,
    plansLoading,
    accountLoading,
    stakesLoading,
    ledgerLoading,
    
    // Computed values
    depositAddress: config?.admin_hot_wallet_address || null,
    stakingFee: config?.staking_fee_percent || 0.5,
    unstakingFee: config?.unstaking_fee_percent || 0.5,
    earlyUnstakePenalty: 10, // 10% penalty + rewards forfeited
    isEnabled: config?.is_active ?? true,
    availableBalance: account?.available_balance || 0,
    stakedBalance: account?.staked_balance || 0,
    totalEarned: account?.total_rewards_earned || 0,
    
    // Actions
    createStake: createStakeMutation.mutate,
    unstake: unstakeMutation.mutate,
    earlyUnstake: earlyUnstakeMutation.mutate,
    isStaking: createStakeMutation.isPending,
    isUnstaking: unstakeMutation.isPending,
    isEarlyUnstaking: earlyUnstakeMutation.isPending,
    
    // Refetch
    refetchAccount,
    refetchStakes,
    refetchLedger,
    refetchAll: () => {
      refetchAccount();
      refetchStakes();
      refetchLedger();
    }
  };
}
