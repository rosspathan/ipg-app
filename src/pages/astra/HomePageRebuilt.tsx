import * as React from "react"
import { useState } from "react"
import { 
  Gift, ChevronRight, ArrowUpRight, Send, ArrowRightLeft,
  Users, Landmark, TrendingUp, TrendingDown, Eye, EyeOff,
  Lock, History, Calendar, Users2, Zap, ArrowRight
} from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { RewardsBreakdown } from "@/components/home/RewardsBreakdown"
import { Button } from "@/components/ui/button"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { ScrollingAnnouncement } from "@/components/home/ScrollingAnnouncement"
import { ImageCarousel } from "@/components/home/ImageCarousel"
import { RefreshControl } from "@/components/ui/refresh-control"
import { useActivePrograms, getLucideIcon } from "@/hooks/useActivePrograms"
import { useHomePageData } from "@/hooks/useHomePageData"
import { HomePageSkeleton } from "@/components/home/HomePageSkeleton"
import { ActivityTimeline } from "@/components/home/ActivityTimeline"
import { USDILoanCard } from "@/components/wallet/USDILoanCard"
import { useTradingPairs } from "@/hooks/useTradingPairs"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

/**
 * HomePageRebuilt - World-Class Web3 Premium Home Screen
 * Apple × Coinbase × Binance inspired interface with full theme support
 */
export function HomePageRebuilt() {
  const { navigate } = useNavigation()
  const [showRewardsBreakdown, setShowRewardsBreakdown] = useState(false)
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const [balanceHidden, setBalanceHidden] = useState(false)
  const { programs: allPrograms } = useActivePrograms()
  const { data: tradingPairs } = useTradingPairs()
  
  const { data, isLoading, refetch } = useHomePageData()

  const BSK_TO_INR = 1

  if (isLoading) {
    return <HomePageSkeleton />
  }

  const balance = data?.balance || {
    withdrawable: 0, holding: 0, total: 0,
    earnedWithdrawable: 0, earnedHolding: 0, todayEarned: 0, weekEarned: 0,
  }
  const recentActivity = data?.recentActivity || []
  const displayName = data?.displayName || 'User'

  const handleRefresh = async () => { await refetch() }

  const getActivityTitle = (txType: string, txSubtype: string) => {
    if (txSubtype?.includes('ad_mining')) return 'Ad Mining Reward'
    if (txSubtype?.includes('spin')) return 'Game Reward'
    if (txSubtype?.includes('lucky_draw')) return 'Draw Prize'
    if (txSubtype?.includes('stake')) return 'Staking Reward'
    if (txSubtype?.includes('referral')) return 'Referral Bonus'
    return txSubtype || 'Transaction'
  }

  const activities = (recentActivity || []).map((tx: any) => ({
    id: tx.id,
    type: tx.tx_type as string,
    title: getActivityTitle(tx.tx_type, tx.tx_subtype),
    subtitle: tx.notes || tx.tx_subtype,
    amount: Math.abs(tx.amount_bsk || 0),
    currency: "BSK" as const,
    timestamp: new Date(tx.created_at),
    status: "completed" as const,
    isCredit: tx.tx_type === 'credit',
  }))

  // Per-action color identities for quick actions
  const quickActions = [
    { 
      id: "team", label: "Team", icon: <Users className="h-4 w-4" />, route: "/app/programs/referral",
      iconColor: "text-success", iconBg: "bg-success/12 border-success/20"
    },
    { 
      id: "staking", label: "Staking", icon: <Landmark className="h-4 w-4" />, route: "/app/staking",
      iconColor: "text-warning", iconBg: "bg-warning/12 border-warning/20"
    },
    { 
      id: "trading", label: "Trading", icon: <TrendingUp className="h-4 w-4" />, route: "/app/trade",
      iconColor: "text-primary", iconBg: "bg-primary/12 border-primary/20"
    },
  ]

  // Hero action buttons with per-action color identity
  const heroActions = [
    { 
      label: "Add Funds", icon: <ArrowUpRight className="h-[18px] w-[18px]" />, 
      action: () => navigate("/app/wallet/deposit"),
      iconColor: "text-success", borderColor: "border-success/25", hoverBorder: "hover:border-success/40"
    },
    { 
      label: "Send", icon: <Send className="h-[18px] w-[18px]" />, 
      action: () => navigate("/app/programs/bsk-transfer"),
      iconColor: "text-primary", borderColor: "border-primary/25", hoverBorder: "hover:border-primary/40"
    },
    { 
      label: "Swap", icon: <ArrowRightLeft className="h-[18px] w-[18px]" />, 
      action: () => navigate("/app/swap"),
      iconColor: "text-warning", borderColor: "border-warning/25", hoverBorder: "hover:border-warning/40"
    },
  ]

  return (
    <div className="min-h-screen pb-20 bg-background relative" data-testid="page-home">
      <RefreshControl onRefresh={handleRefresh} className="min-h-screen">
        <div className="space-y-6">

          {/* ── HERO SECTION ── */}
          <div className="relative px-4 pt-6 pb-5 overflow-hidden">
            {/* Premium ambient orb glows */}
            <div className="absolute top-0 left-1/3 w-[300px] h-[300px] rounded-full opacity-[0.10] pointer-events-none bg-[radial-gradient(circle,hsl(var(--primary))_0%,transparent_70%)] blur-3xl" />
            <div className="absolute bottom-0 right-0 w-[200px] h-[200px] rounded-full opacity-[0.07] pointer-events-none bg-[radial-gradient(circle,hsl(var(--accent))_0%,transparent_70%)] blur-2xl" />
            <div className="absolute top-1/2 left-0 w-[150px] h-[150px] rounded-full opacity-[0.05] pointer-events-none bg-[radial-gradient(circle,hsl(var(--success))_0%,transparent_70%)] blur-2xl" />

            <div className="relative z-10 space-y-5">
              {/* Welcome label — refined */}
              <p className="text-[11px] font-bold tracking-widest text-primary/70 uppercase">
                Welcome back
              </p>

              {/* Portfolio Value */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className={cn(
                    "text-[38px] font-extrabold tracking-tight tabular-nums font-heading transition-all duration-300",
                    "balance-gradient-text"
                  )}>
                    {balanceHidden ? '••••••' : `₹${(balance.total * BSK_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </h1>
                  <button
                    onClick={() => setBalanceHidden(!balanceHidden)}
                    className="p-2 rounded-xl transition-all duration-200 bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/20 hover:shadow-button"
                  >
                    {balanceHidden ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>

                {/* Subtle glow below balance */}
                <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                {/* Today's change — pill treatment */}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success)/0.5)]" />
                  <span className="text-[12px] font-semibold tabular-nums text-success px-2 py-0.5 rounded-full bg-success/8 border border-success/15">
                    {balanceHidden ? '••••' : `+₹${(balance.todayEarned * BSK_TO_INR).toFixed(2)} Today`}
                  </span>
                </div>
              </div>

              {/* Premium Glass Action Buttons — per-action color identity */}
              <div className="flex gap-3">
                {heroActions.map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 h-[50px] rounded-2xl",
                      "text-[13px] font-semibold",
                      "glass-card backdrop-blur-xl",
                      "border",
                      btn.borderColor,
                      "text-foreground/90",
                      "shadow-card",
                      "transition-all duration-200",
                      btn.hoverBorder,
                      "hover:shadow-elevated hover:-translate-y-0.5",
                      "active:scale-[0.97] active:translate-y-0"
                    )}
                  >
                    <span className={btn.iconColor}>{btn.icon}</span>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── BALANCE MODULE ── */}
          <div className="px-4 grid grid-cols-2 gap-3">
            {/* Tradable Card */}
            <div className="relative p-4 rounded-3xl space-y-2 glass-card backdrop-blur-xl border border-success/20 card-glow-success transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5 overflow-hidden">
              {/* Top rim gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-success/[0.06] to-transparent pointer-events-none rounded-3xl" />
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-14 h-14 bg-gradient-to-bl from-success/10 to-transparent rounded-bl-full pointer-events-none" />

              <div className="relative">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tradable</p>
                <p className="text-[24px] font-extrabold tabular-nums font-mono text-success mt-1.5">
                  {balanceHidden ? '••••' : balance.withdrawable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground">BSK</p>
                <div className="flex gap-1.5 pt-2">
                  <button
                    onClick={() => navigate("/app/programs/bsk-withdraw")}
                    className="flex-1 h-8 rounded-xl text-[10px] font-semibold bg-success/15 border border-success/30 text-success transition-all hover:bg-success/20 hover:shadow-sm active:scale-[0.97]"
                  >
                    Withdraw
                  </button>
                  <button
                    onClick={() => navigate("/app/programs/bsk-transfer")}
                    className="flex-1 h-8 rounded-xl text-[10px] font-semibold bg-muted/60 border border-border text-foreground/70 transition-all hover:border-primary/20 hover:shadow-sm active:scale-[0.97]"
                  >
                    Transfer
                  </button>
                </div>
              </div>
            </div>

            {/* Locked Card */}
            <div className="relative p-4 rounded-3xl space-y-2 glass-card backdrop-blur-xl border border-primary/20 card-glow-primary transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5 overflow-hidden">
              {/* Top rim gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] to-transparent pointer-events-none rounded-3xl" />
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-14 h-14 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-primary/60" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Locked</p>
                </div>
                <p className="text-[24px] font-extrabold tabular-nums font-mono text-primary mt-1.5">
                  {balanceHidden ? '••••' : balance.holding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground">BSK</p>
                <button
                  onClick={() => setShowRewardsBreakdown(true)}
                  className="w-full h-8 rounded-xl text-[10px] font-semibold mt-2 bg-primary/12 border border-primary/25 text-primary transition-all hover:bg-primary/18 hover:shadow-sm active:scale-[0.97]"
                >
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Schedule
                </button>
              </div>
            </div>
          </div>

          {/* History button */}
          <div className="px-4">
            <button
              onClick={() => navigate("/app/wallet/history/bsk")}
              className="w-full flex items-center gap-3 h-12 px-4 rounded-2xl text-[13px] font-semibold glass-card backdrop-blur-xl border border-border/50 text-foreground/80 shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/20 active:scale-[0.97]"
            >
              <div className="h-7 w-7 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20">
                <History className="h-3.5 w-3.5 text-primary" />
              </div>
              View Full History
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </button>
          </div>

          {/* ── IMAGE CAROUSEL ── */}
          <ImageCarousel />

          {/* ── USDI LOAN CARD ── */}
          <div className="px-4">
            <USDILoanCard />
          </div>

          {/* ── MARKETS PREVIEW ── */}
          <div className="px-4 space-y-3">
            {/* Section header with Live badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Markets</h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shadow-[0_0_4px_hsl(var(--success)/0.6)]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-success">Live</span>
                </div>
              </div>
              <button
                onClick={() => navigate("/app/trade")}
                className="text-[12px] font-semibold flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
              >
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Markets container with ambient glow */}
            <div className="relative">
              <div className="absolute -inset-2 rounded-3xl pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_80%_100%,hsl(245_80%_68%/0.12),transparent_70%)]" />
              <div className="relative rounded-3xl overflow-hidden glass-card backdrop-blur-xl border border-border/30 shadow-card">
                {(tradingPairs || []).slice(0, 5).map((pair, i) => {
                  const isPositive = pair.change24h >= 0
                  return (
                    <div key={pair.id}>
                      <button
                        onClick={() => navigate(`/app/trade/${pair.symbol.replace('/', '_')}`)}
                        className="w-full flex items-center justify-between px-4 py-3.5 transition-all duration-150 hover:bg-primary/[0.05]"
                      >
                        <div className="text-left">
                          <p className="text-[13px] font-bold text-foreground">
                            {pair.baseAsset}<span className="text-muted-foreground font-medium">/{pair.quoteAsset}</span>
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            Vol: {(pair.volume24h || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[13px] font-mono font-bold tabular-nums text-foreground">
                            {pair.price >= 1 ? pair.price.toFixed(2) : pair.price.toFixed(6)}
                          </p>
                          <div
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold min-w-[68px] justify-center border",
                              isPositive 
                                ? "bg-success/10 text-success border-success/25" 
                                : "bg-danger/10 text-danger border-danger/25"
                            )}
                          >
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isPositive ? '+' : ''}{pair.change24h.toFixed(2)}%
                          </div>
                        </div>
                      </button>
                      {i < Math.min((tradingPairs || []).length, 5) - 1 && (
                        <div className="mx-4 h-px bg-border/25" />
                      )}
                    </div>
                  )
                })}
                {(!tradingPairs || tradingPairs.length === 0) && (
                  <div className="text-center py-8 text-[12px] text-muted-foreground">
                    Loading markets...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SMART ACTION STRIP ── */}
          <div className="px-4 space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</h2>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.route)}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-3 rounded-2xl whitespace-nowrap",
                    "text-[12px] font-semibold flex-shrink-0",
                    "glass-card backdrop-blur-xl border border-border/40",
                    "text-foreground/85 shadow-card",
                    "transition-all duration-200",
                    "hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/25",
                    "active:scale-[0.96]"
                  )}
                >
                  {/* Colored icon container */}
                  <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center border", action.iconBg)}>
                    <span className={action.iconColor}>{action.icon}</span>
                  </div>
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── FEATURE GRID ── */}
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Programs</h2>
              <button
                onClick={() => navigate("/app/programs")}
                className="text-[12px] font-semibold flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
              >
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {allPrograms.slice(0, 4).map((prog) => {
                const IconComponent = getLucideIcon(prog.icon)
                return (
                  <button
                    key={prog.id}
                    onClick={() => navigate(prog.route)}
                    className={cn(
                      "relative p-4 rounded-3xl text-left space-y-3",
                      "glass-card backdrop-blur-xl border border-primary/15 shadow-card",
                      "overflow-hidden",
                      "transition-all duration-200",
                      "hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30",
                      "hover:shadow-[0_0_20px_hsl(var(--primary)/0.12)]",
                      "active:scale-[0.96]"
                    )}
                  >
                    {/* Corner accent */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-full pointer-events-none" />
                    
                    <div className="relative">
                      <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 shadow-sm">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-[13px] font-bold text-foreground">{prog.name}</p>
                      <p className="text-[11px] mt-0.5 font-medium text-muted-foreground line-clamp-1">
                        {prog.description || 'Tap to explore'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── LIVE ACTIVITY FEED ── */}
          <div className="px-4 space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</h2>
            
            {activities.length === 0 ? (
              <div className="text-center py-10 text-[13px] text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-2xl glass-card backdrop-blur-xl shadow-card",
                      "transition-all duration-150 hover:shadow-elevated",
                      "border",
                      activity.isCredit ? "border-success/15" : "border-border/30"
                    )}
                  >
                    {/* Icon tile */}
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      activity.isCredit ? "bg-success/12 border border-success/20" : "bg-muted/50 border border-border/40"
                    )}>
                      <Gift className={cn("h-4 w-4", activity.isCredit ? "text-success" : "text-muted-foreground")} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate text-foreground/90">
                        {activity.title}
                      </p>
                      <p className="text-[10px] truncate text-muted-foreground">
                        {activity.subtitle}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={cn(
                        "text-[12px] font-bold tabular-nums",
                        activity.isCredit ? "text-success" : "text-danger"
                      )}>
                        {activity.isCredit ? '+' : '-'}{activity.amount.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
            case "deposit": navigate("/app/wallet/deposit"); break
            case "convert": navigate("/app/swap"); break
            case "trade": navigate("/app/trade"); break
            case "programs": navigate("/app/programs"); break
          }
        }}
      />
    </div>
  )
}
