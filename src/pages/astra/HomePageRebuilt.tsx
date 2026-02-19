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
    <div className="min-h-screen pb-20 bg-background" data-testid="page-home">
      <RefreshControl onRefresh={handleRefresh} className="min-h-screen">
        <div className="space-y-6">

          {/* ── HERO SECTION ── */}
          <div className="relative px-4 pt-6 pb-5 overflow-hidden">
            {/* Subtle ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-[0.07] pointer-events-none bg-[radial-gradient(circle,hsl(var(--accent))_0%,transparent_70%)]" />

            <div className="relative z-10 space-y-5">
              {/* Welcome */}
              <p className="text-[13px] font-medium text-accent">
                Welcome back
              </p>

              {/* Portfolio Value */}
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-[32px] font-bold tracking-tight tabular-nums text-foreground font-heading">
                    {balanceHidden ? '••••••' : `₹${(balance.total * BSK_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </h1>
                  <button
                    onClick={() => setBalanceHidden(!balanceHidden)}
                    className="p-1.5 rounded-lg transition-colors bg-muted/50"
                  >
                    {balanceHidden ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>

                {/* Today's change */}
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-[13px] font-semibold tabular-nums text-success">
                    {balanceHidden ? '••••' : `+₹${(balance.todayEarned * BSK_TO_INR).toFixed(2)} Today`}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {[
                  { label: "Add Funds", icon: <ArrowUpRight className="h-4 w-4" />, action: () => navigate("/app/wallet/deposit") },
                  { label: "Send", icon: <Send className="h-4 w-4" />, action: () => navigate("/app/programs/bsk-transfer") },
                  { label: "Swap", icon: <ArrowRightLeft className="h-4 w-4" />, action: () => navigate("/app/swap") },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className="flex-1 flex items-center justify-center gap-2 h-[42px] rounded-xl text-[13px] font-semibold transition-colors bg-card/70 border border-accent/15 text-foreground/90 backdrop-blur-xl"
                  >
                    {btn.icon}
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── BALANCE MODULE ── */}
          <div className="px-4 grid grid-cols-2 gap-3">
            {/* Tradable */}
            <div className="p-4 rounded-[14px] space-y-2 bg-card/60 border border-accent/12 backdrop-blur-2xl">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tradable</p>
              <p className="text-lg font-bold tabular-nums text-success font-heading">
                {balanceHidden ? '••••' : balance.withdrawable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-muted-foreground">BSK</p>
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => navigate("/app/programs/bsk-withdraw")}
                  className="flex-1 h-7 rounded-lg text-[10px] font-semibold bg-success/10 border border-success/20 text-success"
                >
                  Withdraw
                </button>
                <button
                  onClick={() => navigate("/app/programs/bsk-transfer")}
                  className="flex-1 h-7 rounded-lg text-[10px] font-semibold bg-muted/50 border border-border text-muted-foreground"
                >
                  Transfer
                </button>
              </div>
            </div>

            {/* Locked */}
            <div className="p-4 rounded-[14px] space-y-2 bg-card/60 border border-primary/12 backdrop-blur-2xl">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Locked</p>
              </div>
              <p className="text-lg font-bold tabular-nums text-primary font-heading">
                {balanceHidden ? '••••' : balance.holding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-muted-foreground">BSK</p>
              <button
                onClick={() => setShowRewardsBreakdown(true)}
                className="w-full h-7 rounded-lg text-[10px] font-semibold mt-1 bg-primary/10 border border-primary/20 text-primary"
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
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[12px] font-medium bg-card/50 border border-border text-muted-foreground"
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

            <div className="rounded-xl overflow-hidden bg-card/80 border border-border/50">
              {(tradingPairs || []).slice(0, 5).map((pair, i) => {
                const isPositive = pair.change24h >= 0
                return (
                  <div key={pair.id}>
                    <button
                      onClick={() => navigate(`/app/trade/${pair.symbol.replace('/', '_')}`)}
                      className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="text-left">
                        <p className="text-[13px] font-semibold text-foreground">
                          {pair.baseAsset}<span className="text-muted-foreground">/{pair.quoteAsset}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-[13px] font-mono font-semibold tabular-nums text-foreground">
                          {pair.price >= 1 ? pair.price.toFixed(2) : pair.price.toFixed(6)}
                        </p>
                        <div
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold min-w-[72px] justify-center",
                            isPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                          )}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isPositive ? '+' : ''}{pair.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                    {i < Math.min((tradingPairs || []).length, 5) - 1 && (
                      <div className="mx-4 h-px bg-border/30" />
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
            <h2 className="text-[14px] font-semibold text-foreground/75">Quick Actions</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.route)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-[12px] font-medium flex-shrink-0 transition-colors bg-card/70 border border-accent/10 text-foreground/80"
                >
                  <span className="text-accent">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── FEATURE GRID ── */}
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground/75">Programs</h2>
              <button
                onClick={() => navigate("/app/programs")}
                className="text-[12px] font-medium flex items-center gap-1 text-accent"
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
                    className="p-4 rounded-xl text-left space-y-3 transition-colors bg-card/80 border border-border/50"
                  >
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-accent/8">
                      <IconComponent className="h-4.5 w-4.5 text-accent" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{prog.name}</p>
                      <p className="text-[11px] mt-0.5 text-muted-foreground">Tap to start</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── LIVE ACTIVITY FEED ── */}
          <div className="px-4 space-y-3">
            <h2 className="text-[14px] font-semibold text-foreground/75">Recent Activity</h2>
            
            {activities.length === 0 ? (
              <div className="text-center py-10 text-[13px] text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40"
                  >
                    {/* Glow dot */}
                    <div className="h-2 w-2 rounded-full flex-shrink-0 bg-success shadow-[0_0_6px_hsl(var(--success)/0.4)]" />

                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate text-foreground/85">
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
