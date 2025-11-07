import * as React from "react"
import { cn } from "@/lib/utils"

interface AnnouncementItem {
  id: string
  text: string
  type?: "info" | "promotion" | "success" | "warning"
}

interface AnnouncementsBarProps {
  items: AnnouncementItem[]
  className?: string
}

/**
 * AnnouncementsBar - Running ticker with announcements
 */
export function AnnouncementsBar({ items, className }: AnnouncementsBarProps) {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        "relative h-8 bg-card/40 backdrop-blur-lg border-y border-border/30 overflow-hidden",
        className
      )}
      data-testid="announcements-bar"
    >
      <div className="absolute inset-0 flex items-center">
        <div
          className="flex items-center gap-12 animate-none md:animate-[marquee_30s_linear_infinite] whitespace-nowrap"
          style={{
            animationPlayState: 'running'
          }}
        >
          {[...items, ...items].map((item, index) => (
            <span
              key={`${item.id}-${index}`}
              className="font-[Inter] text-xs text-muted-foreground flex items-center gap-2"
            >
              <span className="text-accent">•</span>
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
