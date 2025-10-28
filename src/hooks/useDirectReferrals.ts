import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

export interface DirectReferral {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email: string;
  join_date: string;
  badge_name: string | null;
  badge_purchased_at: string | null;
  total_earned: number;
  is_active: boolean;
}

export function useDirectReferrals() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['direct-referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch direct referrals (users where sponsor_id = current user)
      const { data: referrals, error: referralsError } = await supabase
        .from('referral_links_new')
        .select(`
          user_id,
          locked_at,
          total_referrals,
          total_commissions
        `)
        .eq('sponsor_id', user.id)
        .order('locked_at', { ascending: false });

      if (referralsError) throw referralsError;
      if (!referrals || referrals.length === 0) return [];

      const userIds = referrals.map(r => r.user_id);

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, email, display_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Fetch badge holdings for these users (latest badge per user)
      const { data: badges, error: badgesError } = await supabase
        .from('user_badge_holdings')
        .select('user_id, current_badge, purchased_at')
        .in('user_id', userIds)
        .order('purchased_at', { ascending: false });

      if (badgesError) throw badgesError;

      // Fetch commissions earned from each referral
      const { data: commissions, error: commissionsError } = await supabase
        .from('referral_commissions')
        .select('payer_id, bsk_amount')
        .eq('earner_id', user.id)
        .in('payer_id', userIds);

      if (commissionsError) throw commissionsError;

      // Aggregate commissions by payer
      const commissionsByPayer = commissions?.reduce((acc, c) => {
        acc[c.payer_id] = (acc[c.payer_id] || 0) + Number(c.bsk_amount);
        return acc;
      }, {} as Record<string, number>) || {};

      // Get latest badge per user (normalized)
      const latestBadges = badges?.reduce((acc, b) => {
        if (!acc[b.user_id] || new Date(b.purchased_at) > new Date(acc[b.user_id].purchased_at)) {
          acc[b.user_id] = {
            current_badge: b.current_badge,
            purchased_at: b.purchased_at
          };
        }
        return acc;
      }, {} as Record<string, { current_badge: string; purchased_at: string }>) || {};

      // Combine all data
      const result: DirectReferral[] = referrals.map(referral => {
        const profile = profiles?.find(p => p.user_id === referral.user_id);
        const badge = latestBadges[referral.user_id];
        const totalEarned = commissionsByPayer[referral.user_id] || 0;

        return {
          user_id: referral.user_id,
          username: profile?.username || null,
          display_name: profile?.display_name || null,
          email: profile?.email || '',
          join_date: referral.locked_at,
          badge_name: badge?.current_badge || null,
          badge_purchased_at: badge?.purchased_at || null,
          total_earned: totalEarned,
          is_active: !!badge, // Consider active if has a badge
        };
      });

      return result;
    },
    enabled: !!user?.id,
  });
}
