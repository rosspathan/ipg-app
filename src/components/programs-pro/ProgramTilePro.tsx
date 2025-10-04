import * as React from "react"
import { useState } from "react"
import { MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ProgramTileProProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: "NEW" | "HOT" | "DAILY" | "LIVE"
  sparkline?: number[]
  progress?: number
  footer?: string
  onPress: () => void
  onLongPress?: () => void
  onKebabPress?: () => void
}

const badgeStyles = {
  NEW: "bg-success/20 text-success border-success/30",
  HOT: "bg-danger/20 text-danger border-danger/30",
  DAILY: "bg-primary/20 text-primary border-primary/30",
  LIVE: "bg-accent/20 text-accent border-accent/30"
}

export function ProgramTilePro({
  icon,
  title,
  subtitle,
  badge,
  sparkline,
  progress,
  footer,
  onPress,
  onLongPress,
  onKebabPress
}: ProgramTileProProps) {
  const [isPressed, setIsPressed] = useState(false)
  const longPressTimer = React.useRef<NodeJS.Timeout>()
  
  const handleTouchStart = () => {
    setIsPressed(true)
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress()
      }, 500)
    }
  }
  
  const handleTouchEnd = () => {
    setIsPressed(false)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }
  
  const handleClick = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
    onPress()
  }
  
  return (
    <div
      data-testid="program-tile"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onClick={handleClick}
      className={cn(
        "relative group cursor-pointer",
        "bg-gradient-to-br from-card to-card/80",
        "border border-border/50 rounded-2xl p-4",
        "transition-all duration-220 ease-out",
        "hover:border-primary/30 hover:shadow-[0_0_20px_rgba(124,77,255,0.15)]",
        isPressed && "scale-[1.03] border-primary/50 shadow-[0_0_24px_rgba(124,77,255,0.25)]"
      )}
      style={{
        minHeight: "140px"
      }}
    >
      {/* Rim light sweep on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-320 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
      
      {/* Top Row: Badge & Kebab */}
      <div className="flex items-start justify-between mb-3">
        {badge && (
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
            badgeStyles[badge]
          )}>
            {badge}
          </span>
        )}
        
        <div className="ml-auto">
          {onKebabPress && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onKebabPress()
              }}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Icon */}
      <div className="mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      
      {/* Title & Subtitle */}
      <div className="mb-3">
        <h3 className="font-heading text-sm font-semibold text-foreground mb-1 line-clamp-1">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
          {subtitle}
        </p>
      </div>
      
      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (
        <div className="mb-2 h-8 flex items-end gap-0.5">
          {sparkline.map((value, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/40 rounded-sm"
              style={{
                height: `${(value / Math.max(...sparkline)) * 100}%`,
                minHeight: "2px"
              }}
            />
          ))}
        </div>
      )}
      
      {/* Progress Bar */}
      {typeof progress === "number" && (
        <div className="mb-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-320"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Fill {progress}%
          </p>
        </div>
      )}
      
      {/* Footer */}
      {footer && (
        <div className="text-[10px] text-muted-foreground font-medium">
          {footer}
        </div>
      )}
    </div>
  )
}
