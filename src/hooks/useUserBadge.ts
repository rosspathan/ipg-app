import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { normalizeBadgeName } from '@/lib/badgeUtils';

export const useUserBadge = () => {
  const { user } = useAuthUser();
  const [badge, setBadge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBadge = async () => {
    if (!user) {
      console.log('🎖️ [useUserBadge] No user authenticated, setting badge to None');
      setBadge('None');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🎖️ [useUserBadge] Fetching badge for user:', user.id);
      
      // PRIORITY 1: Check user_badge_holdings (PURCHASED badges - highest priority)
      console.log('🎖️ [useUserBadge] Step 1: Checking user_badge_holdings for purchased badge...');
      const { data: holdingData, error: holdingError } = await supabase
        .from('user_badge_holdings')
        .select('current_badge')
        .eq('user_id', user.id)
        .maybeSingle();

      if (holdingError) {
        console.error('❌ [useUserBadge] Error fetching from user_badge_holdings:', holdingError);
      }

      if (holdingData?.current_badge) {
        const rawBadge = holdingData.current_badge;
        const normalizedBadge = normalizeBadgeName(rawBadge);
        console.log('✅ [useUserBadge] PURCHASED badge found!');
        console.log('   Raw badge from DB:', rawBadge);
        console.log('   Normalized badge:', normalizedBadge);
        setBadge(normalizedBadge);
        return;
      } else {
        console.log('⚠️ [useUserBadge] No purchased badge in user_badge_holdings');
      }

      // PRIORITY 2: Check user_badge_status (QUALIFIED badges)
      console.log('🎖️ [useUserBadge] Step 2: Checking user_badge_status for qualified badge...');
      const { data: statusData, error: statusError } = await supabase
        .from('user_badge_status')
        .select('current_badge')
        .eq('user_id', user.id)
        .maybeSingle();

      if (statusError) {
        console.error('❌ [useUserBadge] Error fetching from user_badge_status:', statusError);
      }

      if (statusData?.current_badge) {
        const rawBadge = statusData.current_badge;
        const normalizedBadge = normalizeBadgeName(rawBadge);
        console.log('⚠️ [useUserBadge] QUALIFIED badge found (not purchased)');
        console.log('   Raw badge from DB:', rawBadge);
        console.log('   Normalized badge:', normalizedBadge);
        setBadge(normalizedBadge);
        return;
      } else {
        console.log('⚠️ [useUserBadge] No qualified badge in user_badge_status');
      }

      // PRIORITY 3: NO DEFAULT BADGE - User must purchase or qualify
      console.log('🎖️ [useUserBadge] No purchased or qualified badge found');
      console.log('✅ [useUserBadge] Setting badge to None (user must purchase)');
      console.log('📌 [useUserBadge] Badge will only show if explicitly purchased or qualified');
      setBadge('None');
    } catch (error) {
      console.error('❌ [useUserBadge] Critical error in fetchBadge:', error);
      setBadge('None');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadge();
  }, [user]);

  return {
    badge,
    loading,
    refetch: fetchBadge
  };
};
