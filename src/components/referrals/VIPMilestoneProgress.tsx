import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTeamReferrals } from '@/hooks/useTeamReferrals';
import { useVIPMilestoneProgress } from '@/hooks/useVIPMilestoneProgress';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Crown, Gift, Check, Lock, History } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VIPMilestoneExplainer } from './VIPMilestoneExplainer';

export function VIPMilestoneProgress() {
  const { user } = useAuthUser();
  const {
    vipMilestones,
    vipMilestoneClaims,
    claimVipMilestone,
    loading: teamRefLoading
  } = useTeamReferrals();
  const { data: vipProgress, isLoading: vipProgressLoading } = useVIPMilestoneProgress();
  const navigate = useNavigate();

  const [claiming, setClaiming] = useState<string | null>(null);

  const loading = teamRefLoading || vipProgressLoading;

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

  // Only show if user has VIP badge
  if (!vipProgress?.isUserVIP) {
    return null;
  }

  const currentVipCount = vipProgress.directVIPCount || 0;
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              VIP Milestone Progress
            </CardTitle>
            <CardDescription>
              Refer VIP badge holders to unlock exclusive rewards
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/programs/team-referrals/vip-milestone-history')}
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Explainer showing direct vs total VIP counts */}
        <VIPMilestoneExplainer 
          directVIPCount={vipProgress.directVIPCount}
          totalTeamVIPCount={vipProgress.totalTeamVIPCount}
        />
        
        {/* Current Progress */}
        <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Direct VIP Referrals (L1)</span>
            <span className="text-2xl font-bold text-yellow-600">{currentVipCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Only direct (Level 1) VIP referrals count toward milestones
          </p>
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
                        {claim.claimed_at ? new Date(claim.claimed_at).toLocaleDateString() : 'Pending'}
                      </p>
                    </div>
                    <Badge variant="secondary">{claim.bsk_rewarded} BSK</Badge>
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
