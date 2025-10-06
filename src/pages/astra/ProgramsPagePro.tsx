import * as React from "react"
import { ArrowLeft, Gift, Target, Zap, Star, Users, TrendingUp, Shield, Coins } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DockNav } from "@/components/navigation/DockNav"

interface Program {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  badge?: string
  badgeColor?: string
  route: string
}

const allPrograms: Program[] = [
  {
    id: "1",
    title: "Ad Mining",
    description: "Watch ads daily and earn BSK rewards",
    icon: <Gift className="h-6 w-6" />,
    badge: "DAILY",
    badgeColor: "bg-success/20 text-success",
    route: "/app/advertising"
  },
  {
    id: "2",
    title: "Lucky Draw",
    description: "Pool-based lottery with big prizes",
    icon: <Target className="h-6 w-6" />,
    badge: "HOT",
    badgeColor: "bg-danger/20 text-danger",
    route: "/app/lucky-draw"
  },
  {
    id: "3",
    title: "Spin Wheel",
    description: "Daily spins - provably fair",
    icon: <Zap className="h-6 w-6" />,
    badge: "LIVE",
    badgeColor: "bg-warning/20 text-warning",
    route: "/app/spin"
  },
  {
    id: "4",
    title: "Purchase",
    description: "One-time bonus & special offers",
    icon: <Coins className="h-6 w-6" />,
    badge: "NEW",
    badgeColor: "bg-primary/20 text-primary",
    route: "/programs/bsk-purchase"
  },
  {
    id: "5",
    title: "Referrals",
    description: "Invite friends and earn together",
    icon: <Users className="h-6 w-6" />,
    route: "/app/referrals"
  },
  {
    id: "6",
    title: "Staking",
    description: "12.4% APY with flexible terms",
    icon: <Star className="h-6 w-6" />,
    route: "/app/staking"
  },
  {
    id: "7",
    title: "Loans",
    description: "0% interest for 16 weeks",
    icon: <TrendingUp className="h-6 w-6" />,
    route: "/programs/loans"
  },
  {
    id: "8",
    title: "Insurance",
    description: "Protect assets with 24/7 claims",
    icon: <Shield className="h-6 w-6" />,
    route: "/programs/insurance"
  }
]

/**
 * ProgramsPagePro - Full grid view of all programs
 */
export function ProgramsPagePro() {
  const { navigate } = useNavigation()

  return (
    <div 
      data-testid="page-programs"
      className="min-h-screen bg-background pb-28"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/home")}
            className="h-9 w-9 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-[Space_Grotesk] font-bold text-xl text-foreground">
            My Programs
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-4">
        {/* Grid */}
        <div className="grid grid-cols-2 gap-4">
          {allPrograms.map((program) => (
            <button
              key={program.id}
              onClick={() => navigate(program.route)}
              className={cn(
                "p-4 rounded-2xl",
                "bg-card/60 backdrop-blur-xl border border-border/30",
                "transition-all duration-200",
                "hover:bg-card/80 hover:scale-[1.02] active:scale-95",
                "flex flex-col items-start gap-3"
              )}
              style={{
                WebkitBackdropFilter: 'blur(16px)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 20px rgba(124, 77, 255, 0.1)'
              }}
            >
              {/* Icon & Badge */}
              <div className="flex items-start justify-between w-full">
                <div
                  className={cn(
                    "h-14 w-14 rounded-full",
                    "bg-primary/10 border border-primary/20",
                    "flex items-center justify-center",
                    "text-primary"
                  )}
                >
                  {program.icon}
                </div>
                {program.badge && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-[Inter] font-bold uppercase",
                      program.badgeColor
                    )}
                  >
                    {program.badge}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="text-left w-full">
                <h3 className="font-[Space_Grotesk] font-bold text-sm text-foreground mb-1">
                  {program.title}
                </h3>
                <p className="font-[Inter] text-[11px] text-muted-foreground leading-tight">
                  {program.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <DockNav onNavigate={(path) => navigate(path)} />
    </div>
  )
}
