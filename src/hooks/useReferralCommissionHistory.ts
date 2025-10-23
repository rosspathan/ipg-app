import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

export interface CommissionHistoryEntry {
  id: string;
  payer_id: string;
  payer_username: string;
  payer_display_name: string;
  payer_badge: string | null;
  level: number;
  event_type: string;
  bsk_amount: number;
  destination: 'withdrawable' | 'holding';
  created_at: string;
  my_badge_at_event: string | null;
}

export interface LevelSummary {
  level: number;
  total_earned: number;
  total_people: number;
  latest_commission: string | null;
}

export interface CommissionStats {
  totalEarned: number;
  activeLevels: number;
  topLevel: number;
  thisMonthEarnings: number;
  levelSummaries: LevelSummary[];
}

export function useReferralCommissionHistory() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['referral-commission-history', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // Fetch all commissions earned by current user
      const { data: commissions, error } = await supabase
        .from('referral_commissions')
        .select(`
          id,
          payer_id,
          level,
          event_type,
          bsk_amount,
          destination,
          created_at,
          my_badge_at_event,
          payer:profiles!referral_commissions_payer_id_fkey(
            username,
            display_name,
            user_badge_holdings(current_badge)
          )
        `)
        .eq('earner_id', user.id)
        .eq('status', 'settled')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const entries: CommissionHistoryEntry[] = commissions.map((c: any) => ({
        id: c.id,
        payer_id: c.payer_id,
        payer_username: c.payer?.username || 'Unknown',
        payer_display_name: c.payer?.display_name || 'Unknown User',
        payer_badge: c.payer?.user_badge_holdings?.[0]?.current_badge || null,
        level: c.level,
        event_type: c.event_type,
        bsk_amount: c.bsk_amount,
        destination: c.destination,
        created_at: c.created_at,
        my_badge_at_event: c.my_badge_at_event,
      }));

      // Calculate level summaries
      const levelMap = new Map<number, { total: number; people: Set<string>; latest: string | null }>();
      
      entries.forEach(entry => {
        if (!levelMap.has(entry.level)) {
          levelMap.set(entry.level, { total: 0, people: new Set(), latest: null });
        }
        const levelData = levelMap.get(entry.level)!;
        levelData.total += entry.bsk_amount;
        levelData.people.add(entry.payer_id);
        if (!levelData.latest || entry.created_at > levelData.latest) {
          levelData.latest = entry.created_at;
        }
      });

      const levelSummaries: LevelSummary[] = Array.from(levelMap.entries())
        .map(([level, data]) => ({
          level,
          total_earned: data.total,
          total_people: data.people.size,
          latest_commission: data.latest,
        }))
        .sort((a, b) => a.level - b.level);

      // Calculate stats
      const totalEarned = entries.reduce((sum, e) => sum + e.bsk_amount, 0);
      const activeLevels = levelSummaries.length;
      const topLevel = levelSummaries.reduce((max, l) => 
        l.total_earned > (levelSummaries.find(s => s.level === max)?.total_earned || 0) ? l.level : max, 
        1
      );

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thisMonthEarnings = entries
        .filter(e => new Date(e.created_at) >= thirtyDaysAgo)
        .reduce((sum, e) => sum + e.bsk_amount, 0);

      const stats: CommissionStats = {
        totalEarned,
        activeLevels,
        topLevel,
        thisMonthEarnings,
        levelSummaries,
      };

      return { entries, stats };
    },
    enabled: !!user?.id,
  });
}
