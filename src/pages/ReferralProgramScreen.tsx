import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Copy, Users, Gift, TrendingUp, Share2, Award, Info, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useReferralProgram } from '@/hooks/useReferralProgram';
import { useBalanceSlabs } from "@/hooks/useBalanceSlabs";
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from "@/utils/clipboard";
import { Alert, AlertDescription } from '@/components/ui/alert';

const ReferralProgramScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { toast } = useToast();
  const { 
    bonusAssets,
    referralSettings,
    referralEvents, 
    bonusBalances, 
    referralRelationships, 
    getBSKAsset, 
    getCurrentPrice, 
    loading 
  } = useReferralProgram();
  const {
    currentSlab,
    userState,
    getRemainingCapacity,
    canMakeReferral,
    getUpgradeHint,
    loading: slabsLoading
  } = useBalanceSlabs();

  const [referralLink, setReferralLink] = useState(
    user ? `https://i-smartapp.com/auth/register?ref=${user.id}` : ''
  );

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    
    if (success) {
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to copy referral link",
        variant: "destructive",
      });
    }
  };

  if (loading || slabsLoading || !user) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const userReferralEvents = referralEvents.filter(event => event.referrer_id === user.id);
  const userBonusBalances = bonusBalances.filter(balance => balance.user_id === user.id);
  const userReferees = referralRelationships.filter(rel => rel.sponsor_id === user.id);
  
  const bskAsset = getBSKAsset();
  const bskBalance = userBonusBalances.find(balance => 
    bskAsset && balance.asset_id === bskAsset.id
  );
  const bskPrice = bskAsset ? getCurrentPrice(bskAsset.id) : 0;
  
  const totalBSKEarned = userReferralEvents.reduce((sum, event) => sum + event.amount_bonus, 0);
  const totalValueEarned = userReferralEvents.reduce((sum, event) => sum + event.usd_value, 0);
  const totalReferrals = userReferees.length;
  const activeReferrals = userReferees.length; // Simplified - could check for active users

  const referralStats = {
    totalIncome: totalValueEarned,
    totalReferrals: totalReferrals,
    activeReferrals: activeReferrals,
    bskEarned: totalBSKEarned
  };

  const levels = (referralSettings?.levels as any) || [];
  const qualifyingActions = (referralSettings?.qualifying_actions as any) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/app/programs')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Referral Program</h1>
          <p className="text-muted-foreground">Earn BSK rewards by referring friends</p>
        </div>
      </div>

      {/* Program Status Alert */}
      {!referralSettings?.enabled && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            The referral program is currently inactive. Contact support for more information.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Slab and Referral Capacity */}
      {currentSlab && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Badge variant="outline" className="text-primary border-primary">
                  {currentSlab.name} Tier
                </Badge>
                <span className="text-lg">Balance: {userState?.current_balance.toLocaleString() || 0} {currentSlab.base_currency}</span>
              </span>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Invites Left Today</div>
                <div className="text-2xl font-bold text-primary">
                  {getRemainingCapacity()}/{currentSlab.max_direct_referrals}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Current Benefits:</p>
                <ul className="text-sm space-y-1">
                  <li>• Max {currentSlab.max_direct_referrals} direct referrals</li>
                  <li>• Rewards active up to Level {currentSlab.unlocked_levels}</li>
                  <li>• {currentSlab.balance_metric.replace('_', ' ').toLowerCase()} balance tier</li>
                </ul>
              </div>
              
              {getUpgradeHint() && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-primary mb-1">Upgrade to unlock more:</p>
                  <p className="text-xs text-muted-foreground">{getUpgradeHint()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">BSK Earned</p>
              <p className="text-2xl font-bold">{referralStats.bskEarned.toFixed(4)} BSK</p>
              <p className="text-xs text-muted-foreground">${referralStats.totalIncome.toFixed(2)} value</p>
            </div>
            <Gift className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Refs</p>
              <p className="text-2xl font-bold">{referralStats.totalReferrals}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Refs</p>
              <p className="text-2xl font-bold">{referralStats.activeReferrals}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">BSK Rate</p>
              <p className="text-2xl font-bold">${bskPrice.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground">per BSK</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Share2 className="w-5 h-5" />
              <span>Your Referral Code</span>
            </div>
            {!canMakeReferral() && (
              <Badge variant="secondary" className="text-xs">
                Capacity Full
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Share your code to earn BSK rewards when friends sign up and complete qualifying actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              value={user?.id.substring(0, 8).toUpperCase() || ''}
              readOnly
              className="flex-1 text-center font-mono text-xl font-bold"
            />
            <Button 
              onClick={async () => {
                const code = user?.id.substring(0, 8).toUpperCase() || '';
                const success = await copyToClipboard(code);
                if (success) {
                  toast({ title: "Copied!", description: "Referral code copied to clipboard" });
                }
              }}
              disabled={!canMakeReferral()}
              variant={canMakeReferral() ? "default" : "secondary"}
            >
              <Copy className="w-4 h-4 mr-2" />
              {canMakeReferral() ? "Copy" : "Full"}
            </Button>
          </div>
          {!canMakeReferral() && (
            <Alert className="mt-4">
              <Info className="w-4 h-4" />
              <AlertDescription>
                You've reached your referral limit for the {currentSlab?.name} tier. 
                {getUpgradeHint() ? " Upgrade your balance to invite more friends!" : ""}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* BSK Info Card */}
      {bskAsset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="w-5 h-5" />
              <span>BSK Bonus Token</span>
              <Badge variant="secondary">OFF-CHAIN</Badge>
            </CardTitle>
            <CardDescription>
              Your current BSK balance and value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold">{(bskBalance?.balance || 0).toFixed(8)} BSK</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Value</p>
                <p className="text-2xl font-bold">${((bskBalance?.balance || 0) * bskPrice).toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">Rate: ${bskPrice.toFixed(4)} USDT</p>
              </div>
            </div>
            <Alert className="mt-4">
              <Info className="w-4 h-4" />
              <AlertDescription>
                BSK is a platform bonus token used for referral rewards. It's managed off-chain and may be converted to USDT in the future.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Details */}
      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rewards">Reward History</TabsTrigger>
          <TabsTrigger value="structure">BSK Rewards</TabsTrigger>
          <TabsTrigger value="referrals">My Referrals</TabsTrigger>
          <TabsTrigger value="howto">How It Works</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reward History</CardTitle>
              <CardDescription>Your recent referral rewards and events</CardDescription>
            </CardHeader>
            <CardContent>
              {userReferralEvents.length > 0 ? (
                <div className="space-y-4">
                  {userReferralEvents.slice(0, 10).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Award className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{event.action}</p>
                          <p className="text-sm text-muted-foreground">
                            Level {event.level} • {new Date(event.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">+{event.amount_bonus.toFixed(4)} BSK</p>
                        <p className="text-sm text-muted-foreground">${event.usd_value.toFixed(4)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No referral rewards yet</p>
                  <p className="text-sm">Start sharing your referral link to earn BSK!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reward Structure</CardTitle>
              <CardDescription>Earn BSK tokens based on referral levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {levels.map((level: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">L{level.level}</Badge>
                      <span>Level {level.level} Referrals</span>
                    </div>
                    <div className="font-bold text-primary">
                      {level.bsk_amount || level.percentage || 0} BSK
                    </div>
                  </div>
                ))}
              </div>
              
              {levels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No reward structure configured</p>
                  <p className="text-sm">Contact admin to set up BSK rewards</p>
                </div>
              )}
              
              {qualifyingActions.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Qualifying Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {qualifyingActions.map((action: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {action.replace('_', ' ').toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral Tree</CardTitle>
              <CardDescription>Your referrals and their BSK contributions</CardDescription>
            </CardHeader>
            <CardContent>
              {userReferees.length > 0 ? (
                <div className="space-y-4">
                  {userReferees.map((referral, index) => {
                    const referralEventsForUser = referralEvents.filter(event => 
                      event.referrer_id === user?.id && event.user_id === referral.referee_id
                    );
                    const totalBSKFromReferral = referralEventsForUser.reduce((sum, event) => sum + event.amount_bonus, 0);
                    const referralLevel = referralEventsForUser.length > 0 ? referralEventsForUser[0].level : 1;
                    
                    return (
                      <div key={referral.referee_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Badge variant="outline" className="text-xs">L{referralLevel}</Badge>
                          </div>
                          <div>
                            <p className="font-medium">{referral.referee_username || `User ${referral.referee_id.slice(-6)}`}</p>
                            <p className="text-sm text-muted-foreground">
                              Joined {referral.locked_at ? new Date(referral.locked_at).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">+{totalBSKFromReferral.toFixed(4)} BSK</p>
                          <p className="text-sm text-muted-foreground">
                            ${(totalBSKFromReferral * bskPrice).toFixed(2)} value
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No referrals yet</p>
                  <p className="text-sm">Share your link to start earning BSK!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="howto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How Referrals Work</CardTitle>
              <CardDescription>Step-by-step guide to earning BSK rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Share Your Link</h4>
                    <p className="text-sm text-muted-foreground">
                      Copy and share your unique referral link with friends and family
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Friend Signs Up</h4>
                    <p className="text-sm text-muted-foreground">
                      When someone uses your link to register, they become your referral
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Complete Actions</h4>
                    <p className="text-sm text-muted-foreground">
                      Earn BSK when your referrals complete qualifying actions like KYC, first trade, etc.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Earn BSK Rewards</h4>
                    <p className="text-sm text-muted-foreground">
                      BSK rewards are credited to your bonus balance instantly or in batches
                    </p>
                  </div>
                </div>

                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Note:</strong> You must have an active subscription to earn referral income. 
                    BSK rewards may be subject to daily and monthly caps.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferralProgramScreen;