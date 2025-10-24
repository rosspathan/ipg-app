import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const VIP_MILESTONES = [
  { count: 10, reward: 10000, label: '10 VIPs' },
  { count: 50, reward: 50000, label: '50 VIPs' },
  { count: 100, reward: 100000, label: '100 VIPs' },
  { count: 250, reward: 200000, label: '250 VIPs' },
  { count: 500, reward: 500000, label: '500 VIPs' },
];

export function VIPMilestoneProgressCard() {
  const { user } = useAuthUser();

  const { data: vipData, isLoading } = useQuery({
    queryKey: ['vip-milestone-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check if user has VIP badge
      const { data: badge } = await supabase
        .from('user_badge_holdings')
        .select('current_badge')
        .eq('user_id', user.id)
        .maybeSingle();

      const isVIP = badge?.current_badge?.toUpperCase().includes('VIP') || 
                    badge?.current_badge?.toUpperCase().includes('SMART');

      if (!isVIP) return { isVIP: false, vipCount: 0, nextMilestone: null, claimed: [] };

      // Get direct referrals (Level 1)
      const { data: referrals } = await supabase
        .from('referral_tree')
        .select('user_id')
        .eq('ancestor_id', user.id)
        .eq('level', 1);

      if (!referrals || referrals.length === 0) {
        return { isVIP: true, vipCount: 0, nextMilestone: VIP_MILESTONES[0], claimed: [] };
      }

      // Count VIP badges among referrals
      const { data: vipReferrals } = await supabase
        .from('user_badge_holdings')
        .select('user_id, current_badge')
        .in('user_id', referrals.map(r => r.user_id));

      const vipCount = vipReferrals?.filter(b => {
        const badge = b.current_badge?.toUpperCase() || '';
        return badge.includes('VIP') || badge.includes('SMART');
      }).length || 0;

      // Get claimed milestones
      const { data: claims } = await supabase
        .from('user_vip_milestone_claims')
        .select('milestone_id, vip_count_at_claim')
        .eq('user_id', user.id);

      const claimedCounts = claims?.map(c => c.vip_count_at_claim) || [];

      // Find next unclaimed milestone
      const nextMilestone = VIP_MILESTONES.find(m => 
        vipCount < m.count && !claimedCounts.includes(m.count)
      );

      return { 
        isVIP: true, 
        vipCount, 
        nextMilestone: nextMilestone || null,
        claimed: claimedCounts 
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading || !vipData?.isVIP) {
    return null;
  }

  const { vipCount, nextMilestone, claimed } = vipData;
  const progressPercent = nextMilestone ? (vipCount / nextMilestone.count) * 100 : 100;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-purple-600" />
          VIP Milestone Progress
        </CardTitle>
        <CardDescription>
          Refer DIRECT (Level 1) i-Smart VIP members to unlock massive bonuses!
          <br />
          <span className="text-xs">Only L1 VIP referrals count • Currently: {vipCount} direct VIP</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Current VIP Referrals</span>
            <span className="text-2xl font-bold text-purple-600">{vipCount}</span>
          </div>
          
          {nextMilestone && (
            <>
              <Progress value={progressPercent} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress to next milestone</span>
                <span>{vipCount} / {nextMilestone.count} VIPs</span>
              </div>
            </>
          )}
        </div>

        {/* Next Milestone */}
        {nextMilestone && (
          <div className="p-4 bg-purple-100 dark:bg-purple-950/30 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  Next Milestone: {nextMilestone.label}
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  {nextMilestone.count - vipCount} more VIP referrals needed
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">
                  {nextMilestone.reward.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">BSK Reward</p>
              </div>
            </div>
          </div>
        )}

        {/* Milestones Grid */}
        <div className="grid grid-cols-5 gap-2">
          {VIP_MILESTONES.map(milestone => {
            const isAchieved = vipCount >= milestone.count;
            const isClaimed = claimed.includes(milestone.count);
            
            return (
              <div
                key={milestone.count}
                className={`
                  p-2 rounded-lg border text-center transition-colors
                  ${isAchieved && isClaimed ? 'bg-purple-100 border-purple-300 dark:bg-purple-950/50' : ''}
                  ${isAchieved && !isClaimed ? 'bg-yellow-100 border-yellow-300 animate-pulse' : ''}
                  ${!isAchieved ? 'bg-muted border-border opacity-60' : ''}
                `}
              >
                <p className="text-xs font-medium">{milestone.count}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isClaimed ? '✓' : isAchieved ? '🎁' : '🔒'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300" />
            <span>Claimed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
            <span>Ready</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted border border-border" />
            <span>Locked</span>
          </div>
        </div>

        {/* Completed Message */}
        {!nextMilestone && vipCount >= 500 && (
          <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2" />
            <p className="font-bold">🎉 All Milestones Completed!</p>
            <p className="text-sm opacity-90">You've achieved the ultimate VIP status!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
