import * as React from "react"
import { useState } from "react"
import { 
  Gift, Zap, Star, ChevronRight, ArrowUpRight, Send, ArrowRightLeft,
  Pickaxe, Users, Dices, RotateCw, Landmark, TrendingUp, Eye, EyeOff,
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
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

/**
 * HomePageRebuilt - Premium Web3 futuristic home screen
 * Apple × Coinbase × Stripe inspired dark quantum interface
 */
export function HomePageRebuilt() {
  const { navigate } = useNavigation()
  const [showRewardsBreakdown, setShowRewardsBreakdown] = useState(false)
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const [balanceHidden, setBalanceHidden] = useState(false)
  const { programs: allPrograms } = useActivePrograms()
  
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
    if (txSubtype?.includes('spin')) return 'Spin Wheel Win'
    if (txSubtype?.includes('lucky_draw')) return 'Lucky Draw'
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
    { id: "mining", label: "Ad Mining", icon: <Pickaxe className="h-4 w-4" />, route: "/app/programs/ad-mining" },
    { id: "team", label: "Team", icon: <Users className="h-4 w-4" />, route: "/app/programs/referral" },
    { id: "lucky", label: "Lucky Draw", icon: <Dices className="h-4 w-4" />, route: "/app/programs/lucky-draw" },
    { id: "spin", label: "Spin Wheel", icon: <RotateCw className="h-4 w-4" />, route: "/app/programs/spin-wheel" },
    { id: "staking", label: "Staking", icon: <Landmark className="h-4 w-4" />, route: "/app/programs/staking" },
    { id: "trading", label: "Trading", icon: <TrendingUp className="h-4 w-4" />, route: "/app/trade" },
  ]

  return (
    <div className="min-h-screen pb-20" data-testid="page-home" style={{ background: '#0B1020' }}>
      <RefreshControl onRefresh={handleRefresh} className="min-h-screen">
        <div className="space-y-6">

          {/* ── HERO SECTION ── */}
          <div className="relative px-4 pt-6 pb-5 overflow-hidden">
            {/* Subtle ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-[0.07] pointer-events-none" style={{ background: 'radial-gradient(circle, #16F2C6 0%, transparent 70%)' }} />

            <div className="relative z-10 space-y-5">
              {/* Welcome */}
              <p className="text-[13px] font-medium" style={{ color: 'hsl(160, 60%, 65%)' }}>
                Welcome back
              </p>

              {/* Portfolio Value */}
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-[32px] font-bold tracking-tight tabular-nums" style={{ color: 'hsl(0, 0%, 95%)', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {balanceHidden ? '••••••' : `₹${(balance.total * BSK_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </h1>
                  <button
                    onClick={() => setBalanceHidden(!balanceHidden)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ background: 'hsla(220, 20%, 20%, 0.5)' }}
                  >
                    {balanceHidden ? <Eye className="h-4 w-4" style={{ color: 'hsl(0, 0%, 55%)' }} /> : <EyeOff className="h-4 w-4" style={{ color: 'hsl(0, 0%, 55%)' }} />}
                  </button>
                </div>

                {/* Today's change */}
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#16F2C6' }} />
                  <span className="text-[13px] font-semibold tabular-nums" style={{ color: '#16F2C6' }}>
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
                    className="flex-1 flex items-center justify-center gap-2 h-[42px] rounded-xl text-[13px] font-semibold transition-colors"
                    style={{
                      background: 'hsla(220, 25%, 14%, 0.7)',
                      border: '1px solid hsla(160, 50%, 50%, 0.15)',
                      color: 'hsl(0, 0%, 90%)',
                      backdropFilter: 'blur(12px)',
                    }}
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
            <div
              className="p-4 rounded-[14px] space-y-2"
              style={{
                background: 'hsla(220, 25%, 12%, 0.6)',
                border: '1px solid hsla(160, 50%, 50%, 0.12)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'hsl(0, 0%, 50%)' }}>Tradable</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: '#16F2C6', fontFamily: "'Space Grotesk', sans-serif" }}>
                {balanceHidden ? '••••' : balance.withdrawable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px]" style={{ color: 'hsl(0, 0%, 45%)' }}>BSK</p>
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => navigate("/app/programs/bsk-withdraw")}
                  className="flex-1 h-7 rounded-lg text-[10px] font-semibold"
                  style={{ background: 'hsla(160, 50%, 50%, 0.1)', border: '1px solid hsla(160, 50%, 50%, 0.2)', color: '#16F2C6' }}
                >
                  Withdraw
                </button>
                <button
                  onClick={() => navigate("/app/programs/bsk-transfer")}
                  className="flex-1 h-7 rounded-lg text-[10px] font-semibold"
                  style={{ background: 'hsla(220, 30%, 20%, 0.5)', border: '1px solid hsla(0, 0%, 100%, 0.08)', color: 'hsl(0, 0%, 70%)' }}
                >
                  Transfer
                </button>
              </div>
            </div>

            {/* Locked */}
            <div
              className="p-4 rounded-[14px] space-y-2"
              style={{
                background: 'hsla(220, 25%, 12%, 0.6)',
                border: '1px solid hsla(250, 50%, 50%, 0.12)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" style={{ color: 'hsl(0, 0%, 50%)' }} />
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'hsl(0, 0%, 50%)' }}>Locked</p>
              </div>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'hsl(250, 80%, 72%)', fontFamily: "'Space Grotesk', sans-serif" }}>
                {balanceHidden ? '••••' : balance.holding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px]" style={{ color: 'hsl(0, 0%, 45%)' }}>BSK</p>
              <button
                onClick={() => setShowRewardsBreakdown(true)}
                className="w-full h-7 rounded-lg text-[10px] font-semibold mt-1"
                style={{ background: 'hsla(250, 50%, 50%, 0.1)', border: '1px solid hsla(250, 50%, 50%, 0.2)', color: 'hsl(250, 80%, 72%)' }}
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
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[12px] font-medium"
              style={{
                background: 'hsla(220, 25%, 14%, 0.5)',
                border: '1px solid hsla(0, 0%, 100%, 0.06)',
                color: 'hsl(0, 0%, 60%)',
              }}
            >
              <History className="h-3.5 w-3.5" />
              View Full History
              <ChevronRight className="h-3.5 w-3.5 ml-auto" />
            </button>
          </div>




          {/* ── IMAGE CAROUSEL ── */}
          <ImageCarousel />

          {/* ── SMART ACTION STRIP ── */}
          <div className="px-4 space-y-3">
            <h2 className="text-[14px] font-semibold" style={{ color: 'hsl(0, 0%, 75%)' }}>Quick Actions</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.route)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-[12px] font-medium flex-shrink-0 transition-colors"
                  style={{
                    background: 'hsla(220, 25%, 14%, 0.7)',
                    border: '1px solid hsla(160, 50%, 50%, 0.1)',
                    color: 'hsl(0, 0%, 80%)',
                  }}
                >
                  <span style={{ color: '#16F2C6' }}>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── FEATURE GRID ── */}
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold" style={{ color: 'hsl(0, 0%, 75%)' }}>Programs</h2>
              <button
                onClick={() => navigate("/app/programs")}
                className="text-[12px] font-medium flex items-center gap-1"
                style={{ color: '#16F2C6' }}
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
                    className="p-4 rounded-xl text-left space-y-3 transition-colors"
                    style={{
                      background: 'hsla(220, 25%, 11%, 0.8)',
                      border: '1px solid hsla(0, 0%, 100%, 0.05)',
                    }}
                  >
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: 'hsla(160, 50%, 50%, 0.08)' }}>
                      <IconComponent className="h-4.5 w-4.5" style={{ color: '#16F2C6' }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: 'hsl(0, 0%, 88%)' }}>{prog.name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'hsl(0, 0%, 45%)' }}>Tap to start</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── LIVE ACTIVITY FEED ── */}
          <div className="px-4 space-y-3">
            <h2 className="text-[14px] font-semibold" style={{ color: 'hsl(0, 0%, 75%)' }}>Recent Activity</h2>
            
            {activities.length === 0 ? (
              <div className="text-center py-10 text-[13px]" style={{ color: 'hsl(0, 0%, 40%)' }}>
                No recent activity
              </div>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: 'hsla(220, 25%, 11%, 0.6)',
                      border: '1px solid hsla(0, 0%, 100%, 0.04)',
                    }}
                  >
                    {/* Glow dot */}
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: '#16F2C6', boxShadow: '0 0 6px hsla(160, 80%, 50%, 0.4)' }} />

                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: 'hsl(0, 0%, 85%)' }}>
                        {activity.title}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'hsl(0, 0%, 45%)' }}>
                        {activity.subtitle}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] font-bold tabular-nums" style={{ color: '#16F2C6' }}>
                        +{activity.amount.toFixed(2)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'hsl(0, 0%, 45%)' }}>
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
