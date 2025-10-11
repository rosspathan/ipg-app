
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Copy, Users, Gift, Info, Trophy, Star, Crown, Shield, Zap, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";
import { useAuthUser } from '@/hooks/useAuthUser';
import { useReferralProgram } from '@/hooks/useReferralProgram';
import { useTeamReferrals } from '@/hooks/useTeamReferrals';
import { useReferrals } from '@/hooks/useReferrals';
import { supabase } from '@/integrations/supabase/client';

const ReferralsScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const {
    bonusAssets,
    referralSettings,
    referralEvents,
    bonusBalances,
    referralRelationships,
    getCurrentPrice,
    loading: referralLoading
  } = useReferralProgram();
  
  const {
    settings: teamSettings,
    badgeThresholds,
    vipMilestones,
    userVipMilestones,
    referralLedger,
    purchaseBadge,
    claimVipMilestone,
    loading: teamLoading
  } = useTeamReferrals();

  const { getReferralUrl, loading: referralLinkLoading } = useReferrals();
  const referralLink = getReferralUrl();
  
  const [currentBadge, setCurrentBadge] = useState<string>('None');
  
  // Load current badge
  useEffect(() => {
    const userId = user?.id;
    if (userId) {
      const fetchCurrentBadge = async () => {
        try {
          const { data } = await supabase.from('user_badge_holdings').select('current_badge').eq('user_id', userId).maybeSingle();
          setCurrentBadge(data?.current_badge || 'None');
        } catch (error) {
          console.error('Error fetching current badge:', error);
          setCurrentBadge('None');
        }
      };
      
      fetchCurrentBadge();
    }
  }, [user?.id]);

  const handleCopyLink = async () => {
    if (!referralLink) {
      toast({ title: "Sign in required", description: "Login to get your personal referral link" });
      return;
    }
    
    const success = await copyToClipboard(referralLink);
    
    if (success) {
      toast({ title: "Link Copied!", description: "Referral link copied to clipboard" });
    } else {
      toast({ 
        title: "Error", 
        description: "Failed to copy referral link",
        variant: "destructive"
      });
    }
  };

  const loading = referralLoading || teamLoading || referralLinkLoading;
  
  if (loading) {
    console.log('ReferralsScreen loading state:', { loading, userPresent: !!user });
    return (
      <div className="min-h-screen flex flex-col bg-background px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-4 text-muted-foreground">Loading referral data...</p>
        </div>
      </div>
    );
  }

  const userId = user?.id;
  const userReferralEvents = userId ? referralEvents.filter(event => event.referrer_id === userId) : [];
  const userBonusBalances = userId ? bonusBalances.filter(balance => balance.user_id === userId) : [];
  const userReferees = userId ? referralRelationships.filter(rel => rel.referrer_id === userId) : [];
  
  const bskAsset = bonusAssets.find(asset => asset.symbol === 'BSK');
  const bskBalance = userBonusBalances.find(balance => 
    bskAsset && balance.asset_id === bskAsset.id
  );
  const bskPrice = bskAsset ? getCurrentPrice(bskAsset.id) : 0;
  
  const totalBSKEarned = userReferralEvents.reduce((sum, event) => sum + event.amount_bonus, 0);
  const totalValueEarned = userReferralEvents.reduce((sum, event) => sum + event.usd_value, 0);
  const totalReferrals = userReferees.length;
  const activeReferrals = userReferees.length; // Simplified - could check for active users

  const referralStats = {
    totalBSK: totalBSKEarned,
    totalValue: totalValueEarned,
    totalReferrals: totalReferrals,
    activeReferrals: activeReferrals
  };

  // Badge progression data
  const getBadgeIcon = (badgeName: string) => {
    switch (badgeName) {
      case 'Silver': return <Shield className="w-5 h-5" />;
      case 'Gold': return <Star className="w-5 h-5" />;
      case 'Platinum': return <Trophy className="w-5 h-5" />;
      case 'Diamond': return <Crown className="w-5 h-5" />;
      case 'VIP i-SMART': return <Zap className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  const getBadgeColor = (badgeName: string) => {
    switch (badgeName) {
      case 'Silver': return 'text-gray-500';
      case 'Gold': return 'text-yellow-500';
      case 'Platinum': return 'text-gray-300';
      case 'Diamond': return 'text-blue-500';
      case 'VIP i-SMART': return 'text-purple-500';
      default: return 'text-muted-foreground';
    }
  };

  // Get next badge
  const currentBadgeIndex = badgeThresholds.findIndex(b => b.badge_name === currentBadge);
  const nextBadge = currentBadgeIndex < badgeThresholds.length - 1 ? badgeThresholds[currentBadgeIndex + 1] : null;
  const currentBadgeData = badgeThresholds.find(b => b.badge_name === currentBadge);

  // Calculate earnings from new system
  const teamIncomeEarnings = userId ? referralLedger.filter(e => e.user_id === userId && e.ledger_type === 'team_income') : [];
  const directBonusEarnings = userId ? referralLedger.filter(e => e.user_id === userId && e.ledger_type === 'direct_badge_bonus') : [];
  const vipMilestoneEarnings = userId ? referralLedger.filter(e => e.user_id === userId && e.ledger_type === 'vip_milestone_bonus') : [];
  
  const totalNewEarnings = teamIncomeEarnings.reduce((sum, e) => sum + e.bsk_amount, 0) +
                          directBonusEarnings.reduce((sum, e) => sum + e.bsk_amount, 0) +
                          vipMilestoneEarnings.reduce((sum, e) => sum + e.bsk_amount, 0);

  // Create referral tree from actual data
  const referralTree = userId ? userReferees.map(referral => {
    const referralEventsForUser = referralEvents.filter(event => 
      event.referrer_id === userId && event.user_id === referral.referee_id
    );
    const totalBSKFromReferral = referralEventsForUser.reduce((sum, event) => sum + event.amount_bonus, 0);
    const referralLevel = referralEventsForUser.length > 0 ? referralEventsForUser[0].level : 1;
    
    return {
      level: `L${referralLevel}`,
      user: referral.referee_id.slice(-6),
      bsk: totalBSKFromReferral.toFixed(4),
      value: `$${(totalBSKFromReferral * bskPrice).toFixed(2)}`,
      status: "Active" // Simplified
    };
  }) : [];

  const levels = (referralSettings?.levels as any) || [];

  // Handle badge purchase
  const handleBadgePurchase = async (badgeName: string) => {
    try {
      await purchaseBadge(badgeName, currentBadge !== 'None' ? currentBadge : undefined);
      setCurrentBadge(badgeName);
    } catch (error) {
      console.error('Badge purchase failed:', error);
    }
  };

  // Handle VIP milestone claim
  const handleVIPMilestoneClaim = async (milestoneId: string) => {
    try {
      await claimVipMilestone(milestoneId);
    } catch (error) {
      console.error('VIP milestone claim failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/app/home")}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Referrals</h1>
      </div>

      {/* Badge & Level Access Card */}
      <Card className="bg-gradient-card shadow-card border-0 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getBadgeIcon(currentBadge)}
              <span>My Badge & Level Access</span>
              <Badge variant={currentBadge === 'None' ? 'outline' : 'default'} className={getBadgeColor(currentBadge)}>
                {currentBadge}
              </Badge>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/app/programs/badge-subscription')}
            >
              Subscribe / Upgrade
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Levels Unlocked:</span>
            <span className="font-medium">
              L1-L{currentBadgeData?.unlock_levels || 0}
            </span>
          </div>
          
          {nextBadge && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress to {nextBadge.badge_name}:</span>
                  <span className="font-medium">{nextBadge.bsk_threshold.toLocaleString()} BSK</span>
                </div>
                <Progress value={currentBadgeData ? (currentBadgeData.bsk_threshold / nextBadge.bsk_threshold) * 100 : 0} className="h-2" />
              </div>
              
              <Button 
                onClick={() => handleBadgePurchase(nextBadge.badge_name)}
                className="w-full gap-2"
                variant="outline"
              >
                <TrendingUp className="w-4 h-4" />
                Upgrade to {nextBadge.badge_name} ({nextBadge.bsk_threshold.toLocaleString()} BSK)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-3 text-center">
            <Gift className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{(referralStats.totalBSK + totalNewEarnings).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">BSK Earned</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{referralStats.totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Total Refs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 text-orange-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{referralStats.activeReferrals}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-3 text-center">
            <Crown className="w-5 h-5 text-purple-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{userVipMilestones?.direct_vip_count || 0}</p>
            <p className="text-xs text-muted-foreground">VIP Refs</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="bg-gradient-card shadow-card border-0 mb-6">
        <CardHeader>
          <CardTitle className="text-base">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={referralLink}
              readOnly
              className="flex-1"
            />
            <Button onClick={handleCopyLink} size="icon" disabled={!referralLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link to earn BSK rewards from your referrals' activities
          </p>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="bg-yellow-50 border-yellow-200 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Referral BSK rewards are only available for subscribed users. 
              Subscribe to a plan to activate your referral earnings.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="earnings" className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="referrals">My Team</TabsTrigger>
          <TabsTrigger value="milestones">VIP Milestones</TabsTrigger>
          <TabsTrigger value="rates">Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Team Income */}
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamIncomeEarnings.length > 0 ? teamIncomeEarnings.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">Level {entry.depth} Reward</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.badge_at_event} badge purchase • {entry.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{entry.bsk_amount.toFixed(4)} BSK</p>
                        <p className="text-xs text-muted-foreground">₹{entry.inr_amount_snapshot.toFixed(2)}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No team income yet</p>
                      <p className="text-sm">Earn when your team purchases badges</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Direct Badge Bonuses */}
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Direct 10% Bonuses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {directBonusEarnings.length > 0 ? directBonusEarnings.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">Direct {entry.badge_at_event} Bonus</p>
                        <p className="text-sm text-muted-foreground">
                          10% of badge purchase • {entry.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{entry.bsk_amount.toFixed(4)} BSK</p>
                        <p className="text-xs text-muted-foreground">₹{entry.inr_amount_snapshot.toFixed(2)}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No direct bonuses yet</p>
                      <p className="text-sm">Earn 10% when direct referrals purchase badges</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Referral Tree</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b border-border pb-2">
                  <span>Level</span>
                  <span>User</span>
                  <span>BSK Earned</span>
                  <span>Value</span>
                </div>
                {referralTree.length > 0 ? referralTree.map((referral, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 text-sm">
                    <span className={`font-medium ${
                      referral.level === 'L1' ? 'text-green-500' :
                      referral.level === 'L2' ? 'text-blue-500' : 'text-purple-500'
                    }`}>
                      {referral.level}
                    </span>
                    <span className="text-foreground">{referral.user}</span>
                    <span className="font-medium text-primary">{referral.bsk} BSK</span>
                    <span className="font-medium text-green-600">{referral.value}</span>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No referrals yet</p>
                    <p className="text-sm">Share your link to start earning BSK!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="w-4 h-4" />
                VIP Milestone Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* VIP Badge Requirement Notice */}
                <div className="p-4 border border-purple-500/20 rounded-lg bg-purple-500/5">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-purple-500 mb-1">i-Smart VIP Badge Required</p>
                      <p className="text-xs text-muted-foreground">
                        You must hold an i-Smart VIP badge to claim VIP milestone rewards. 
                        {currentBadge !== 'i-Smart VIP' && ' Upgrade to VIP to unlock these rewards!'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center p-4 border border-border rounded-lg bg-muted/20">
                  <p className="text-2xl font-bold text-primary">{userVipMilestones?.direct_vip_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Direct VIP i-SMART Referrals</p>
                </div>
                
                {vipMilestones.map((milestone) => {
                  const hasRequiredVipCount = (userVipMilestones?.direct_vip_count || 0) >= milestone.vip_count_threshold;
                  const hasVipBadge = currentBadge === 'i-Smart VIP';
                  const canClaim = hasRequiredVipCount && hasVipBadge;
                  const progress = Math.min(((userVipMilestones?.direct_vip_count || 0) / milestone.vip_count_threshold) * 100, 100);
                  
                  return (
                    <div key={milestone.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-medium">{milestone.vip_count_threshold} VIP Referrals</p>
                          <p className="text-sm text-muted-foreground">{milestone.reward_description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">₹{milestone.reward_inr_value.toLocaleString()}</p>
                          {hasRequiredVipCount && !hasVipBadge && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled
                              className="mt-2"
                            >
                              Need VIP Badge
                            </Button>
                          )}
                          {canClaim && (
                            <Button 
                              size="sm" 
                              onClick={() => handleVIPMilestoneClaim(milestone.id)}
                              className="mt-2"
                            >
                              Claim
                            </Button>
                          )}
                          {!hasRequiredVipCount && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              disabled
                              className="mt-2"
                            >
                              {userVipMilestones?.direct_vip_count || 0}/{milestone.vip_count_threshold}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{userVipMilestones?.direct_vip_count || 0} / {milestone.vip_count_threshold} VIPs</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">BSK Reward Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {levels.map((level: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">L{level.level}</Badge>
                      <div>
                        <p className="font-medium text-foreground">Level {level.level}</p>
                        <p className="text-sm text-muted-foreground">Per qualifying referral</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{level.bsk_amount || 0} BSK</p>
                      <p className="text-xs text-muted-foreground">${((level.bsk_amount || 0) * bskPrice).toFixed(4)} value</p>
                    </div>
                  </div>
                ))}
                {levels.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No reward structure configured</p>
                    <p className="text-sm">Contact admin to set up BSK rewards</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferralsScreen;