import * as React from "react"
import { useState } from "react"
import { Gift, Star, Zap, Users, TrendingUp, Shield, Coins, Target, Sparkles } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { AppShellGlass } from "@/components/astra/AppShellGlass"
import { GridToolbar, type CategoryFilter, type SortOption } from "@/components/astra/grid/GridToolbar"
import { GridViewport } from "@/components/astra/grid/GridViewport"
import { ProgramGrid } from "@/components/astra/grid/ProgramGrid"
import { ProgramTile } from "@/components/astra/grid/ProgramTile"
import { GroupHeader } from "@/components/astra/grid/GroupHeader"
import { BottomSheetFilters, type FilterState } from "@/components/astra/grid/BottomSheetFilters"
import { QuickActionsRibbon } from "@/components/astra/grid/QuickActionsRibbon"
import { TilePeek } from "@/components/astra/grid/TilePeek"

const allPrograms = [
  // EARN
  {
    id: "advertise-mining",
    title: "Advertise Mining",
    subtitle: "Watch ads and earn BSK rewards with premium subscriptions",
    icon: <Gift className="h-6 w-6" />,
    category: "earn" as CategoryFilter,
    status: "available" as const,
    badge: "DAILY" as const,
    sparkline: [100, 120, 115, 140, 135, 160, 155],
    metrics: [
      { label: "Daily Earning", value: "150-500", type: "currency" as const },
      { label: "Subscription Tiers", value: 5, type: "count" as const },
      { label: "Success Rate", value: 95, type: "percentage" as const }
    ],
    actions: [
      { label: "Watch Ads", variant: "default" as const, onPress: () => {} },
      { label: "Upgrade Plan", variant: "secondary" as const, onPress: () => {} }
    ],
    onPress: () => console.log("Navigate to advertising")
  },
  {
    id: "staking-rewards",
    title: "Staking Rewards", 
    subtitle: "Earn 12.4% APY on your crypto holdings with flexible terms",
    icon: <Star className="h-6 w-6" />,
    category: "earn" as CategoryFilter,
    status: "available" as const,
    sparkline: [50, 55, 52, 58, 62, 59, 65],
    metrics: [
      { label: "Current APY", value: "12.4%", type: "percentage" as const },
      { label: "Min Stake", value: "1000", type: "currency" as const },
      { label: "Lock Period", value: "Flexible", type: "count" as const }
    ],
    onPress: () => console.log("Navigate to staking")
  },
  {
    id: "referral-program",
    title: "Referral Program",
    subtitle: "Earn commissions by referring friends and building your network",
    icon: <Users className="h-6 w-6" />,
    category: "earn" as CategoryFilter,
    status: "available" as const,
    onPress: () => console.log("Navigate to referrals")
  },

  // GAMES
  {
    id: "lucky-draw",
    title: "Lucky Draw",
    subtitle: "Join pool-based lottery draws to win big prizes",
    icon: <Target className="h-6 w-6" />,
    category: "games" as CategoryFilter,
    status: "available" as const,
    badge: "HOT" as const,
    progress: 78,
    metrics: [
      { label: "Current Pool", value: "₹50,000", type: "currency" as const },
      { label: "Ticket Price", value: "₹100", type: "currency" as const },
      { label: "Fill Progress", value: 78, type: "percentage" as const }
    ],
    onPress: () => console.log("Navigate to lucky")
  },
  {
    id: "fortune-wheel",
    title: "BSK Fortune Wheel",
    subtitle: "Spin daily to win or lose BSK Coins with provably fair results",
    icon: <Zap className="h-6 w-6" />,
    category: "games" as CategoryFilter,
    status: "available" as const,
    badge: "LIVE" as const,
    onPress: () => console.log("Navigate to spin")
  },

  // FINANCE  
  {
    id: "bsk-loans",
    title: "BSK Loans",
    subtitle: "Borrow ₹100 to ₹50,000 with 0% interest for 16 weeks",
    icon: <Coins className="h-6 w-6" />,
    category: "finance" as CategoryFilter,
    status: "available" as const,
    metrics: [
      { label: "Interest Rate", value: "0%", type: "percentage" as const },
      { label: "Max Amount", value: "₹50,000", type: "currency" as const },
      { label: "Repayment", value: "16 weeks", type: "count" as const }
    ],
    onPress: () => console.log("Navigate to loans")
  },
  {
    id: "insurance-plans",
    title: "Insurance Plans",
    subtitle: "Protect your assets with comprehensive insurance coverage",
    icon: <Shield className="h-6 w-6" />,
    category: "finance" as CategoryFilter,
    status: "available" as const,
    onPress: () => console.log("Navigate to insurance")
  },

  // TRADING
  {
    id: "trading-platform",
    title: "Trading Platform",
    subtitle: "Real-time market data & advanced trading tools",
    icon: <TrendingUp className="h-6 w-6" />,
    category: "trading" as CategoryFilter,
    status: "available" as const,
    badge: "NEW" as const,
    onPress: () => console.log("Navigate to trade")
  }
]

const defaultFilters: FilterState = {
  categories: [],
  regions: ["global"],
  status: ["active"],
  minReward: 0,
  maxReward: 50000,
  volatilityMode: false,
  activeOnly: true
}

export function ProgramsPage() {
  const { navigate } = useNavigation()
  const [searchValue, setSearchValue] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all")
  const [sortBy, setSortBy] = useState<SortOption>("most-used")
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedTiles, setExpandedTiles] = useState<Set<string>>(new Set())

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
        default: return 0 // Mock usage data
      }
    })

  // Group programs by category for display
  const groupedPrograms = {
    earn: filteredPrograms.filter(p => p.category === "earn"),
    games: filteredPrograms.filter(p => p.category === "games"), 
    finance: filteredPrograms.filter(p => p.category === "finance"),
    trading: filteredPrograms.filter(p => p.category === "trading")
  }

  const categoryLabels = {
    earn: { title: "Earn", icon: <Gift className="h-5 w-5" />, subtitle: "Passive income opportunities" },
    games: { title: "Games", icon: <Target className="h-5 w-5" />, subtitle: "Fun ways to win rewards" },
    finance: { title: "Finance", icon: <Coins className="h-5 w-5" />, subtitle: "Loans and protection" },
    trading: { title: "Trading", icon: <TrendingUp className="h-5 w-5" />, subtitle: "Market opportunities" }
  }

  const toggleTileExpansion = (programId: string) => {
    setExpandedTiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(programId)) {
        newSet.delete(programId)
      } else {
        newSet.add(programId)
      }
      return newSet
    })
  }

  const getQuickActions = (program: any) => [
    { id: "quick-view", label: "Quick View", icon: "👁️", variant: "default" as const, onPress: () => program.onPress() },
    { id: "bookmark", label: "Bookmark", icon: "🔖", variant: "default" as const, onPress: () => {} },
    { id: "share", label: "Share", icon: "📤", variant: "default" as const, onPress: () => {} }
  ]

  const renderProgram = (program: any, index: number) => {
    const isExpanded = expandedTiles.has(program.id)
    
    const tileContent = (
      <div className="space-y-3">
        <ProgramTile
          title={program.title}
          subtitle={program.subtitle}
          icon={program.icon}
          badge={program.badge}
          status={program.status}
          sparkline={program.sparkline}
          progress={program.progress}
          onPress={program.onPress}
          onLongPress={() => toggleTileExpansion(program.id)}
          className="animate-fade-in-scale"
        />
        
        {isExpanded && program.metrics && (
          <QuickActionsRibbon 
            actions={getQuickActions(program)}
            compact={true}
            data-testid="quick-actions"
          />
        )}
      </div>
    )

    return program.metrics ? (
      <TilePeek
        key={program.id}
        content={{
          title: program.title,
          description: program.subtitle,
          details: [
            "Comprehensive program with multiple earning opportunities",
            "24/7 customer support available",
            "Instant rewards and transparent tracking",
            "Mobile-optimized for seamless experience"
          ],
          metrics: program.metrics,
          actions: program.actions
        }}
      >
        {tileContent}
      </TilePeek>
    ) : tileContent
  }

  const topBar = (
    <GridToolbar
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
      sortBy={sortBy}
      onSortChange={setSortBy}
      onOpenFilters={() => setShowFilters(true)}
    />
  )

  return (
    <AppShellGlass topBar={topBar} data-testid="page-programs">
      <div className="space-y-6 pb-24">
        {selectedCategory === "all" ? (
          // Show grouped by category
          Object.entries(groupedPrograms).map(([category, programs]) => {
            if (programs.length === 0) return null
            
            return (
              <div key={category}>
                <GroupHeader
                  title={categoryLabels[category].title}
                  subtitle={categoryLabels[category].subtitle} 
                  icon={categoryLabels[category].icon}
                  count={programs.length}
                />
                
                <div className="px-4">
                  <ProgramGrid>
                    {programs.map((program, index) => renderProgram(program, index))}
                  </ProgramGrid>
                </div>
              </div>
            )
          })
        ) : (
          // Show filtered category
          <div className="px-4">
            <ProgramGrid>
              {filteredPrograms.map((program, index) => renderProgram(program, index))}
            </ProgramGrid>
          </div>
        )}

        {filteredPrograms.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No Programs Found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* Filters Bottom Sheet */}
      <BottomSheetFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
      />
    </AppShellGlass>
  )
}