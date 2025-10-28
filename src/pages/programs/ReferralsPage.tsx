import * as React from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { Users, Award, Crown, Share2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useReferralCode } from "@/hooks/useReferralCode"
import { useDirectReferralCount } from "@/hooks/useDirectReferralCount"
import { copyToClipboard } from "@/utils/clipboard"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReferralsPage() {
  const { toast } = useToast();
  const { referralCode, stats, loading } = useReferralCode();
  const { data: directReferralCount = 0 } = useDirectReferralCount();

  const handleCopyCode = async () => {
    const success = await copyToClipboard(referralCode);
    if (success) {
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const handleShare = async () => {
    const shareText = `Join IPG I-SMART! Use my referral code: ${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join IPG Exchange',
          text: shareText
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      const success = await copyToClipboard(shareText);
      if (success) {
        toast({
          title: "Copied!",
          description: "Referral code copied to clipboard",
        });
      }
    }
  };

  const milestones = [
    {
      id: "silver",
      title: "Silver",
      subtitle: `${directReferralCount}/5 referrals`,
      icon: <Award className="h-5 w-5" />,
      progress: { value: Math.min((directReferralCount / 5) * 100, 100), label: `${directReferralCount}/5` },
      footer: "Unlock 2% bonus",
      onPress: () => console.log("Silver")
    },
    {
      id: "gold",
      title: "Gold",
      subtitle: `${directReferralCount}/10 referrals`,
      icon: <Award className="h-5 w-5" />,
      badge: directReferralCount >= 5 ? "HOT" as const : undefined,
      progress: { value: Math.min((directReferralCount / 10) * 100, 100), label: `${directReferralCount}/10` },
      footer: "Unlock 5% bonus",
      onPress: () => console.log("Gold")
    },
    {
      id: "platinum",
      title: "Platinum",
      subtitle: `${directReferralCount}/25 referrals`,
      icon: <Crown className="h-5 w-5" />,
      progress: { value: Math.min((directReferralCount / 25) * 100, 100), label: `${directReferralCount}/25` },
      footer: "Unlock 10% bonus",
      onPress: () => console.log("Platinum")
    },
    {
      id: "diamond",
      title: "Diamond",
      subtitle: `${directReferralCount}/50 referrals`,
      icon: <Crown className="h-5 w-5" />,
      badge: directReferralCount >= 25 ? "NEW" as const : undefined,
      progress: { value: Math.min((directReferralCount / 50) * 100, 100), label: `${directReferralCount}/50` },
      footer: "Unlock 20% bonus",
      onPress: () => console.log("Diamond")
    }
  ];

  return (
    <ProgramPageTemplate
      title="Referrals"
      subtitle="Invite friends and earn commissions"
      headerActions={
        <Button size="sm" variant="default" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      }
    >
      <div className="space-y-6" data-testid="referrals-grids">
        {/* Referral Code Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="text-center space-y-2 mb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Referral Code</p>
                  <p className="font-mono font-bold text-2xl text-primary tracking-wider">
                    {referralCode}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={handleCopyCode}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button size="sm" onClick={handleShare} className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Code
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12 mx-auto" /> : directReferralCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Direct</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-success">{loading ? <Skeleton className="h-8 w-16 mx-auto" /> : `${stats.totalEarned.toFixed(0)}`}</p>
              <p className="text-xs text-muted-foreground mt-1">Earned BSK</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12 mx-auto" /> : stats.activeReferrals}</p>
              <p className="text-xs text-muted-foreground mt-1">Active</p>
            </CardContent>
          </Card>
        </div>

        {/* VIP Milestones */}
        <div>
          <h3 className="font-semibold text-base mb-4 text-foreground">VIP Milestones</h3>
          <ProgramGrid>
            {milestones.map((milestone) => (
              <ProgramTileUltra key={milestone.id} {...milestone} />
            ))}
          </ProgramGrid>
        </div>
      </div>
    </ProgramPageTemplate>
  )
}
