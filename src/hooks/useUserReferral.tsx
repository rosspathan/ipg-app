import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./useAuthUser";

interface ReferralStats {
  referral_code: string;
  direct_referrals: number;
  total_earnings_bsk: number;
  referral_link: string;
}

/**
 * Hook to fetch user's referral code and stats
 */
export function useUserReferral() {
  const { user } = useAuthUser();

  const { data: referralStats, isLoading, error, refetch } = useQuery<ReferralStats>({
    queryKey: ['user-referral-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .rpc('get_user_referral_stats', { p_user_id: user.id });

      if (error) {
        console.error("Error fetching referral stats:", error);
        throw error;
      }

      // Parse the JSONB result
      const stats = data as unknown as ReferralStats;
      return stats;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  const copyReferralLink = async () => {
    if (!referralStats?.referral_link) return false;

    try {
      await navigator.clipboard.writeText(referralStats.referral_link);
      return true;
    } catch (error) {
      console.error("Failed to copy referral link:", error);
      return false;
    }
  };

  const shareReferralLink = async () => {
    if (!referralStats?.referral_link) return false;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join IPG I-SMART',
          text: 'Join me on IPG I-SMART and start earning BSK tokens!',
          url: referralStats.referral_link
        });
        return true;
      } else {
        // Fallback to copy
        return await copyReferralLink();
      }
    } catch (error) {
      console.error("Failed to share referral link:", error);
      return false;
    }
  };

  return {
    referralCode: referralStats?.referral_code || '',
    referralLink: referralStats?.referral_link || '',
    directReferrals: referralStats?.direct_referrals || 0,
    totalEarnings: referralStats?.total_earnings_bsk || 0,
    isLoading,
    error,
    refetch,
    copyReferralLink,
    shareReferralLink,
  };
}
