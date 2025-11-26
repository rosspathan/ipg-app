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

      // Fetch all commissions from unified_bsk_transactions VIEW
      const { data: txData, error } = await supabase
        .from('unified_bsk_transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('transaction_subtype', [
          'referral_commission_l1',
          'referral_commission_multi',
          'vip_milestone_reward'
        ])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const entries: CommissionHistoryEntry[] = (txData || []).map((tx: any) => {
        // Extract metadata
        const metadata = tx.metadata || {};
        const level = metadata.referral_level || (tx.transaction_subtype === 'referral_commission_l1' ? 1 : 2);
        
        // Determine commission type
        let commissionType: 'direct_commission' | 'team_income' | 'vip_milestone' = 'team_income';
        if (tx.transaction_subtype === 'referral_commission_l1') {
          commissionType = 'direct_commission';
        } else if (tx.transaction_subtype === 'vip_milestone_reward') {
          commissionType = 'vip_milestone';
        }

        // Extract event type from metadata or transaction name
        let eventType = metadata.event_type || 'unknown';
        if (tx.transaction_name?.includes('purchase')) {
          eventType = 'badge_purchase';
        } else if (tx.transaction_name?.includes('upgrade')) {
          eventType = 'badge_upgrade';
        } else if (tx.transaction_name?.includes('VIP')) {
          eventType = 'vip_milestone';
        }

        return {
          id: tx.transaction_id,
          payer_id: metadata.source_user_id || metadata.referee_id || '',
          payer_username: tx.sender_name || metadata.source_username || 'Unknown',
          payer_display_name: tx.sender_name || metadata.source_display_name || 'Unknown User',
          payer_badge: metadata.badge_purchased || metadata.to_badge || null,
          level: level,
          event_type: eventType,
          commission_type: commissionType,
          bsk_amount: Math.abs(Number(tx.bsk_amount || 0)),
          destination: tx.balance_type === 'withdrawable' ? 'withdrawable' : 'holding',
          created_at: tx.created_at,
          my_badge_at_event: metadata.my_badge_at_event || null,
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
