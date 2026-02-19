import * as React from "react"
import { useState } from "react"
import { 
  Gift, Zap, Star, ChevronRight, ArrowUpRight, Send, ArrowRightLeft,
  Pickaxe, Users, Dices, RotateCw, Landmark, TrendingUp, TrendingDown, Eye, EyeOff,
  Lock, History, Calendar
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
 * HomePageRebuilt - Premium Web3 futuristic home screen
 * Apple × Coinbase × Stripe inspired interface with theme support
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
    type: (tx.tx_type === 'credit' ? 'reward' : 'trade') as "reward" | "trade",
    title: getActivityTitle(tx.tx_type, tx.tx_subtype),
    subtitle: tx.notes || tx.tx_subtype,
    amount: Math.abs(tx.amount_bsk || 0),
    currency: "BSK" as const,
    timestamp: new Date(tx.created_at),
    status: "completed" as const,
    icon: <Gift className="h-4 w-4" />
  }))

  const quickActions = [
    { id: "team", label: "Team", icon: <Users className="h-4 w-4" />, route: "/app/programs/referral" },
    { id: "staking", label: "Staking", icon: <Landmark className="h-4 w-4" />, route: "/app/staking" },
    { id: "trading", label: "Trading", icon: <TrendingUp className="h-4 w-4" />, route: "/app/trade" },
  ]

  return (
    <div className="min-h-screen pb-20 bg-background relative" data-testid="page-home">
      <RefreshControl onRefresh={handleRefresh} className="min-h-screen">
        <div className="space-y-6">

          {/* ── HERO SECTION ── */}
          <div className="relative px-4 pt-6 pb-5 overflow-hidden">
            {/* Premium ambient orb glow */}
            <div className="absolute top-0 left-1/3 w-[280px] h-[280px] rounded-full opacity-[0.08] pointer-events-none bg-[radial-gradient(circle,hsl(var(--primary))_0%,transparent_70%)] blur-3xl" />
            <div className="absolute bottom-0 right-0 w-[200px] h-[200px] rounded-full opacity-[0.06] pointer-events-none bg-[radial-gradient(circle,hsl(var(--accent))_0%,transparent_70%)] blur-2xl" />

            <div className="relative z-10 space-y-5">
              {/* Welcome */}
              <p className="text-[13px] font-semibold tracking-wide text-primary/80 uppercase">
                Welcome back
              </p>

              {/* Portfolio Value */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h1 className="text-[36px] font-extrabold tracking-tight tabular-nums font-heading bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent drop-shadow-sm">
                    {balanceHidden ? '••••••' : `₹${(balance.total * BSK_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </h1>
                  <button
                    onClick={() => setBalanceHidden(!balanceHidden)}
                    className="p-2 rounded-xl transition-all duration-200 bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/20 hover:shadow-button"
                  >
                    {balanceHidden ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>

                {/* Today's change */}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success)/0.5)]" />
                  <span className="text-[13px] font-semibold tabular-nums text-success">
                    {balanceHidden ? '••••' : `+₹${(balance.todayEarned * BSK_TO_INR).toFixed(2)} Today`}
                  </span>
                </div>
              </div>

              {/* Premium Glass Action Buttons */}
              <div className="flex gap-3">
                {[
                  { label: "Add Funds", icon: <ArrowUpRight className="h-[18px] w-[18px]" />, action: () => navigate("/app/wallet/deposit") },
                  { label: "Send", icon: <Send className="h-[18px] w-[18px]" />, action: () => navigate("/app/programs/bsk-transfer") },
                  { label: "Swap", icon: <ArrowRightLeft className="h-[18px] w-[18px]" />, action: () => navigate("/app/swap") },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 h-[46px] rounded-2xl",
                      "text-[13px] font-semibold",
                      "glass-card backdrop-blur-xl",
                      "border border-primary/15",
                      "text-foreground/90",
                      "shadow-card",
                      "transition-all duration-200",
                      "hover:shadow-elevated hover:border-primary/30 hover:-translate-y-0.5",
                      "active:scale-[0.98]"
                    )}
                  >
                    <span className="text-primary">{btn.icon}</span>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── BALANCE MODULE ── */}
          <div className="px-4 grid grid-cols-2 gap-3">
            {/* Tradable */}
            <div
              className="p-4 rounded-3xl space-y-2 glass-card backdrop-blur-xl border border-primary/15 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tradable</p>
              <p className="text-lg font-extrabold tabular-nums text-success font-heading">
                {balanceHidden ? '••••' : balance.withdrawable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground">BSK</p>
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => navigate("/app/programs/bsk-withdraw")}
                  className="flex-1 h-8 rounded-xl text-[10px] font-semibold bg-success/10 border border-success/20 text-success transition-all hover:bg-success/15 hover:shadow-sm"
                >
                  Withdraw
                </button>
                <button
                  onClick={() => navigate("/app/programs/bsk-transfer")}
                  className="flex-1 h-8 rounded-xl text-[10px] font-semibold bg-card/80 border border-border text-muted-foreground transition-all hover:border-primary/20 hover:shadow-sm"
                >
                  Transfer
                </button>
              </div>
            </div>

            {/* Locked */}
            <div
              className="p-4 rounded-3xl space-y-2 glass-card backdrop-blur-xl border border-primary/15 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-primary/60" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Locked</p>
              </div>
              <p className="text-lg font-extrabold tabular-nums text-primary font-heading">
                {balanceHidden ? '••••' : balance.holding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground">BSK</p>
              <button
                onClick={() => setShowRewardsBreakdown(true)}
                className="w-full h-8 rounded-xl text-[10px] font-semibold mt-1 bg-primary/8 border border-primary/15 text-primary transition-all hover:bg-primary/12 hover:shadow-sm"
              >
                <Calendar className="inline h-3 w-3 mr-1" />
                Schedule
              </button>
            </div>
          </div>

          {/* History button */}
          <div className="px-4">
            <button
              onClick={() => navigate("/app/wallet/history/bsk")}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl text-[12px] font-medium glass-card backdrop-blur-xl border border-border/50 text-muted-foreground shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5"
            >
              <History className="h-3.5 w-3.5" />
              View Full History
              <ChevronRight className="h-3.5 w-3.5 ml-auto" />
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
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground/75">Markets</h2>
              <button
                onClick={() => navigate("/app/trade")}
                className="text-[12px] font-medium flex items-center gap-1 text-accent"
              >
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-3xl overflow-hidden glass-card backdrop-blur-xl border border-border/40 shadow-card"
            >
              {(tradingPairs || []).slice(0, 5).map((pair, i) => {
                const isPositive = pair.change24h >= 0
                return (
                  <div key={pair.id}>
                    <button
                      onClick={() => navigate(`/app/trade/${pair.symbol.replace('/', '_')}`)}
                      className="w-full flex items-center justify-between px-4 py-3.5 transition-all duration-150 hover:bg-primary/[0.03]"
                    >
                      <div className="text-left">
                        <p className="text-[13px] font-bold text-foreground">
                          {pair.baseAsset}<span className="text-muted-foreground font-medium">/{pair.quoteAsset}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-[13px] font-mono font-bold tabular-nums text-foreground">
                          {pair.price >= 1 ? pair.price.toFixed(2) : pair.price.toFixed(6)}
                        </p>
                        <div
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold min-w-[72px] justify-center",
                            isPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                          )}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isPositive ? '+' : ''}{pair.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                    {i < Math.min((tradingPairs || []).length, 5) - 1 && (
                      <div className="mx-4 h-px bg-border/20" />
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

          {/* ── SMART ACTION STRIP ── */}
          <div className="px-4 space-y-3">
            <h2 className="text-[14px] font-bold text-foreground/80">Quick Actions</h2>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.route)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap",
                    "text-[12px] font-semibold flex-shrink-0",
                    "glass-card backdrop-blur-xl border border-primary/15",
                    "text-foreground/85 shadow-card",
                    "transition-all duration-200",
                    "hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30"
                  )}
                >
                  <span className="text-primary">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── FEATURE GRID ── */}
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-foreground/80">Programs</h2>
              <button
                onClick={() => navigate("/app/programs")}
                className="text-[12px] font-semibold flex items-center gap-1 text-primary"
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
                      "p-4 rounded-3xl text-left space-y-3",
                      "glass-card backdrop-blur-xl border border-primary/15 shadow-card",
                      "transition-all duration-200",
                      "hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30"
                    )}
                  >
                    <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-primary/8 shadow-sm">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{prog.name}</p>
                      <p className="text-[11px] mt-0.5 font-medium text-muted-foreground">Tap to start</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── LIVE ACTIVITY FEED ── */}
          <div className="px-4 space-y-3">
            <h2 className="text-[14px] font-bold text-foreground/80">Recent Activity</h2>
            
            {activities.length === 0 ? (
              <div className="text-center py-10 text-[13px] text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-2.5">
                {activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3.5 rounded-2xl glass-card backdrop-blur-xl border border-border/30 shadow-card transition-all duration-150 hover:shadow-elevated"
                  >
                    {/* Glow dot */}
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0 bg-success shadow-[0_0_8px_hsl(var(--success)/0.5)]" />

                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold truncate text-foreground/90">
                        {activity.title}
                      </p>
                      <p className="text-[10px] truncate text-muted-foreground">
                        {activity.subtitle}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] font-bold tabular-nums text-success">
                        +{activity.amount.toFixed(2)}
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
