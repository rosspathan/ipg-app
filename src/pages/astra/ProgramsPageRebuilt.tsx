import * as React from "react"
import { useState } from "react"
import { Gift, Star, Zap, Users, TrendingUp, Shield, Coins, Target } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { ProgramGrid } from "@/components/astra/grid/ProgramGrid"
import { ProgramTile } from "@/components/astra/grid/ProgramTile"

export function ProgramsPageRebuilt() {
  const { navigate } = useNavigation()
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  
  const allPrograms = [
    {
      id: "advertise-mining",
      title: "Advertise Mining",
      subtitle: "Watch ads daily\nEarn BSK rewards",
      icon: <Gift className="h-6 w-6 text-success" />,
      status: "available" as const,
      badge: "DAILY" as const,
      sparkline: [100, 120, 115, 140, 135, 160, 155],
      onPress: () => navigate("/app/programs/ads")
    },
    {
      id: "staking",
      title: "Staking Rewards",
      subtitle: "12.4% APY\nFlexible terms",
      icon: <Star className="h-6 w-6 text-primary" />,
      status: "available" as const,
      sparkline: [50, 55, 52, 58, 62, 59, 65],
      onPress: () => navigate("/app/programs/staking")
    },
    {
      id: "purchase",
      title: "BSK Purchase Bonus",
      subtitle: "Get 50% extra BSK\nLimited offer",
      icon: <Coins className="h-6 w-6 text-warning" />,
      status: "available" as const,
      badge: "NEW" as const,
      onPress: () => navigate("/app/programs/bsk-bonus")
    },
    {
      id: "lucky-draw",
      title: "Lucky Draw",
      subtitle: "Pool lottery\nWin big prizes",
      icon: <Target className="h-6 w-6 text-warning" />,
      status: "available" as const,
      badge: "HOT" as const,
      progress: 78,
      onPress: () => navigate("/app/programs/lucky-draw")
    },
    {
      id: "spin-wheel",
      title: "i-SMART Spin",
      subtitle: "Daily spins\nProvably fair",
      icon: <Zap className="h-6 w-6 text-accent" />,
      status: "available" as const,
      badge: "LIVE" as const,
      onPress: () => navigate("/app/programs/spin")
    },
    {
      id: "loans",
      title: "BSK Loans",
      subtitle: "0% interest\n16 weeks term",
      icon: <Coins className="h-6 w-6 text-success" />,
      status: "available" as const,
      onPress: () => navigate("/app/programs/loans")
    },
    {
      id: "insurance",
      title: "Insurance Plans",
      subtitle: "Protect assets\n3 plans available",
      icon: <Shield className="h-6 w-6 text-accent" />,
      status: "available" as const,
      onPress: () => navigate("/app/programs/insurance")
    },
    {
      id: "referrals",
      title: "Referral Program",
      subtitle: "Invite friends\nEarn together",
      icon: <Users className="h-6 w-6 text-secondary" />,
      status: "available" as const,
      badge: "NEW" as const,
      onPress: () => navigate("/app/programs/referrals")
    },
    {
      id: "subscriptions",
      title: "Subscriptions",
      subtitle: "Premium benefits\nExclusive perks",
      icon: <Star className="h-6 w-6 text-primary" />,
      status: "available" as const,
      onPress: () => navigate("/app/programs/subscriptions")
    },
    {
      id: "achievements",
      title: "Achievements",
      subtitle: "Track progress\nUnlock rewards",
      icon: <Target className="h-6 w-6 text-success" />,
      status: "available" as const,
      onPress: () => navigate("/app/programs/achievements")
    },
    {
      id: "trading",
      title: "Trading Platform",
      subtitle: "Real-time data\nAdvanced tools",
      icon: <TrendingUp className="h-6 w-6 text-primary" />,
      status: "available" as const,
      onPress: () => navigate("/app/trade")
    }
  ]

  const handleQuickSwitchAction = (action: string) => {
    switch (action) {
      case "deposit": navigate("/app/deposit"); break
      case "convert": navigate("/app/swap"); break
      case "trade": navigate("/app/trade"); break
      case "programs": navigate("/app/programs"); break
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-programs">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border-subtle">
        <div className="p-4">
          <h1 className="font-heading text-2xl font-bold text-foreground">Programs</h1>
          <p className="text-sm text-muted-foreground mt-1">Explore all available programs</p>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="p-4 pt-6">
        <ProgramGrid>
          {allPrograms.map((program) => (
            <ProgramTile key={program.id} {...program} />
          ))}
        </ProgramGrid>
      </div>

      {/* Bottom Navigation */}
      <DockNav
        onNavigate={navigate}
        onCenterPress={() => setShowQuickSwitch(true)}
      />

      {/* Quick Switch */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={handleQuickSwitchAction}
      />
    </div>
  )
}
