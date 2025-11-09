import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { normalizeBadgeName } from '@/lib/badgeUtils';

// Cache badge data to reduce API calls
const badgeCache = new Map<string, { badge: string; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export const useUserBadge = () => {
  const { user } = useAuthUser();
  const [badge, setBadge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchBadge = async () => {
    if (!user) {
      setBadge('None');
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) {
      return;
    }

    // Check cache first
    const cached = badgeCache.get(user.id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setBadge(cached.badge);
      setLoading(false);
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      
      // PRIORITY 1: Check user_badge_holdings (PURCHASED badges - highest priority)
      const { data: holdingData, error: holdingError } = await supabase
        .from('user_badge_holdings')
        .select('current_badge')
        .eq('user_id', user.id)
        .maybeSingle();

      if (holdingError) {
        console.error('❌ [useUserBadge] Error fetching from user_badge_holdings:', holdingError);
      }

      if (holdingData?.current_badge) {
        const normalizedBadge = normalizeBadgeName(holdingData.current_badge);
        badgeCache.set(user.id, { badge: normalizedBadge, timestamp: Date.now() });
        setBadge(normalizedBadge);
        return;
      }

      // PRIORITY 2: Check user_badge_status (QUALIFIED badges)
      const { data: statusData, error: statusError } = await supabase
        .from('user_badge_status')
        .select('current_badge')
        .eq('user_id', user.id)
        .maybeSingle();

      if (statusError) {
        console.error('❌ [useUserBadge] Error fetching from user_badge_status:', statusError);
      }

      if (statusData?.current_badge) {
        const normalizedBadge = normalizeBadgeName(statusData.current_badge);
        badgeCache.set(user.id, { badge: normalizedBadge, timestamp: Date.now() });
        setBadge(normalizedBadge);
        return;
      }

      // PRIORITY 3: NO DEFAULT BADGE - User must purchase or qualify
      const defaultBadge = 'None';
      badgeCache.set(user.id, { badge: defaultBadge, timestamp: Date.now() });
      setBadge(defaultBadge);
    } catch (error) {
      console.error('❌ [useUserBadge] Critical error in fetchBadge:', error);
      setBadge('None');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
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
