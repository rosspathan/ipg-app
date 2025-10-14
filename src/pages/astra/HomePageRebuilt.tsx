import * as React from "react"
import { useState } from "react"
import { Gift, Zap, Star, MessageCircle } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { AppTopBar } from "@/components/astra/AppTopBar"
import { KPICardUnified } from "@/components/home/KPICardUnified"
import { AddFundsCTA } from "@/components/home/AddFundsCTA"
import { BalanceDuoGrid } from "@/components/home/BalanceDuoGrid"
import { BskCardCompact } from "@/components/home/BskCardCompact"
import { RewardsBreakdown } from "@/components/home/RewardsBreakdown"
import { AnnouncementsBar } from "@/components/home/AnnouncementsBar"
import { HeroCarousel } from "@/components/home/HeroCarousel"
import { ProgramsGrid } from "@/components/programs-pro/ProgramsGrid"
import { ActivityTimeline } from "@/components/home/ActivityTimeline"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp"
import { ScrollingAnnouncement } from "@/components/home/ScrollingAnnouncement"
import { AnnouncementCarousel } from "@/components/home/AnnouncementCarousel"
import { useDisplayName } from "@/hooks/useDisplayName"
import { supabase } from "@/integrations/supabase/client"
import { useActivePrograms, getLucideIcon } from "@/hooks/useActivePrograms"
/**
 * HomePageRebuilt - World-class mobile-first home screen
 * DO NOT MODIFY THE FOOTER - DockNav remains untouched
 */
export function HomePageRebuilt() {
  const { navigate } = useNavigation()
  const [showRewardsBreakdown, setShowRewardsBreakdown] = useState(false)
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const displayName = useDisplayName()
  const { programs: allPrograms } = useActivePrograms()

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        console.info('USR_WALLET_LINK_V3', { user: data.user.id });
      }
    });
  }, []);

  const handleKPIPress = () => {
    console.log("KPI card pressed")
    navigate("/app/wallet")
  }

  // Transform programs for ProgramsGrid component (show first 8)
  const programs = allPrograms.slice(0, 8).map(program => {
    const IconComponent = getLucideIcon(program.icon);
    return {
      id: program.id,
      title: program.name,
      icon: <IconComponent className="h-5 w-5" />,
      onPress: () => navigate(program.route)
    };
  });

  const activities = [
    {
      id: "1",
      type: "reward" as const,
      title: "Daily Ad Mining Reward",
      subtitle: "Premium subscription tier",
      amount: 150,
      currency: "BSK",
      timestamp: new Date(Date.now() - 1800000),
      status: "completed" as const,
      icon: <Gift className="h-4 w-4" />
    },
    {
      id: "2",
      type: "spin" as const,
      title: "Fortune Wheel Spin",
      subtitle: "Lucky spin result",
      amount: 50,
      currency: "BSK",
      timestamp: new Date(Date.now() - 3600000),
      status: "completed" as const,
      icon: <Zap className="h-4 w-4" />
    },
    {
      id: "3",
      type: "stake" as const,
      title: "Staking Reward",
      subtitle: "12.4% APY earnings",
      amount: 89,
      currency: "BSK",
      timestamp: new Date(Date.now() - 7200000),
      status: "completed" as const,
      icon: <Star className="h-4 w-4" />
    }
  ]

  const announcementItems = [
    { id: "1", text: "BSK Loans: 0% interest for 16 weeks on amounts up to ₹50,000", type: "promotion" as const },
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
    <div className="min-h-screen" data-testid="page-home" data-version="usr-wallet-link-v3">
      {/* Header with Logo */}
      <AppTopBar />
      
      {/* Main Content with Padding */}
      <div className="space-y-6 p-4 pb-24">
        {/* Add Funds CTA */}
        <AddFundsCTA onPress={() => navigate("/app/wallet/deposit")} />

        {/* KPI Card Unified */}
        <KPICardUnified 
          onCardPress={handleKPIPress}
          data={[
            { label: "Portfolio", value: "₹0", subValue: "+0%", trend: "up", type: "portfolio" },
            { label: "24h Change", value: "+0%", subValue: "+₹0", trend: "up", type: "change" },
            { label: "User", value: displayName, type: "status" }
          ]}
        />

        {/* BSK Balance Cards - Side by Side */}
        <BalanceDuoGrid>
          <BskCardCompact
            variant="withdrawable"
            balance={0}
            fiatValue={0}
            bonusMetrics={{ today: 0, week: 0, lifetime: 0 }}
            onWithdraw={() => navigate("/app/programs/bsk-withdraw")}
            onTransfer={() => navigate("/app/programs/bsk-transfer")}
            onHistory={() => navigate("/app/wallet/history")}
            onViewBreakdown={() => setShowRewardsBreakdown(true)}
          />
          
          <BskCardCompact
            variant="holding"
            balance={0}
            fiatValue={0}
            onViewSchedule={() => setShowRewardsBreakdown(true)}
          />
        </BalanceDuoGrid>

        {/* Scrolling Announcement */}
        <ScrollingAnnouncement />

        {/* Announcement Carousel */}
        <AnnouncementCarousel />

        {/* Programs Grid */}
        <ProgramsGrid
          programs={programs}
          onViewAll={() => navigate("/app/programs")}
        />

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
    </div>
  )
}
