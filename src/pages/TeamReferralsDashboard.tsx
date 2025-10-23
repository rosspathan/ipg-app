import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/utils/clipboard';
import { UserReferralStatsWidget } from '@/components/referrals/UserReferralStatsWidget';
import { VIPMilestoneProgress } from '@/components/referrals/VIPMilestoneProgress';
import { SponsorInfoCard } from '@/components/referrals/SponsorInfoCard';
import { DirectReferralsList } from '@/components/referrals/DirectReferralsList';

export default function TeamReferralsDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { toast } = useToast();

  const referralCode = user?.id?.substring(0, 8).toUpperCase() || '';
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopyCode = async () => {
    const success = await copyToClipboard(referralCode);
    if (success) {
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard"
      });
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard"
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join i-SMART with my referral code',
          text: `Use my referral code ${referralCode} to join i-SMART and start earning!`,
          url: referralLink
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyLink();
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
            Build your network and earn BSK rewards across 50 levels
          </p>
        </div>
      </div>

      {/* Referral Code Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code & Link</CardTitle>
          <CardDescription>
            Share this code or link to invite people to your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Referral Code</label>
            <div className="flex gap-2">
              <Input
                value={referralCode}
                readOnly
                className="flex-1 text-center font-mono text-2xl font-bold"
              />
              <Button onClick={handleCopyCode} variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Referral Link</label>
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="flex-1 text-sm"
              />
              <Button onClick={handleCopyLink} variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sponsor Info */}
      <SponsorInfoCard />

      {/* Stats and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserReferralStatsWidget />
        <VIPMilestoneProgress />
      </div>

      {/* Direct Team List */}
      <DirectReferralsList />

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How the 50-Level System Works</CardTitle>
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
              <h3 className="font-semibold mb-2">2. They Sign Up & Purchase</h3>
              <p className="text-sm text-muted-foreground">
                When they verify email and purchase/upgrade badges, you earn rewards
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold mb-2">3. Earn from 50 Levels</h3>
              <p className="text-sm text-muted-foreground">
                Get BSK rewards from direct referrals and their networks, up to 50 levels deep
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Badge-Based Level Unlocking</h4>
            <ul className="space-y-1 text-sm">
              <li>• <strong>No Badge:</strong> No levels unlocked</li>
              <li>• <strong>Silver Badge:</strong> Unlock levels 1-10</li>
              <li>• <strong>Gold Badge:</strong> Unlock levels 1-20</li>
              <li>• <strong>Platinum Badge:</strong> Unlock levels 1-30</li>
              <li>• <strong>Diamond Badge:</strong> Unlock levels 1-40</li>
              <li>• <strong>VIP Badge:</strong> Unlock all 50 levels + VIP milestone bonuses</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
