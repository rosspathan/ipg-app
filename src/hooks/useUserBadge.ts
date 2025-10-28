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

      // PRIORITY 3: Check badge_thresholds for default/lowest badge
      console.log('🎖️ [useUserBadge] Step 3: Checking badge_thresholds for default badge...');
      const { data: thresholdData, error: thresholdError } = await supabase
        .from('badge_thresholds')
        .select('badge_name')
        .order('threshold_amount', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (thresholdError) {
        console.error('❌ [useUserBadge] Error fetching from badge_thresholds:', thresholdError);
      }

      if (thresholdData?.badge_name) {
        const rawBadge = thresholdData.badge_name;
        const normalizedBadge = normalizeBadgeName(rawBadge);
        console.log('ℹ️ [useUserBadge] Using DEFAULT badge from thresholds');
        console.log('   Raw badge from DB:', rawBadge);
        console.log('   Normalized badge:', normalizedBadge);
        setBadge(normalizedBadge);
        return;
      } else {
        console.log('⚠️ [useUserBadge] No default badge in badge_thresholds');
      }

      // FALLBACK: No badge found anywhere
      console.log('❌ [useUserBadge] No badge found in any table, defaulting to None');
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
