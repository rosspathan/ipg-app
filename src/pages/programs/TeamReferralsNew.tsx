import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ReferralCodeCard } from "@/components/referrals/ReferralCodeCard"
import { StatCard } from "@/components/referrals/StatCard"
import { Users, TrendingUp, Award, Target, ArrowRight, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"
import { useReferralCode } from "@/hooks/useReferralCode"
import { useDirectReferralCount } from "@/hooks/useDirectReferralCount"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

export default function TeamReferralsNew() {
  const navigate = useNavigate()
  const { referralCode, stats, loading } = useReferralCode()
  const { data: directReferralCount = 0, isLoading: countLoading } = useDirectReferralCount()

  if (loading) {
    return (
      <ProgramPageTemplate title="Team Referrals" subtitle="Build your network and earn">
        <div className="space-y-4 pb-24">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      </ProgramPageTemplate>
    )
  }

  return (
    <ProgramPageTemplate 
      title="Team Referrals" 
      subtitle="Build your network and earn commissions"
    >
      <div className="space-y-6 pb-24">
        {/* Referral Code Card */}
        <ReferralCodeCard 
          referralCode={referralCode}
        />

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Users}
            label="Direct Referrals"
            value={countLoading ? '...' : directReferralCount}
            onClick={() => navigate('/app/programs/team-referrals/team')}
          />
          <StatCard
            icon={TrendingUp}
            label="Total Earned"
            value={`${stats.totalEarned.toFixed(0)} BSK`}
            sublabel="All time earnings"
          />
          <StatCard
            icon={Award}
            label="Total Network"
            value={stats.totalReferrals}
            sublabel="All levels"
            onClick={() => navigate('/app/programs/team-referrals/team')}
          />
          <StatCard
            icon={Target}
            label="Team Levels"
            value={7}
            sublabel="Network depth"
          />
        </div>

        {/* Commission Structure */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              50-Level Commission System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Earn commissions from up to 50 levels deep in your referral network. Each level contributes to your passive income.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Direct Referrals (L1)</span>
                <span className="text-sm font-bold text-primary">10%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Levels 2-10</span>
                <span className="text-sm font-bold text-primary">5%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Levels 11-50</span>
                <span className="text-sm font-bold text-primary">2%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-3">
          <Button 
            size="lg" 
            variant="outline" 
            className="w-full h-14 justify-between"
            onClick={() => navigate('/app/programs/team-referrals/team')}
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <span className="font-semibold">View Your Team</span>
            </div>
            <ArrowRight className="h-5 w-5" />
          </Button>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="w-full h-14 justify-between"
            onClick={() => navigate('/app/programs/team-referrals/earnings')}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">Commission History</span>
            </div>
            <ArrowRight className="h-5 w-5" />
          </Button>

          <Button 
            size="lg" 
            variant="outline" 
            className="w-full h-14 justify-between"
            onClick={() => navigate('/app/programs/team-referrals/vip-milestone-history')}
          >
            <div className="flex items-center gap-3">
              <History className="h-5 w-5" />
              <span className="font-semibold">VIP Milestone History</span>
            </div>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                1
              </div>
              <div>
                <p className="font-semibold text-sm">Share Your Code</p>
                <p className="text-sm text-muted-foreground">
                  Send your unique referral code to friends and family
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                2
              </div>
              <div>
                <p className="font-semibold text-sm">They Join & Earn</p>
                <p className="text-sm text-muted-foreground">
                  When they sign up and purchase badges, you earn commissions
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                3
              </div>
              <div>
                <p className="font-semibold text-sm">Grow Your Network</p>
                <p className="text-sm text-muted-foreground">
                  Earn from their referrals too, up to 50 levels deep
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProgramPageTemplate>
  )
}
