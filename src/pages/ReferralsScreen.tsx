import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Copy, Users, Gift, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from '@/hooks/useAuthUser';
import { useReferralProgram } from '@/hooks/useReferralProgram';

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
    loading
  } = useReferralProgram();

  const [referralLink] = useState(
    user ? `${window.location.origin}/auth/register?ref=${user.id}` : ""
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const userReferralEvents = referralEvents.filter(event => event.referrer_id === user.id);
  const userBonusBalances = bonusBalances.filter(balance => balance.user_id === user.id);
  const userReferees = referralRelationships.filter(rel => rel.referrer_id === user.id);
  
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

  // Create referral tree from actual data
  const referralTree = userReferees.map(referral => {
    const referralEventsForUser = referralEvents.filter(event => 
      event.referrer_id === user.id && event.user_id === referral.referee_id
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
  });

  const levels = (referralSettings?.levels as any) || [];

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Referrals</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Gift className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{referralStats.totalBSK.toFixed(4)} BSK</p>
            <p className="text-xs text-muted-foreground">Total Earned</p>
            <p className="text-xs text-muted-foreground">${referralStats.totalValue.toFixed(2)} value</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{referralStats.totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Total Refs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{referralStats.activeReferrals}</p>
            <p className="text-xs text-muted-foreground">Active</p>
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
            <Button onClick={handleCopyLink} size="icon">
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

      <Tabs defaultValue="referrals" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="referrals">My Referrals</TabsTrigger>
          <TabsTrigger value="rates">BSK Rewards</TabsTrigger>
        </TabsList>

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