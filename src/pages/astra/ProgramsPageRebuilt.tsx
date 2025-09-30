import * as React from "react"
import { useState } from "react"
import { Gift, Star, Zap, Users, TrendingUp, Shield, Coins, Target, Sparkles } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { GridToolbar, type CategoryFilter, type SortOption } from "@/components/astra/GridToolbar"
import { ProgramGrid } from "@/components/astra/grid/ProgramGrid"
import { ProgramTile } from "@/components/astra/grid/ProgramTile"
import { GroupHeader } from "@/components/astra/grid/GroupHeader"

export function ProgramsPageRebuilt() {
  const { navigate } = useNavigation()
  
  const allPrograms = [
    // EARN
    {
      id: "advertise-mining",
      title: "Advertise Mining",
      subtitle: "Watch ads daily\nEarn BSK rewards",
      icon: <Gift className="h-6 w-6 text-success" />,
      category: "earn" as CategoryFilter,
      status: "available" as const,
      badge: "DAILY" as const,
      sparkline: [100, 120, 115, 140, 135, 160, 155],
      onPress: () => navigate("/app/programs/advertising")
    },
    {
      id: "staking",
      title: "Staking Rewards",
      subtitle: "12.4% APY\nFlexible terms",
      icon: <Star className="h-6 w-6 text-primary" />,
      category: "earn" as CategoryFilter,
      status: "available" as const,
      sparkline: [50, 55, 52, 58, 62, 59, 65],
      onPress: () => navigate("/app/programs/staking")
    },
    {
      id: "purchase",
      title: "One-Time Purchase",
      subtitle: "Promo channels\nSpecial offers",
      icon: <Coins className="h-6 w-6 text-warning" />,
      category: "earn" as CategoryFilter,
      status: "available" as const,
      badge: "NEW" as const,
      onPress: () => navigate("/app/programs/bsk-bonus")
    },

    // GAMES
    {
      id: "lucky-draw",
      title: "Lucky Draw",
      subtitle: "Pool lottery\nWin big prizes",
      icon: <Target className="h-6 w-6 text-warning" />,
      category: "games" as CategoryFilter,
      status: "available" as const,
      badge: "HOT" as const,
      progress: 78,
      onPress: () => navigate("/app-legacy/lucky")
    },
    {
      id: "spin-wheel",
      title: "i-SMART Spin",
      subtitle: "Daily spins\nProvably fair",
      icon: <Zap className="h-6 w-6 text-accent" />,
      category: "games" as CategoryFilter,
      status: "available" as const,
      badge: "LIVE" as const,
      onPress: () => navigate("/app/programs/spin")
    },

    // FINANCE
    {
      id: "loans",
      title: "BSK Loans",
      subtitle: "0% interest\n16 weeks term",
      icon: <Coins className="h-6 w-6 text-success" />,
      category: "finance" as CategoryFilter,
      status: "available" as const,
      onPress: () => navigate("/app-legacy/loans")
    },
    {
      id: "insurance",
      title: "Insurance Plans",
      subtitle: "Protect assets\n3 plans available",
      icon: <Shield className="h-6 w-6 text-accent" />,
      category: "finance" as CategoryFilter,
      status: "available" as const,
      onPress: () => navigate("/app/programs/insurance")
    },

    // NETWORK
    {
      id: "referrals",
      title: "Referral Program",
      subtitle: "Invite friends\nEarn together",
      icon: <Users className="h-6 w-6 text-secondary" />,
      category: "network" as CategoryFilter,
      status: "available" as const,
      badge: "NEW" as const,
      onPress: () => navigate("/app/programs/referrals")
    },

    // TRADING
    {
      id: "trading",
      title: "Trading Platform",
      subtitle: "Real-time data\nAdvanced tools",
      icon: <TrendingUp className="h-6 w-6 text-primary" />,
      category: "trading" as CategoryFilter,
      status: "available" as const,
      onPress: () => navigate("/app/trade")
    }
  ]
  const [searchValue, setSearchValue] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all")
  const [sortBy, setSortBy] = useState<SortOption>("most-used")
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)

  // Filter and sort programs
  const filteredPrograms = allPrograms
    .filter(program => {
      if (selectedCategory !== "all" && program.category !== selectedCategory) return false
      if (searchValue && !program.title.toLowerCase().includes(searchValue.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "a-z": return a.title.localeCompare(b.title)
        case "new": return (b.badge === "NEW" ? 1 : 0) - (a.badge === "NEW" ? 1 : 0)
        case "most-used":
        default: return 0
      }
    })

  // Group by category
  const grouped = {
    earn: filteredPrograms.filter(p => p.category === "earn"),
    games: filteredPrograms.filter(p => p.category === "games"),
    finance: filteredPrograms.filter(p => p.category === "finance"),
    network: filteredPrograms.filter(p => p.category === "network"),
    trading: filteredPrograms.filter(p => p.category === "trading")
  }

  const categoryLabels = {
    earn: { title: "Earn", icon: <Gift className="h-5 w-5" />, subtitle: "Passive income opportunities" },
    games: { title: "Games", icon: <Target className="h-5 w-5" />, subtitle: "Fun ways to win rewards" },
    finance: { title: "Finance", icon: <Coins className="h-5 w-5" />, subtitle: "Loans and protection" },
    network: { title: "Network", icon: <Users className="h-5 w-5" />, subtitle: "Build your team" },
    trading: { title: "Trading", icon: <TrendingUp className="h-5 w-5" />, subtitle: "Market opportunities" }
  }

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
      {/* Grid Toolbar (sticky header with search & filters) */}
      <GridToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Main Content */}
      <div className="space-y-6 pt-4 pb-8">
        {selectedCategory === "all" ? (
          // Show all categories with group headers
          Object.entries(grouped).map(([category, programs]) => {
            if (programs.length === 0) return null

            return (
              <div key={category}>
                <GroupHeader
                  title={categoryLabels[category as keyof typeof categoryLabels].title}
                  subtitle={categoryLabels[category as keyof typeof categoryLabels].subtitle}
                  icon={categoryLabels[category as keyof typeof categoryLabels].icon}
                  count={programs.length}
                />

                <div className="px-4">
                  <ProgramGrid>
                    {programs.map((program) => (
                      <ProgramTile key={program.id} {...program} />
                    ))}
                  </ProgramGrid>
                </div>
              </div>
            )
          })
        ) : (
          // Show single category
          <div className="px-4">
            <ProgramGrid>
              {filteredPrograms.map((program) => (
                <ProgramTile key={program.id} {...program} />
              ))}
            </ProgramGrid>
          </div>
        )}

        {/* Empty State */}
        {filteredPrograms.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <h3 className="font-heading font-semibold text-lg mb-2 text-foreground">No Programs Found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or filters
            </p>
          </div>
        )}
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
