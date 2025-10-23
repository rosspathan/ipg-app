import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

export interface SponsorInfo {
  sponsor_id: string | null;
  sponsor_code_used: string | null;
  join_date: string;
  sponsor_username: string | null;
  sponsor_display_name: string | null;
  sponsor_badge: string | null;
  total_earned_for_sponsor: number;
}

export function useSponsorInfo() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['sponsor-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch the user's referral link info to get sponsor
      const { data: referralLink, error: referralError } = await supabase
        .from('referral_links_new')
        .select('sponsor_id, sponsor_code_used, locked_at')
        .eq('user_id', user.id)
        .single();

      if (referralError) throw referralError;
      if (!referralLink || !referralLink.sponsor_id) {
        // Independent member (no sponsor)
        return null;
      }

      // Fetch sponsor's profile
      const { data: sponsorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('user_id', referralLink.sponsor_id)
        .single();

      if (profileError) throw profileError;

      // Fetch sponsor's latest badge
      const { data: sponsorBadges, error: badgeError } = await supabase
        .from('user_badge_holdings')
        .select('current_badge, purchased_at')
        .eq('user_id', referralLink.sponsor_id)
        .order('purchased_at', { ascending: false })
        .limit(1);

      if (badgeError) throw badgeError;

      // Calculate total commissions earned by sponsor from this user
      const { data: commissions, error: commissionsError } = await supabase
        .from('referral_commissions')
        .select('bsk_amount')
        .eq('earner_id', referralLink.sponsor_id)
        .eq('payer_id', user.id);

      if (commissionsError) throw commissionsError;

      const totalEarnedForSponsor = commissions?.reduce(
        (sum, c) => sum + Number(c.bsk_amount),
        0
      ) || 0;

      const result: SponsorInfo = {
        sponsor_id: referralLink.sponsor_id,
        sponsor_code_used: referralLink.sponsor_code_used,
        join_date: referralLink.locked_at,
        sponsor_username: sponsorProfile?.username || null,
        sponsor_display_name: sponsorProfile?.display_name || null,
        sponsor_badge: sponsorBadges?.[0]?.current_badge || null,
        total_earned_for_sponsor: totalEarnedForSponsor,
      };

      return result;
    },
    enabled: !!user?.id,
  });
}
