import * as React from "react"
import { useState } from "react"
import { Lock, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { AstraCard } from "../AstraCard"

export type TileBadgeType = "NEW" | "HOT" | "DAILY" | "LIVE"
export type TileStatus = "available" | "locked" | "coming-soon" | "maintenance"

interface ProgramTileProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  badge?: TileBadgeType
  status?: TileStatus
  sparkline?: number[] // Mini chart data
  progress?: number // 0-100
  onPress?: () => void
  onLongPress?: () => void
  className?: string
}

const badgeStyles = {
  NEW: "bg-accent/20 text-accent border-accent/40",
  HOT: "bg-danger/20 text-danger border-danger/40",
  DAILY: "bg-warning/20 text-warning border-warning/40", 
  LIVE: "bg-success/20 text-success border-success/40"
}

const statusStyles = {
  available: "",
  locked: "opacity-60 cursor-not-allowed",
  "coming-soon": "opacity-50 cursor-not-allowed",
  maintenance: "opacity-40 cursor-not-allowed"
}

/**
 * ProgramTile - Purple Nova DS enhanced tile
 * 1.03 scale on press + rim-light sweep (purple → cyan)
 * Status badges, sparkline, progress
 */
export function ProgramTile({
  title,
  subtitle,
  icon,
  badge,
  status = "available",
  sparkline,
  progress,
  onPress,
  onLongPress,
  className
}: ProgramTileProps) {
  const [isPressed, setIsPressed] = useState(false)
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  const handlePointerDown = () => {
    setIsPressed(true)
    if (onLongPress) {
      setTimeout(() => {
        if (isPressed) onLongPress()
      }, 500)
    }
  }

  const handlePointerUp = () => {
    setIsPressed(false)
  }

  const handleClick = () => {
    if (status === "available" && onPress) {
      onPress()
    }
  }

  const badgeColors = {
    NEW: "bg-accent/20 text-accent border-accent/40",
    HOT: "bg-danger/20 text-danger border-danger/40",
    DAILY: "bg-success/20 text-success border-success/40",
    LIVE: "bg-warning/20 text-warning border-warning/40"
  }

  const isDisabled = status !== "available"

  return (
    <div
      className={cn("relative", className)}
      data-testid="program-tile"
    >
      <AstraCard
        variant="elevated"
        className={cn(
          "relative h-full p-4 cursor-pointer overflow-hidden",
          "transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          !isDisabled && !prefersReducedMotion && "hover:scale-[1.03]",
          isPressed && !prefersReducedMotion && "scale-[1.03]",
          isDisabled && "opacity-60 cursor-not-allowed"
        )}
        onPointerDown={!isDisabled ? handlePointerDown : undefined}
        onPointerUp={!isDisabled ? handlePointerUp : undefined}
        onPointerLeave={() => setIsPressed(false)}
        onClick={handleClick}
      >
        {/* Rim light effect on press */}
        {isPressed && !prefersReducedMotion && !isDisabled && (
          <div 
            className="absolute inset-0 rounded-2xl opacity-0 animate-[rimLight_0.6s_ease-out_forwards]"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
              filter: 'blur(8px)',
              zIndex: 0
            }}
          />
        )}

        {/* Badge */}
        {badge && (
          <div className={cn(
            "absolute top-2 right-2 z-10",
            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
            badgeColors[badge]
          )}>
            {badge}
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Icon */}
          <div className="mb-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-secondary/20",
              "border border-primary/30"
            )}>
              {icon}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="flex-1 min-h-0">
            <h3 className="font-heading text-sm font-bold text-foreground leading-tight mb-1 line-clamp-1">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground leading-tight line-clamp-2 whitespace-pre-line">
              {subtitle}
            </p>
          </div>

          {/* Metrics */}
          {(sparkline || typeof progress === 'number') && (
            <div className="mt-3 pt-3 border-t border-border/40">
              {sparkline && <MiniSparkline data={sparkline} />}
              {typeof progress === 'number' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono font-semibold text-primary tabular-nums">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-[220ms]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Overlays */}
          {status === "locked" && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
              <div className="text-center">
                <Lock className="h-6 w-6 text-warning mx-auto mb-1" />
                <p className="text-xs font-semibold text-warning">Locked</p>
              </div>
            </div>
          )}

          {status === "coming-soon" && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
              <div className="text-center">
                <Clock className="h-6 w-6 text-accent mx-auto mb-1" />
                <p className="text-xs font-semibold text-accent">Coming Soon</p>
              </div>
            </div>
          )}
        </div>
      </AstraCard>
    </div>
  )
}

// Mini sparkline component
function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  return (
    <div className="flex items-end gap-0.5 h-6" role="img" aria-label="Sparkline chart">
      {data.map((value, i) => {
        const height = ((value - min) / range) * 100
        return (
          <div
            key={i}
            className="flex-1 bg-gradient-to-t from-success to-success/50 rounded-sm transition-all duration-[220ms]"
            style={{ height: `${height}%`, minHeight: '2px' }}
          />
        )
      })}
    </div>
  )
}