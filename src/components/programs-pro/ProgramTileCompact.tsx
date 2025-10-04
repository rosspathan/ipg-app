import * as React from "react"
import { useState, useEffect } from "react"
import { MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export type TileBadgeType = "NEW" | "HOT" | "DAILY" | "LIVE"

interface ProgramTileCompactProps {
  icon: React.ReactNode
  title: string
  badge?: TileBadgeType
  progress?: number // 0-100 for micro progress line
  onPress: () => void
  onKebabPress?: () => void
  className?: string
}

const badgeColors: Record<TileBadgeType, string> = {
  NEW: "bg-accent/20 text-accent",
  HOT: "bg-danger/20 text-danger",
  DAILY: "bg-success/20 text-success",
  LIVE: "bg-primary/20 text-primary"
}

/**
 * ProgramTileCompact - Small PhonePe-style tile
 * - 92×92px @ 360-430px
 * - 104×104px @ ≥480px
 * - Centered icon + label
 * - Premium press/long-press animations
 */
export function ProgramTileCompact({
  icon,
  title,
  badge,
  progress,
  onPress,
  onKebabPress,
  className
}: ProgramTileCompactProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPressed(true)
    const timer = setTimeout(() => {
      if (onKebabPress) {
        onKebabPress()
        navigator.vibrate?.(50)
      }
    }, 500)
    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    setIsPressed(false)
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleClick = () => {
    if (!longPressTimer) {
      onPress()
    }
  }

  useEffect(() => {
    return () => {
      if (longPressTimer) clearTimeout(longPressTimer)
    }
  }, [longPressTimer])

  return (
    <button
      data-testid="program-tile-compact"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "relative group",
        "w-full aspect-square",
        // Size: 92px @ mobile, 104px @ ≥480px
        "min-h-[92px] sm:min-h-[104px]",
        // Tile styling
        "rounded-2xl border border-[#2A2F42]/20",
        "bg-gradient-to-br from-[#161A2C] to-[#1B2036]",
        // Inner glow
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
        // Press animation
        "transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        isPressed && "scale-[1.03]",
        // Hover (desktop only)
        "hover:border-primary/30",
        // Reduced motion
        "motion-reduce:transition-none motion-reduce:hover:scale-100",
        className
      )}
      style={{
        // Rim-light sweep on press
        boxShadow: isPressed
          ? "0 0 20px rgba(124, 77, 255, 0.4), inset 0 1px 0 0 rgba(255,255,255,0.03)"
          : undefined
      }}
    >
      {/* Status Badge (top-right dot) */}
      {badge && (
        <div
          className={cn(
            "absolute top-1.5 right-1.5 z-10",
            "text-[9px] font-bold uppercase tracking-wider",
            "px-1.5 py-0.5 rounded-full",
            badgeColors[badge],
            badge === "LIVE" && "animate-pulse"
          )}
        >
          {badge}
        </div>
      )}

      {/* Kebab menu */}
      {onKebabPress && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onKebabPress()
          }}
          className="absolute top-1.5 left-1.5 z-10 p-1 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Content */}
      <div className="flex flex-col items-center justify-center h-full gap-2 px-2 pb-2 pt-6">
        {/* Icon */}
        <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 text-primary">
          {icon}
        </div>

        {/* Label */}
        <div className="text-[11px] sm:text-xs font-semibold text-foreground text-center leading-tight line-clamp-1 px-1">
          {title}
        </div>
      </div>

      {/* Micro Progress Line (bottom) */}
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted/20 rounded-b-2xl overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </button>
  )
}
