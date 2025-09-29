import * as React from "react"
import { useState } from "react"
import { Gift, Star, Zap, Users, TrendingUp, Shield, Coins, Target, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useNavigation } from "@/hooks/useNavigation"
import { SectionHeader } from "@/components/astra/SectionHeader"
import { ProgramTile } from "@/components/astra/ProgramTile"

type ProgramCategory = "all" | "earn" | "games" | "finance" | "trading"

const categoryConfig = {
  all: {
    label: "All Programs",
    icon: Sparkles,
    color: "text-text-primary"
  },
  earn: {
    label: "Earn", 
    icon: Gift,
    color: "text-accent"
  },
  games: {
    label: "Games",
    icon: Target,
    color: "text-primary"
  },
  finance: {
    label: "Finance",
    icon: Coins,
    color: "text-warning"
  },
  trading: {
    label: "Trading",
    icon: TrendingUp,
    color: "text-success"
  }
}

export function ProgramsPage() {
  const { navigate } = useNavigation()
  const [selectedCategory, setSelectedCategory] = useState<ProgramCategory>("all")

  const programs = [
    {
      title: "Advertise Mining",
      description: "Watch ads and earn BSK rewards with premium subscriptions",
      icon: <Gift className="h-6 w-6" />,
      category: "earn" as const,
      status: "available" as const,
      badge: { type: "daily" as const, text: "DAILY" },
      onPress: () => navigate("/app/programs/advertising")
    },
    {
      title: "Lucky Draw",
      description: "Join pool-based lottery draws to win big prizes",
      icon: <Target className="h-6 w-6" />,
      category: "games" as const,
      status: "available" as const,
      badge: { type: "hot" as const, text: "HOT" },
      onPress: () => navigate("/app/lucky")
    },
    {
      title: "Staking Rewards",
      description: "Earn 12.4% APY on your crypto holdings with flexible terms",
      icon: <Star className="h-6 w-6" />,
      category: "finance" as const,
      status: "available" as const,
      onPress: () => navigate("/app/programs/staking")
    },
    {
      title: "BSK Fortune Wheel",
      description: "Spin daily to win or lose BSK Coins with provably fair results",
      icon: <Zap className="h-6 w-6" />,
      category: "games" as const,
      status: "available" as const,
      badge: { type: "live" as const, text: "LIVE" },
      onPress: () => navigate("/app/spin")
    },
    {
      title: "Trading Platform",
      description: "Real-time market data & advanced trading tools",
      icon: <TrendingUp className="h-6 w-6" />,
      category: "trading" as const,
      status: "available" as const,
      badge: { type: "new" as const, text: "NEW" },
      onPress: () => navigate("/app/trade")
    },
    {
      title: "Referral Program",
      description: "Earn commissions by referring friends and building your network",
      icon: <Users className="h-6 w-6" />,
      category: "earn" as const,
      status: "available" as const,
      onPress: () => navigate("/app/programs/referrals")
    },
    {
      title: "BSK Loans",
      description: "Borrow ₹100 to ₹50,000 with 0% interest for 16 weeks",
      icon: <Coins className="h-6 w-6" />,
      category: "finance" as const,
      status: "available" as const,
      onPress: () => navigate("/app/loans")
    },
    {
      title: "Insurance Plans",
      description: "Protect your assets with comprehensive insurance coverage",
      icon: <Shield className="h-6 w-6" />,
      category: "finance" as const,
      status: "available" as const,
      onPress: () => navigate("/app/insurance")
    }
  ]

  const filteredPrograms = selectedCategory === "all" 
    ? programs 
    : programs.filter(p => p.category === selectedCategory)

  return (
    <div className="p-4 space-y-6" data-testid="page-programs">
      {/* Header */}
      <SectionHeader
        title="Programs"
        subtitle="Explore all earning opportunities and features"
      />

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2" data-testid="category-chips">
        {Object.entries(categoryConfig).map(([key, config]) => {
          const Icon = config.icon
          const isSelected = selectedCategory === key
          
          return (
            <Button
              key={key}
              variant={isSelected ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(key as ProgramCategory)}
              className={cn(
                "flex items-center gap-2 flex-shrink-0 transition-all duration-standard",
                isSelected 
                  ? "bg-accent/20 text-accent border-accent/30" 
                  : "text-text-secondary hover:text-text-primary hover:bg-card-glass/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </Button>
          )
        })}
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-2 gap-4" data-testid="program-grid">
        {filteredPrograms.map((program, index) => (
          <ProgramTile
            key={program.title}
            title={program.title}
            description={program.description}
            icon={program.icon}
            category={program.category}
            status={program.status}
            badge={program.badge}
            onPress={program.onPress}
            className="animate-fade-in-scale"
            style={{ 
              animationDelay: `${index * 50}ms`,
              animationFillMode: "both"
            }}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredPrograms.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <div className="relative">
            <Gift className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-xl opacity-20" />
          </div>
          <p className="font-bold text-lg mb-2">No Programs Found</p>
          <p className="text-sm">Try selecting a different category</p>
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
        <p className="text-sm text-text-secondary">
          More programs are being added regularly. 
          <br />
          <span className="text-primary font-medium">Check back soon for new opportunities!</span>
        </p>
      </div>
    </div>
  )
}