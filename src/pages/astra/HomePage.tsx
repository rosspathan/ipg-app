import * as React from "react"
import { Gift, Star, Zap, Users, TrendingUp, Shield, Coins, Target } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { SectionHeader } from "@/components/astra/SectionHeader"
import { BalanceCluster } from "@/components/astra/BalanceCluster"
import { ProgramTile } from "@/components/astra/ProgramTile"
import { AnnouncementCarousel } from "@/components/astra/AnnouncementCarousel"
import { Marquee } from "@/components/astra/Marquee"
import { ActivityList } from "@/components/astra/ActivityRow"
import { KPIChip } from "@/components/astra/KPIChip"
import { AstraCard } from "@/components/astra/AstraCard"

// Mock data - replace with real hooks
const mockKPIs = [
  { label: "24h P&L", value: "+5.67%", variant: "success" as const },
  { label: "Portfolio", value: "$15.2K" },
  { label: "APY", value: "12.4%" },
]

const mockActivities = [
  {
    id: "1",
    type: "deposit" as const,
    title: "BSK Deposit",
    description: "Deposited via bank transfer",
    amount: 1000,
    currency: "BSK",
    timestamp: new Date(Date.now() - 3600000),
    status: "completed" as const
  },
  {
    id: "2", 
    type: "spin" as const,
    title: "Fortune Wheel Spin",
    description: "Daily free spin reward",
    amount: 50,
    currency: "BSK",
    timestamp: new Date(Date.now() - 7200000),
    status: "completed" as const
  }
]

export function HomePage() {
  const { navigate } = useNavigation()

  const programs = [
    {
      title: "Advertise Mining",
      description: "Watch ads and earn BSK rewards with subscriptions",
      icon: <Gift className="h-6 w-6" />,
      category: "earn" as const,
      badge: { type: "daily" as const, text: "DAILY" },
      onPress: () => navigate("/app/programs/advertising")
    },
    {
      title: "Lucky Draw",
      description: "Join pool-based lottery draws to win big prizes",
      icon: <Target className="h-6 w-6" />,
      category: "games" as const,
      badge: { type: "hot" as const, text: "HOT" },
      onPress: () => navigate("/app/lucky")
    },
    {
      title: "Staking Rewards", 
      description: "Earn 12.4% APY on your crypto holdings",
      icon: <Star className="h-6 w-6" />,
      category: "finance" as const,
      onPress: () => navigate("/app/programs/staking")
    },
    {
      title: "BSK Fortune Wheel",
      description: "Spin to win or lose BSK Coins daily",
      icon: <Zap className="h-6 w-6" />,
      category: "games" as const,
      badge: { type: "live" as const, text: "LIVE" },
      onPress: () => navigate("/app/spin")
    },
    {
      title: "Trading",
      description: "Real-time market data & advanced tools",
      icon: <TrendingUp className="h-6 w-6" />,
      category: "trading" as const,
      badge: { type: "new" as const, text: "NEW" },
      onPress: () => navigate("/app/trade")
    },
    {
      title: "Referral Program",
      description: "Earn with friends & grow your network",
      icon: <Users className="h-6 w-6" />,
      category: "earn" as const,
      onPress: () => navigate("/app/programs/referrals")
    },
    {
      title: "BSK Loans",
      description: "Borrow ₹100-₹50k with 0% interest",
      icon: <Coins className="h-6 w-6" />,
      category: "finance" as const,
      onPress: () => navigate("/app/loans")
    },
    {
      title: "Insurance",
      description: "Protect your assets with insurance plans",
      icon: <Shield className="h-6 w-6" />,
      category: "finance" as const,
      onPress: () => navigate("/app/insurance")
    }
  ]

  return (
    <div className="p-4 space-y-6" data-testid="page-home">
      {/* KPI Row */}
      <div className="flex gap-2 overflow-x-auto pb-2" data-testid="kpi-row">
        {mockKPIs.map((kpi, index) => (
          <KPIChip
            key={index}
            variant={kpi.variant || "glass"}
            value={kpi.value}
            label={kpi.label}
            className="flex-shrink-0"
          />
        ))}
      </div>

      {/* Balance Overview */}
      <BalanceCluster />

      {/* Announcements */}
      <div className="space-y-3">
        <AnnouncementCarousel />
        <Marquee />
      </div>

      {/* Programs Section */}
      <div className="space-y-4">
        <SectionHeader
          title="My Programs"
          subtitle="Explore earning opportunities"
          action={{
            label: "View All",
            onClick: () => navigate("/app/programs")
          }}
        />
        
        <div className="grid grid-cols-2 gap-4" data-testid="programs-carousel">
          {programs.map((program, index) => (
            <ProgramTile
              key={program.title}
              title={program.title}
              description={program.description}
              icon={program.icon}
              category={program.category}
              badge={program.badge}
              onPress={program.onPress}
              className="animate-fade-in-scale"
              style={{ 
                animationDelay: `${index * 100}ms`,
                animationFillMode: "both"
              }}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <AstraCard variant="elevated">
        <div className="p-6">
          <SectionHeader
            title="Recent Activity"
            subtitle="Your latest transactions and rewards"
            action={{
              label: "View All",
              onClick: () => navigate("/app/wallet/history")
            }}
            className="mb-4"
          />
          
          <ActivityList 
            activities={mockActivities}
            emptyMessage="Start using the app to see your activity here"
          />
        </div>
      </AstraCard>
    </div>
  )
}