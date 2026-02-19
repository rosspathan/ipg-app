import * as React from "react"
import { 
  Gift, Star, Zap, Users, TrendingUp, Shield, Coins, Target, 
  Award, ChevronRight, Archive, CreditCard
} from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { cn } from "@/lib/utils"

interface ProgramItem {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  route: string
  badge?: { text: string; variant: 'success' | 'danger' | 'warning' | 'accent' | 'primary' | 'muted' }
}

interface CategorySection {
  title: string
  emoji: string
  programs: ProgramItem[]
}

const badgeClasses: Record<string, string> = {
  success: "bg-success/10 text-success border-success/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  accent: "bg-accent/10 text-accent border-accent/30",
  primary: "bg-primary/10 text-primary border-primary/30",
  muted: "bg-muted text-muted-foreground border-border",
}

function ProgramTileCompact({ program, onPress }: { program: ProgramItem; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className={cn(
        "relative w-full text-left rounded-xl p-4 h-[116px]",
        "bg-card border border-border/50",
        "transition-all duration-200",
        "hover:border-accent/20 hover:shadow-[0_0_24px_hsl(var(--accent)/0.08)]"
      )}
    >
      {program.badge && (
        <span className={cn(
          "absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border",
          badgeClasses[program.badge.variant]
        )}>
          {program.badge.text}
        </span>
      )}

      <div className="flex flex-col items-center justify-center h-full gap-2.5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50 border border-border/50">
          {program.icon}
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-foreground">
            {program.title}
          </p>
          <p className="text-[10px] mt-0.5 text-muted-foreground">
            {program.subtitle}
          </p>
        </div>
      </div>
    </button>
  )
}

export function ProgramsPageRebuilt() {
  const { navigate } = useNavigation()

  const categories: CategorySection[] = [
    {
      title: "Earn",
      emoji: "💰",
      programs: [
        {
          id: "staking",
          title: "Staking",
          subtitle: "Earn monthly yield",
          icon: <Star className="h-5 w-5 text-accent" />,
          route: "/app/staking",
        },
      ],
    },
    {
      title: "Growth",
      emoji: "👥",
      programs: [
        {
          id: "referrals",
          title: "Team Referrals",
          subtitle: "Invite & earn together",
          icon: <Users className="h-5 w-5 text-accent" />,
          route: "/app/programs/referrals",
          badge: { text: "NEW", variant: "accent" },
        },
        {
          id: "badges",
          title: "Badge System",
          subtitle: "Unlock tiers & perks",
          icon: <Award className="h-5 w-5 text-warning" />,
          route: "/app/programs/achievements",
        },
        {
          id: "subscriptions",
          title: "Subscriptions",
          subtitle: "Premium benefits",
          icon: <CreditCard className="h-5 w-5 text-primary" />,
          route: "/app/programs/subscriptions",
        },
      ],
    },
    {
      title: "Protection",
      emoji: "🛡",
      programs: [
        {
          id: "loans",
          title: "Loans",
          subtitle: "USDI collateral loans",
          icon: <Coins className="h-5 w-5 text-muted-foreground" />,
          route: "/app/programs/loans",
          badge: { text: "ARCHIVED", variant: "warning" },
        },
      ],
    },
    {
      title: "Trading",
      emoji: "📈",
      programs: [
        {
          id: "trading",
          title: "Trading",
          subtitle: "Real-time exchange",
          icon: <TrendingUp className="h-5 w-5 text-accent" />,
          route: "/app/trade",
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen pb-32 bg-background" data-testid="page-programs">
      <div className="px-4 pt-5 pb-4 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Programs</h1>
          <p className="text-xs mt-0.5 text-muted-foreground">
            Explore the IPG ecosystem
          </p>
        </div>

        {/* Promo Banner */}
        <button
          onClick={() => navigate("/app/programs/bsk-bonus")}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 bg-accent/5 border border-accent/15 hover:bg-accent/10"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent">
              NEW
            </span>
            <span className="text-xs font-medium text-foreground/85">
              BSK Purchase Bonus — Get 50% extra
            </span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Categories */}
        {categories.map((cat) => (
          <div key={cat.title} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">{cat.emoji}</span>
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {cat.title}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {cat.programs.map((program) => (
                <ProgramTileCompact
                  key={program.id}
                  program={program}
                  onPress={() => navigate(program.route)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
