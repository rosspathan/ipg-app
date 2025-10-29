import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Copy, Users, Trophy, TrendingUp, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useTeamReferrals } from '@/hooks/useTeamReferrals';
import { useReferrals } from '@/hooks/useReferrals';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from "@/utils/clipboard";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const TeamReferralsUserScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { toast } = useToast();
  const { 
    settings,
    badgeThresholds,
    referralLedger,
    badgePurchases,
    loading 
  } = useTeamReferrals();

  // Fetch KYC approval status
  const { data: profile } = useQuery({
    queryKey: ['profile-kyc-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('is_kyc_approved')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  const isKYCApproved = profile?.is_kyc_approved || false;

  if (loading || !user) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const userLedger = referralLedger.filter(entry => entry.user_id === user.id);
  const totalEarned = userLedger.reduce((sum, entry) => sum + entry.bsk_amount, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/app/programs')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Team & Referrals</h1>
          <p className="text-muted-foreground">Earn BSK rewards from your referral network</p>
        </div>
      </div>

      {/* Program Status */}
      {!settings?.enabled && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            The team referral program is currently inactive. Contact support for more information.
          </AlertDescription>
        </Alert>
      )}

      {/* KYC Status Alert */}
      {!isKYCApproved ? (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertTitle>Complete KYC to Unlock L1 Income</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Verify your identity to start earning team income from direct referrals.</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/app/kyc')}
              className="ml-4"
            >
              Complete KYC
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>L1 Income Unlocked</AlertTitle>
          <AlertDescription>
            Your KYC is approved! You can now earn team income from your direct referrals.
          </AlertDescription>
        </Alert>
      )}

      {/* Badge Requirement Alert */}
      {settings?.enabled && settings.min_referrer_badge_required && settings.min_referrer_badge_required !== 'ANY_BADGE' && (
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="w-4 h-4 text-primary" />
          <AlertDescription>
            <strong>Important:</strong> You must hold a <strong>{settings.min_referrer_badge_required}</strong> badge (or higher) at the time your referral purchases or upgrades a badge to earn the direct {settings.direct_commission_percent}% commission.
            {' '}If you don't hold the required badge when the event occurs, you earn nothing - no retroactive pay even if you buy a badge later.
            {' '}<strong>On upgrades, commission is paid only on the incremental amount (price difference).</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total BSK Earned</p>
              <p className="text-2xl font-bold">{totalEarned.toFixed(2)} BSK</p>
            </div>
            <Trophy className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Direct Commission</p>
              <p className="text-2xl font-bold">{settings?.direct_commission_percent || 10}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Team Levels</p>
              <p className="text-2xl font-bold">50</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </CardContent>
        </Card>
      </div>

      {/* Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>
            Share this code to build your team and earn BSK rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              value={user?.id.substring(0, 8).toUpperCase() || ''}
              readOnly
              className="flex-1 text-center font-mono text-xl font-bold"
            />
            <Button onClick={async () => {
              const code = user?.id.substring(0, 8).toUpperCase() || '';
              const success = await copyToClipboard(code);
              if (success) {
                toast({ title: "Copied!", description: "Referral code copied to clipboard" });
              }
            }}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Badge Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Tiers & Levels</CardTitle>
          <CardDescription>
            Purchase badges to unlock more team income levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {badgeThresholds
              .filter(badge => badge.badge_name !== 'None')
              .map((badge) => (
                <div key={badge.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{badge.badge_name}</Badge>
                    <div>
                      <p className="font-medium">{badge.bsk_threshold.toLocaleString()} BSK</p>
                      <p className="text-sm text-muted-foreground">
                        {badge.unlock_levels === 0 ? 'L1 unlocked by KYC' : `Unlocks L2-L${badge.unlock_levels}`}
                      </p>
                    </div>
                  </div>
                  {badge.bonus_bsk_holding > 0 && (
                    <p className="text-sm text-green-600">
                      +{badge.bonus_bsk_holding.toLocaleString()} BSK Bonus
                    </p>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your team referral earnings history</CardDescription>
        </CardHeader>
        <CardContent>
          {userLedger.length > 0 ? (
            <div className="space-y-3">
              {userLedger.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{entry.ledger_type.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()} • {entry.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">+{entry.bsk_amount.toFixed(2)} BSK</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{entry.inr_amount_snapshot.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No referral earnings yet</p>
              <p className="text-sm">Start sharing your link to earn BSK!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamReferralsUserScreen;
