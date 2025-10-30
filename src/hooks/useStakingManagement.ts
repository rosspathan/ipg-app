import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StakingPool {
  id: string;
  name: string;
  apy_percent: number;
  lock_period_days: number | null;
  min_stake_amount: number;
  max_stake_amount: number | null;
  total_staked: number;
  pool_capacity: number | null;
  status: 'active' | 'paused' | 'closed';
  created_at: string;
}

export function useStakingManagement() {
  const queryClient = useQueryClient();

  const { data: pools, isLoading: poolsLoading } = useQuery({
    queryKey: ['staking-pools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staking_pools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    }
  });

  const { data: stakes } = useQuery({
    queryKey: ['active-stakes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_staking_submissions')
        .select(`
          *,
          pool:staking_pools(*),
          user:profiles(username, display_name)
        `)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createPool = useMutation({
    mutationFn: async (newPool: Partial<StakingPool>) => {
      const { data, error } = await supabase
        .from('staking_pools')
        .insert([{ ...newPool, current_staked: 0, active: true } as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staking-pools'] });
      toast.success('Staking pool created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create pool: ${error.message}`);
    }
  });

  const updatePool = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StakingPool> & { id: string }) => {
      const { data, error } = await supabase
        .from('staking_pools')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staking-pools'] });
      toast.success('Pool updated successfully');
    }
  });

  const deletePool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staking_pools')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staking-pools'] });
      toast.success('Pool deleted successfully');
    }
  });

  return {
    pools: pools || [],
    stakes: stakes || [],
    isLoading: poolsLoading,
    createPool: createPool.mutate,
    updatePool: updatePool.mutate,
    deletePool: deletePool.mutate
  };
}
