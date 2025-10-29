import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Copy, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/utils/clipboard';
import { UserReferralStatsWidget } from '@/components/referrals/UserReferralStatsWidget';
import { VIPMilestoneProgress } from '@/components/referrals/VIPMilestoneProgress';
import { SponsorInfoCard } from '@/components/referrals/SponsorInfoCard';
import { DirectReferralsList } from '@/components/referrals/DirectReferralsList';
import { ReferralCommissionHistory } from '@/components/referrals/ReferralCommissionHistory';
import { DownlineTableView } from '@/components/referrals/DownlineTableView';
import { CommissionStructureCard } from '@/components/referrals/CommissionStructureCard';

export default function TeamReferralsDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { toast } = useToast();

  const referralCode = user?.id?.substring(0, 8).toUpperCase() || '';

  const handleCopyCode = async () => {
    const success = await copyToClipboard(referralCode);
    if (success) {
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard"
      });
    }
  };

  const handleShare = async () => {
    const shareText = `Join i-SMART with my referral code: ${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join i-SMART',
          text: shareText
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyCode();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/app/programs')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Team Referrals Dashboard</h1>
          <p className="text-muted-foreground">
            Build your network and track your 50-level team structure
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>
            Share this code to invite people to your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Share this code</p>
            <div className="text-5xl font-bold text-primary tracking-widest mb-4 font-mono">
              {referralCode}
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleCopyCode} variant="outline" size="lg">
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
              <Button onClick={handleShare} size="lg">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sponsor Info */}
      <SponsorInfoCard />

      {/* Main Content with Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="direct">Direct (Level 1)</TabsTrigger>
          <TabsTrigger value="downline">Multi-Level Team</TabsTrigger>
          <TabsTrigger value="commissions">Commission History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats and Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserReferralStatsWidget />
            <VIPMilestoneProgress />
          </div>

          {/* Commission Structure */}
          <CommissionStructureCard />

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>How the Referral System Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-semibold mb-2">1. Share Your Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Share your unique referral code with friends and family
                  </p>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-semibold mb-2">2. They Join & Purchase</h3>
                  <p className="text-sm text-muted-foreground">
                    When they verify email and purchase/upgrade badges, you earn 10% commission
                  </p>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-semibold mb-2">3. Track Your Team</h3>
                  <p className="text-sm text-muted-foreground">
                    View your entire 50-level team structure and monitor their activities
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Badge Purchase Commission</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Direct Sponsor (Level 1):</strong> Earns 10% commission on badge purchases/upgrades</li>
                  <li>• <strong>Upline (Levels 2-50):</strong> No commission on badge purchases (tree is for tracking only)</li>
                  <li>• <strong>VIP Badge Holders:</strong> Earn additional milestone bonuses when your direct referrals become VIP</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="direct">
          <DirectReferralsList />
        </TabsContent>

        <TabsContent value="downline">
          <DownlineTableView />
        </TabsContent>

        <TabsContent value="commissions">
          <ReferralCommissionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
