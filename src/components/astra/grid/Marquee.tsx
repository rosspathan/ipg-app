import * as React from "react"
import { cn } from "@/lib/utils"

interface MarqueeItem {
  id: string
  text: string
  type?: "info" | "warning" | "success" | "promotion"
}

interface MarqueeProps {
  items: MarqueeItem[]
  className?: string
  speed?: "slow" | "normal" | "fast"
  pauseOnHover?: boolean
}

const speedClasses = {
  slow: "animate-[scroll_60s_linear_infinite]",
  normal: "animate-[scroll_30s_linear_infinite]",
  fast: "animate-[scroll_15s_linear_infinite]"
}

const typeColors = {
  info: "text-accent",
  warning: "text-warning", 
  success: "text-success",
  promotion: "text-primary"
}

export function Marquee({ 
  items, 
  className, 
  speed = "normal",
  pauseOnHover = true 
}: MarqueeProps) {
  if (items.length === 0) return null

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-card/40 border border-border/30 rounded-lg",
        "backdrop-blur-sm",
        className
      )}
      data-testid="marquee"
    >
      <div 
        className={cn(
          "flex whitespace-nowrap",
          speedClasses[speed],
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
      >
        {/* Duplicate items for seamless loop */}
        {[...items, ...items].map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex items-center px-6 py-2 text-sm font-medium"
          >
            <span className={cn(
              "mr-2",
              item.type ? typeColors[item.type] : "text-muted-foreground"
            )}>
              •
            </span>
            <span className={cn(
              item.type ? typeColors[item.type] : "text-foreground"
            )}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
      
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card/40 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card/40 to-transparent pointer-events-none" />
    </div>
  )
}

// Add the keyframe animation to your CSS
const scrollKeyframes = `
@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
`

// Export styles to be added to global CSS
export { scrollKeyframes }