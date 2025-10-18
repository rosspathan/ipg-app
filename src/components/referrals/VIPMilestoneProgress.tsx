import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTeamReferrals } from '@/hooks/useTeamReferrals';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Crown, Gift, Check, Lock } from 'lucide-react';
import { useState } from 'react';

export function VIPMilestoneProgress() {
  const { user } = useAuthUser();
  const {
    vipMilestones,
    userVipMilestones,
    vipMilestoneClaims,
    claimVipMilestone,
    loading
  } = useTeamReferrals();

  const [claiming, setClaiming] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show if user has VIP badge (would need to check user_badge_holdings table)
  // For now, we'll show if user has any VIP milestone progress
  if (!userVipMilestones) {
    return null;
  }

  const currentVipCount = userVipMilestones.direct_vip_count || 0;
  const claimedMilestoneIds = new Set(vipMilestoneClaims.map(c => c.milestone_id));

  const handleClaim = async (milestoneId: string) => {
    setClaiming(milestoneId);
    try {
      await claimVipMilestone(milestoneId);
    } catch (error) {
      console.error('Error claiming milestone:', error);
    } finally {
      setClaiming(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          VIP Milestone Progress
        </CardTitle>
        <CardDescription>
          Refer VIP badge holders to unlock exclusive rewards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Progress */}
        <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Direct VIP Referrals</span>
            <span className="text-2xl font-bold text-yellow-600">{currentVipCount}</span>
          </div>
          {userVipMilestones.last_vip_referral_at && (
            <p className="text-xs text-muted-foreground">
              Last VIP referral: {new Date(userVipMilestones.last_vip_referral_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Milestones */}
        <div className="space-y-3">
          {vipMilestones.map((milestone) => {
            const isUnlocked = currentVipCount >= milestone.vip_count_threshold;
            const isClaimed = claimedMilestoneIds.has(milestone.id);
            const canClaim = isUnlocked && !isClaimed;
            const progressPercent = Math.min(100, (currentVipCount / milestone.vip_count_threshold) * 100);

            return (
              <div
                key={milestone.id}
                className={`p-4 rounded-lg border ${
                  isUnlocked 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'bg-muted border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isClaimed ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : isUnlocked ? (
                      <Gift className="w-5 h-5 text-primary" />
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {milestone.vip_count_threshold} VIP Referrals
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {milestone.reward_description}
                      </p>
                    </div>
                  </div>
                  <Badge variant={isClaimed ? 'default' : isUnlocked ? 'secondary' : 'outline'}>
                    {isClaimed ? 'Claimed' : isUnlocked ? 'Ready' : `${currentVipCount}/${milestone.vip_count_threshold}`}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Progress value={progressPercent} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {milestone.reward_type === 'bsk' ? 'BSK Reward' : 'Physical Item'} • 
                      ₹{milestone.reward_inr_value.toLocaleString()} value
                      {milestone.requires_kyc && ' • KYC Required'}
                    </span>
                    
                    {canClaim && (
                      <Button
                        size="sm"
                        onClick={() => handleClaim(milestone.id)}
                        disabled={claiming === milestone.id}
                      >
                        {claiming === milestone.id ? 'Claiming...' : 'Claim Reward'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {vipMilestones.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No VIP milestones configured yet</p>
            <p className="text-xs">Check back later for exclusive rewards</p>
          </div>
        )}

        {/* Claim History */}
        {vipMilestoneClaims.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Claimed Rewards</p>
            <div className="space-y-2">
              {vipMilestoneClaims.slice(0, 3).map((claim) => {
                const milestone = vipMilestones.find(m => m.id === claim.milestone_id);
                return (
                  <div key={claim.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <div>
                      <p className="font-medium">{milestone?.reward_description || 'Reward'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(claim.claimed_at).toLocaleDateString()} • {claim.status}
                      </p>
                    </div>
                    <Badge variant="secondary">{claim.status}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
