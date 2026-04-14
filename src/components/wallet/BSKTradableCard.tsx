import * as React from "react"
import { useState } from "react"
import { Eye, EyeOff, ArrowUpRight, ArrowLeftRight, History, RefreshCw, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * BSKTradableCard — Premium single-card BSK balance display
 * Replaces the old dual Withdrawable + Holding layout
 */
export function BSKTradableCard({ className }: { className?: string }) {
  const [isPrivate, setIsPrivate] = useState(false)
  const navigate = useNavigate()

  const { data: bskBalance, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bsk-tradable-balance'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance, total_earned_withdrawable')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const balance = Number(bskBalance?.withdrawable_balance || 0)
  const fiatValue = balance * 1.0 // 1 BSK ≈ ₹1
  const lifetimeEarned = Number(bskBalance?.total_earned_withdrawable || 0)

  if (isLoading) {
    return (
      <div className={cn("px-4", className)}>
        <Skeleton className="h-[260px] w-full rounded-[24px]" />
      </div>
    )
  }

  const actions = [
    {
      label: "Withdraw",
      icon: ArrowUpRight,
      route: "/app/programs/bsk-withdraw",
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/25",
      glow: "hover:shadow-[0_0_20px_hsl(154_67%_52%/0.15)]",
    },
    {
      label: "Transfer",
      icon: ArrowLeftRight,
      route: "/app/programs/bsk-transfer",
      color: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/25",
      glow: "hover:shadow-[0_0_20px_hsl(186_100%_50%/0.15)]",
    },
    {
      label: "History",
      icon: History,
      route: "/app/wallet/history/bsk",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/25",
      glow: "hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]",
    },
  ]

  return (
    <div className={cn("px-4", className)}>
      <div
        className="relative overflow-hidden glass-card"
        style={{ borderRadius: '24px' }}
        data-testid="bsk-tradable-card"
      >
        {/* ── Ambient background effects ── */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none opacity-40"
          style={{ background: 'radial-gradient(circle, hsl(154 67% 52% / 0.25), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, hsl(186 100% 50% / 0.15), transparent 70%)' }}
        />

        {/* Top rim light */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(154 67% 52% / 0.5), hsl(186 100% 50% / 0.3), transparent)',
          }}
        />

        <div className="relative z-10 p-6 space-y-6">
          {/* ── Header row ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-9 w-9 rounded-2xl flex items-center justify-center bg-success/15 border border-success/25">
                  <Sparkles className="h-4 w-4 text-success" />
                </div>
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-2xl border border-success/30 animate-ping opacity-30" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <p className="text-[13px] font-bold text-foreground tracking-tight">BSK Tradable</p>
                <p className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">Available Balance</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="h-8 w-8 rounded-xl flex items-center justify-center bg-muted/40 border border-border/40 hover:bg-muted/70 transition-all duration-200 active:scale-90"
                aria-label="Refresh balance"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isRefetching && "animate-spin")} />
              </button>
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                className="h-8 w-8 rounded-xl flex items-center justify-center bg-muted/40 border border-border/40 hover:bg-muted/70 transition-all duration-200 active:scale-90"
                aria-label={isPrivate ? "Show balance" : "Hide balance"}
              >
                {isPrivate
                  ? <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            </div>
          </div>

          {/* ── Balance display ── */}
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2.5">
              <p
                className={cn(
                  "text-[38px] font-extrabold tabular-nums font-heading leading-none tracking-tight transition-all duration-300",
                  isPrivate && "blur-md select-none"
                )}
                style={{
                  background: 'linear-gradient(135deg, hsl(154 67% 62%), hsl(186 100% 60%))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {isPrivate ? '••••••' : balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[16px] font-bold text-success/70 tracking-wider">BSK</span>
            </div>

            <p className={cn(
              "text-[13px] font-mono tabular-nums text-muted-foreground transition-all duration-300",
              isPrivate && "blur-sm select-none"
            )}>
              {isPrivate ? '••••••' : `≈ ₹${fiatValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            </p>
          </div>

          {/* ── Gradient divider ── */}
          <div
            className="h-px"
            style={{
              background: 'linear-gradient(90deg, hsl(154 67% 52% / 0.3), hsl(186 100% 50% / 0.15) 50%, transparent)',
            }}
          />

          {/* ── Lifetime stat chip ── */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-muted/30 border border-border/30">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lifetime</span>
              <span className={cn(
                "text-[12px] font-bold font-mono tabular-nums text-success transition-all",
                isPrivate && "blur-sm select-none"
              )}>
                {isPrivate ? '••••' : `${lifetimeEarned.toLocaleString('en-IN', { maximumFractionDigits: 0 })} BSK`}
              </span>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="grid grid-cols-3 gap-2.5">
            {actions.map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.label}
                  onClick={() => navigate(a.route)}
                  className={cn(
                    "flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl border transition-all duration-200",
                    "active:scale-[0.94] active:opacity-80",
                    a.bg, a.border, a.glow
                  )}
                >
                  <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", a.bg)}>
                    <Icon className={cn("h-4.5 w-4.5", a.color)} style={{ width: '18px', height: '18px' }} />
                  </div>
                  <span className="text-[11px] font-bold text-foreground/90">{a.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
