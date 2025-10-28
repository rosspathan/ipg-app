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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Try user_badge_holdings first (for purchased badges)
      const { data: holdingData } = await supabase
        .from('user_badge_holdings')
        .select('current_badge')
        .eq('user_id', user.id)
        .maybeSingle();

      if (holdingData?.current_badge) {
        setBadge(normalizeBadgeName(holdingData.current_badge));
        return;
      }

      // Fall back to user_badge_status (for qualification-based badges)
      const { data: statusData } = await supabase
        .from('user_badge_status')
        .select('current_badge')
        .eq('user_id', user.id)
        .maybeSingle();

      if (statusData?.current_badge) {
        setBadge(normalizeBadgeName(statusData.current_badge));
        return;
      }

      // Check badge_thresholds for default badge
      const { data: thresholdData } = await supabase
        .from('badge_thresholds')
        .select('badge_name')
        .order('threshold_amount', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (thresholdData?.badge_name) {
        setBadge(normalizeBadgeName(thresholdData.badge_name));
        return;
      }

      // Default to None if no badge found
      setBadge('None');
    } catch (error) {
      console.error('Error fetching user badge:', error);
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
