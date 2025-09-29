import * as React from "react"
import { useState } from "react"
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
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

  const handleMouseDown = () => {
    if (status !== "available") return
    
    setIsPressed(true)
    
    if (onLongPress) {
      const timer = setTimeout(() => {
        onLongPress()
        setIsPressed(false)
      }, 500)
      setLongPressTimer(timer)
    }
  }

  const handleMouseUp = () => {
    setIsPressed(false)
    
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleClick = () => {
    if (status === "available" && onPress && !longPressTimer) {
      onPress()
    }
  }

  return (
    <AstraCard
      variant="glass"
      className={cn(
        "relative p-4 space-y-3 cursor-pointer transition-all duration-220",
        "hover:scale-[1.03] hover:shadow-neon",
        "active:scale-[0.98]",
        isPressed && "scale-[1.03] shadow-neon",
        statusStyles[status],
        className
      )}
      data-testid="program-tile"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      {/* Status Overlay */}
      {status !== "available" && (
        <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center z-10">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {status === "locked" && "🔒 Locked"}
            {status === "coming-soon" && "🚀 Coming Soon"}
            {status === "maintenance" && "🔧 Maintenance"}
          </span>
        </div>
      )}

      {/* Badge */}
      {badge && (
        <div className={cn(
          "absolute -top-1 -right-1 text-xs font-bold px-2 py-1 rounded-full border",
          "animate-pulse",
          badgeStyles[badge]
        )}>
          {badge}
        </div>
      )}

      {/* Icon */}
      <div className="w-8 h-8 flex items-center justify-center text-primary">
        {icon}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Metrics */}
      {(sparkline || typeof progress === "number") && (
        <div className="flex items-center justify-between">
          {sparkline && (
            <div className="flex-1">
              <MiniSparkline data={sparkline} />
            </div>
          )}
          
          {typeof progress === "number" && (
            <div className="text-xs text-accent font-mono tabular-nums">
              {progress}%
            </div>
          )}
        </div>
      )}

      {/* Rim Light Effect */}
      <div className={cn(
        "absolute inset-0 rounded-xl border border-transparent transition-all duration-220 pointer-events-none",
        isPressed && "border-primary/40 shadow-[inset_0_0_20px_rgba(136,83,255,0.2)]"
      )} />
    </AstraCard>
  )
}

function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  return (
    <div className="flex items-end h-6 gap-px">
      {data.map((value, i) => {
        const height = ((value - min) / range) * 100
        return (
          <div
            key={i}
            className="bg-accent/60 rounded-sm flex-1 min-h-[2px]"
            style={{ height: `${Math.max(height, 8)}%` }}
          />
        )
      })}
    </div>
  )
}