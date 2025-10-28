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
  commission_type: 'direct_commission' | 'team_income' | 'vip_milestone';
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
  directCommissionTotal: number;
  teamIncomeTotal: number;
  vipMilestoneTotal: number;
  commissionsByType: {
    direct_commission: CommissionHistoryEntry[];
    team_income: CommissionHistoryEntry[];
    vip_milestone: CommissionHistoryEntry[];
  };
}

export function useReferralCommissionHistory() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['referral-commission-history', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // Fetch all commissions earned by current user from referral_ledger
      const { data: ledgerData, error } = await supabase
        .from('referral_ledger')
        .select(`
          id,
          source_user_id,
          depth,
          bsk_amount,
          trigger_type,
          badge_at_event,
          created_at,
          source:profiles!referral_ledger_source_user_id_fkey(
            username,
            display_name
          )
        `)
        .eq('referrer_id', user.id)
        .eq('ledger_type', 'referral')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch badge info for all source users
      const sourceIds = [...new Set(ledgerData?.map(l => l.source_user_id) || [])];
      const { data: badgeData } = await supabase
        .from('user_badge_holdings')
        .select('user_id, current_badge')
        .in('user_id', sourceIds);

      const badgeMap = new Map(badgeData?.map(b => [b.user_id, b.current_badge]) || []);

      // Transform data
      const entries: CommissionHistoryEntry[] = (ledgerData || []).map((c: any) => {
        const level = c.depth || 1;
        
        // Determine commission type based on level and trigger
        let commissionType: 'direct_commission' | 'team_income' | 'vip_milestone' = 'team_income';
        if (level === 1) {
          commissionType = 'direct_commission';
        } else if (c.trigger_type === 'vip_milestone') {
          commissionType = 'vip_milestone';
        }

        return {
          id: c.id,
          payer_id: c.source_user_id,
          payer_username: c.source?.username || 'Unknown',
          payer_display_name: c.source?.display_name || 'Unknown User',
          payer_badge: badgeMap.get(c.source_user_id) || null,
          level: level,
          event_type: c.trigger_type || 'unknown',
          commission_type: commissionType,
          bsk_amount: Number(c.bsk_amount || 0),
          destination: 'holding',
          created_at: c.created_at,
          my_badge_at_event: c.badge_at_event || null,
        };
      });

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

      // Group by commission type
      const commissionsByType = {
        direct_commission: entries.filter(e => e.commission_type === 'direct_commission'),
        team_income: entries.filter(e => e.commission_type === 'team_income'),
        vip_milestone: entries.filter(e => e.commission_type === 'vip_milestone'),
      };

      const directCommissionTotal = commissionsByType.direct_commission.reduce((sum, e) => sum + e.bsk_amount, 0);
      const teamIncomeTotal = commissionsByType.team_income.reduce((sum, e) => sum + e.bsk_amount, 0);
      const vipMilestoneTotal = commissionsByType.vip_milestone.reduce((sum, e) => sum + e.bsk_amount, 0);

      const stats: CommissionStats = {
        totalEarned,
        activeLevels,
        topLevel,
        thisMonthEarnings,
        levelSummaries,
        directCommissionTotal,
        teamIncomeTotal,
        vipMilestoneTotal,
        commissionsByType,
      };

      return { entries, stats };
    },
    enabled: !!user?.id,
  });
}
