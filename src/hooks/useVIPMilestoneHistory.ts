import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface VIPMilestoneHistoryItem {
  id: string;
  milestone_id: string;
  vip_count_at_claim: number;
  bsk_rewarded: number;
  claimed_at: string | null;
  milestone: {
    vip_count_threshold: number;
    reward_type: string;
    reward_inr_value: number;
    reward_description: string | null;
  };
}

export function useVIPMilestoneHistory() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['vip-milestone-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_vip_milestone_claims')
        .select(`
          id,
          milestone_id,
          vip_count_at_claim,
          bsk_rewarded,
          claimed_at,
          vip_milestones!inner (
            vip_count_threshold,
            reward_type,
            reward_inr_value,
            reward_description
          )
        `)
        .eq('user_id', user.id)
        .order('claimed_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        milestone_id: item.milestone_id,
        vip_count_at_claim: item.vip_count_at_claim,
        bsk_rewarded: item.bsk_rewarded,
        claimed_at: item.claimed_at,
        milestone: Array.isArray(item.vip_milestones) 
          ? item.vip_milestones[0] 
          : item.vip_milestones as any
      })) as VIPMilestoneHistoryItem[];
    },
    enabled: !!user?.id,
  });
}
