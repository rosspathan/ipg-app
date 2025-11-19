import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { OfferCountdown } from "./OfferCountdown"

export type TileBadgeType = "NEW" | "HOT" | "DAILY" | "LIVE"
export type TileStatus = "available" | "disabled" | "locked"

interface StreakIndicator {
  total: number
  completed: number
}

interface ProgressIndicator {
  value: number
  label?: string
}

interface ProgramTileUltraProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: TileBadgeType
  status?: TileStatus
  sparkline?: number[]
  progress?: ProgressIndicator
  streak?: StreakIndicator
  footer?: string
  onPress?: () => void
  onLongPress?: () => void
  onKebabPress?: () => void
  className?: string
  config?: {
    isDynamic?: boolean
    timeRemaining?: number | null
    isEndingSoon?: boolean
    endTime?: string
  }
}

const badgeStyles = {
  NEW: "bg-accent/20 text-accent border-accent/30",
  HOT: "bg-danger/20 text-danger border-danger/30",
  DAILY: "bg-success/20 text-success border-success/30",
  LIVE: "bg-primary/20 text-primary border-primary/30"
}

const badgeAnimations = {
  NEW: "animate-pulse",
  HOT: "animate-pulse",
  DAILY: "",
  LIVE: "animate-pulse"
}

export function ProgramTileUltra({
  icon,
  title,
  subtitle,
  badge,
  status = "available",
  sparkline,
  progress,
  streak,
  footer,
  onPress,
  onLongPress,
  onKebabPress,
  className,
  config
}: ProgramTileUltraProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [showGlow, setShowGlow] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout>()
  const isDisabled = status === "disabled" || status === "locked"
  const isDynamic = config?.isDynamic || false

  // Breathing glow animation
  useEffect(() => {
    const glowInterval = setInterval(() => {
      setShowGlow(prev => !prev)
    }, 6000)
    return () => clearInterval(glowInterval)
  }, [])

  const handlePointerDown = () => {
    if (isDisabled) return
    setIsPressed(true)
    longPressTimer.current = setTimeout(() => {
      onLongPress?.()
      setIsPressed(false)
    }, 500)
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
    if (isPressed && !isDisabled) {
      onPress?.()
    }
    setIsPressed(false)
  }

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
    setIsPressed(false)
  }

  const handleKebabClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onKebabPress?.()
  }

  return (
    <div
      data-testid="program-tile-ultra"
      className={cn(
        "relative rounded-2xl overflow-hidden transition-all",
        "duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        isPressed ? "scale-[1.03]" : "scale-100",
        isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {/* Card background with glow */}
      <div
        className={cn(
          "relative h-full min-h-[180px] p-4 rounded-2xl",
          isDynamic 
            ? "bg-gradient-to-br from-orange-500/20 via-red-500/15 to-pink-500/20"
            : "bg-gradient-to-br from-[#161A2C] to-[#1B2036]",
          isDynamic 
            ? "border-2 border-orange-500/40"
            : "border border-[#2A2F42]/30",
          "transition-all duration-[320ms]",
          showGlow && !isPressed && !isDynamic && "shadow-[0_0_24px_rgba(124,77,255,0.08)]",
          isDynamic && "shadow-[0_0_32px_rgba(249,115,22,0.3)]"
        )}
        style={{
          boxShadow: isPressed
            ? isDynamic 
              ? '0 8px 32px rgba(249, 115, 22, 0.5)'
              : '0 8px 32px rgba(124, 77, 255, 0.3)'
            : undefined
        }}
      >
        {/* Top row: Badge & Kebab */}
        <div className="flex items-start justify-between mb-3">
          {badge && (
            <div
              className={cn(
                "px-2 py-0.5 rounded-full",
                "text-[9px] font-[Inter] font-bold uppercase tracking-wider",
                "border backdrop-blur-sm",
                badgeStyles[badge],
                badgeAnimations[badge]
              )}
            >
              {badge}
            </div>
          )}
          <div className="flex-1" />
          {onKebabPress && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2 text-muted-foreground hover:text-foreground"
              onClick={handleKebabClick}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-accent/20",
              "text-primary transition-all duration-[220ms]",
              "ring-2 ring-primary/20",
              isPressed && "scale-110 rotate-6 ring-primary/40"
            )}
            style={{
              boxShadow: isPressed
                ? '0 0 20px rgba(124, 77, 255, 0.4)'
                : '0 0 12px rgba(124, 77, 255, 0.2)'
            }}
          >
            {icon}
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-4">
          <h3 className="font-[Space_Grotesk] font-bold text-xs text-foreground mb-1 line-clamp-1">
            {title}
          </h3>
          <p className="font-[Inter] text-[10px] text-muted-foreground leading-tight line-clamp-2">
            {subtitle}
          </p>
          {/* Countdown timer for dynamic offers */}
          {isDynamic && config?.endTime && (
            <OfferCountdown endTime={config.endTime} className="mt-2" />
          )}
        </div>

        {/* Footer: Sparkline / Progress / Streak / Text */}
        <div className="mt-auto">
          {sparkline && sparkline.length > 0 && (
            <MiniSparkline data={sparkline} />
          )}
          
          {progress && (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-background/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-[320ms]"
                  style={{ width: `${Math.min(100, Math.max(0, progress.value))}%` }}
                />
              </div>
              {progress.label && (
                <p className="text-[10px] text-muted-foreground font-[Inter] text-center">
                  {progress.label}
                </p>
              )}
            </div>
          )}
          
          {streak && (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: streak.total }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all duration-[220ms]",
                      i < streak.completed
                        ? "bg-gradient-to-br from-primary to-accent shadow-[0_0_8px_rgba(124,77,255,0.6)]"
                        : "bg-background/40 border border-border/30"
                    )}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground font-[Inter] text-center">
                Streak: {streak.completed} days
              </p>
            </div>
          )}
          
          {footer && !sparkline && !progress && !streak && (
            <p className="text-[10px] text-muted-foreground font-[Inter] text-center">
              {footer}
            </p>
          )}
        </div>

        {/* Rim-light sweep effect on press */}
        {isPressed && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, transparent 30%, rgba(124, 77, 255, 0.3) 50%, rgba(0, 229, 255, 0.3) 70%, transparent)',
              animation: 'sweep 320ms ease-out'
            }}
          />
        )}

        {/* Locked overlay */}
        {status === "locked" && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="px-3 py-1 bg-card/80 border border-border/30 rounded-lg text-xs font-medium">
              Locked
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Mini sparkline component
function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="h-6 w-full relative">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <polyline
          points={points}
          fill="none"
          stroke="url(#sparkline-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <defs>
          <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(124, 77, 255, 0.6)" />
            <stop offset="100%" stopColor="rgba(0, 229, 255, 0.6)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
