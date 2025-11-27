import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface VIPMilestoneProgressData {
  isUserVIP: boolean;
  directVIPCount: number;
  totalTeamVIPCount: number;
}

interface VIPStatsRPCResult {
  is_user_vip: boolean;
  direct_vip_count: number;
  total_team_vip_count: number;
}

/**
 * Hook to fetch real-time VIP milestone progress using the RPC function
 * This replaces reading from the empty user_vip_milestones table
 */
export function useVIPMilestoneProgress() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['vip-milestone-progress', user?.id],
    queryFn: async (): Promise<VIPMilestoneProgressData> => {
      if (!user?.id) {
        return {
          isUserVIP: false,
          directVIPCount: 0,
          totalTeamVIPCount: 0
        };
      }

      const { data, error } = await supabase
        .rpc('get_vip_referral_stats', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching VIP milestone progress:', error);
        throw error;
      }

      const result = data as unknown as VIPStatsRPCResult;

      return {
        isUserVIP: result?.is_user_vip || false,
        directVIPCount: result?.direct_vip_count || 0,
        totalTeamVIPCount: result?.total_team_vip_count || 0
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}
