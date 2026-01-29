import * as React from "react"
import { useState } from "react"
import { Gift, Zap, Star, MessageCircle, History, ChevronRight } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { KPICardUnified } from "@/components/home/KPICardUnified"
import { AddFundsCTA } from "@/components/home/AddFundsCTA"
import { BalanceDuoGrid } from "@/components/home/BalanceDuoGrid"
import { BskCardCompact } from "@/components/home/BskCardCompact"
import { RewardsBreakdown } from "@/components/home/RewardsBreakdown"
import { ProgramsGrid } from "@/components/programs-pro/ProgramsGrid"
import { ActivityTimeline } from "@/components/home/ActivityTimeline"
import { Button } from "@/components/ui/button"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { ScrollingAnnouncement } from "@/components/home/ScrollingAnnouncement"
import { ImageCarousel } from "@/components/home/ImageCarousel"
import { RefreshControl } from "@/components/ui/refresh-control"
import { useActivePrograms, getLucideIcon } from "@/hooks/useActivePrograms"
import { useHomePageData } from "@/hooks/useHomePageData"
import { HomePageSkeleton } from "@/components/home/HomePageSkeleton"
/**
 * HomePageRebuilt - World-class mobile-first home screen
 * DO NOT MODIFY THE FOOTER - DockNav remains untouched
 */
export function HomePageRebuilt() {
  const { navigate } = useNavigation()
  const [showRewardsBreakdown, setShowRewardsBreakdown] = useState(false)
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const { programs: allPrograms } = useActivePrograms()
  
  // Single batched data fetch for optimal performance
  const { data, isLoading, refetch } = useHomePageData()

  const BSK_TO_INR = 1; // 1 BSK = 1 INR

  // Show skeleton on initial load to prevent flicker
  if (isLoading) {
    return <HomePageSkeleton />
  }

  // Extract data with safe defaults
  const balance = data?.balance || {
    withdrawable: 0,
    holding: 0,
    total: 0,
    earnedWithdrawable: 0,
    earnedHolding: 0,
    todayEarned: 0,
    weekEarned: 0,
  }
  const recentActivity = data?.recentActivity || []
  const displayName = data?.displayName || 'User'

  const handleRefresh = async () => {
    await refetch()
  }

  const handleKPIPress = () => {
    console.log("KPI card pressed")
    navigate("/app/wallet")
  }

  // Transform programs for ProgramsGrid
  const programs = allPrograms.slice(0, 8).map((prog) => {
    const IconComponent = getLucideIcon(prog.icon)
    return {
      id: prog.id,
      title: prog.name,
      icon: <IconComponent className="h-5 w-5" />,
      onPress: () => navigate(prog.route)
    }
  })

  // Map real activity to display format
  const getActivityIcon = (txType: string, txSubtype: string) => {
    if (txSubtype?.includes('ad_mining') || txSubtype?.includes('ad')) return <Gift className="h-4 w-4" />;
    if (txSubtype?.includes('spin')) return <Zap className="h-4 w-4" />;
    if (txSubtype?.includes('stake')) return <Star className="h-4 w-4" />;
    return <Gift className="h-4 w-4" />;
  };

  const getActivityTitle = (txType: string, txSubtype: string) => {
    if (txSubtype?.includes('ad_mining')) return 'Ad Mining Reward';
    if (txSubtype?.includes('spin')) return 'Spin Wheel Win';
    if (txSubtype?.includes('lucky_draw')) return 'Lucky Draw';
    if (txSubtype?.includes('stake')) return 'Staking Reward';
    if (txSubtype?.includes('referral')) return 'Referral Bonus';
    return txSubtype || 'Transaction';
  };

  const activities = (recentActivity || []).map((tx: any) => ({
    id: tx.id,
    type: (tx.tx_type === 'credit' ? 'reward' : 'trade') as "reward" | "trade",
    title: getActivityTitle(tx.tx_type, tx.tx_subtype),
    subtitle: tx.notes || tx.tx_subtype,
    amount: Math.abs(tx.amount_bsk || 0),
    currency: "BSK" as const,
    timestamp: new Date(tx.created_at),
    status: "completed" as const,
    icon: getActivityIcon(tx.tx_type, tx.tx_subtype)
  }))

  const announcementItems = [
    { id: "1", text: "🎉 Welcome to IPG i-SMART! Earn rewards daily through programs", type: "promotion" as const },
    { id: "2", text: "Trading competition starts Monday - Win up to ₹25,000 in prizes", type: "info" as const },
    { id: "3", text: "New insurance plans available with 24/7 claim support", type: "success" as const }
  ]

  const heroSlides = [
    {
      id: "1",
      image: "/placeholder.svg",
      title: "Welcome to IPG I-SMART",
      description: "Trade crypto, earn rewards, and grow your portfolio",
      cta: {
        label: "Get Started",
        onClick: () => navigate("/app/programs")
      }
    }
  ]

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="page-home" data-version="usr-wallet-link-v3">
      <RefreshControl onRefresh={handleRefresh} className="min-h-screen">
        <div className="space-y-6">
        {/* Add Funds CTA */}
        <AddFundsCTA onPress={() => navigate("/app/wallet/deposit")} />

        {/* KPI Card Unified */}
        <KPICardUnified 
          onCardPress={handleKPIPress}
          data={[
            { 
              label: "Portfolio", 
              value: `₹${(balance.total * BSK_TO_INR).toFixed(2)}`,
              subValue: `${balance.total.toFixed(2)} BSK`,
              trend: "up", 
              type: "portfolio" 
            },
            { 
              label: "Today's Earnings", 
              value: `+₹${(balance.todayEarned * BSK_TO_INR).toFixed(2)}`,
              subValue: `+${balance.todayEarned.toFixed(2)} BSK`,
              trend: balance.todayEarned > 0 ? "up" : "neutral",
              type: "change" 
            },
            { 
              label: "User", 
              value: displayName, 
              type: "status" 
            }
          ]}
        />

        {/* BSK Balance Cards - Side by Side */}
        <BalanceDuoGrid>
          <BskCardCompact
            variant="withdrawable"
            balance={balance.withdrawable}
            fiatValue={balance.withdrawable * BSK_TO_INR}
            bonusMetrics={{ 
              today: balance.todayEarned, 
              week: balance.weekEarned, 
              lifetime: balance.earnedWithdrawable 
            }}
            onWithdraw={() => navigate("/app/programs/bsk-withdraw")}
            onTransfer={() => navigate("/app/programs/bsk-transfer")}
            onHistory={() => navigate("/app/wallet/history/bsk")}
            onViewBreakdown={() => setShowRewardsBreakdown(true)}
            onRefresh={handleRefresh}
          />
          
          <BskCardCompact
            variant="holding"
            balance={balance.holding}
            fiatValue={balance.holding * BSK_TO_INR}
            onViewSchedule={() => setShowRewardsBreakdown(true)}
            onRefresh={handleRefresh}
          />
        </BalanceDuoGrid>

        {/* View Full History Button */}
        <div className="px-4 -mt-2">
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => navigate("/app/wallet/history/bsk")}
          >
            <History className="w-4 h-4 mr-2" />
            View Full History
            <ChevronRight className="w-4 h-4 ml-auto" />
          </Button>
        </div>

        {/* Scrolling Announcement */}
        <ScrollingAnnouncement />

        {/* Image Carousel - Admin uploaded banners */}
        <ImageCarousel />

        {/* Quick Access - Popular Programs */}
        <div className="px-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Quick Access</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/app/programs")}
              className="text-primary"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {allPrograms.slice(0, 4).map((prog) => {
              const IconComponent = getLucideIcon(prog.icon);
              return (
                <button
                  key={prog.id}
                  onClick={() => navigate(prog.route)}
                  className="p-4 rounded-xl bg-card border border-border hover:bg-accent transition-colors text-left"
                >
                  <div className="flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{prog.name}</p>
                      <p className="text-xs text-muted-foreground">Tap to start</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* All Programs Grid */}
        <ProgramsGrid
          programs={programs}
          title="All Programs"
          onViewAll={() => navigate("/app/programs")}
        />

        {/* Activity Timeline - Always render to prevent layout shift */}
        <ActivityTimeline activities={activities} isLoading={false} />
        </div>
      </RefreshControl>

      {/* Rewards Breakdown Bottom Sheet */}
      <RewardsBreakdown
        isOpen={showRewardsBreakdown}
        onClose={() => setShowRewardsBreakdown(false)}
      />

      {/* Quick Switch Radial Menu */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={(action) => {
          switch (action) {
            case "deposit":
              navigate("/app/wallet/deposit")
              break
            case "convert":
              navigate("/app/swap")
              break
            case "trade":
              navigate("/app/trade")
              break
            case "programs":
              navigate("/app/programs")
              break
          }
        }}
      />
    </div>
  )
}
