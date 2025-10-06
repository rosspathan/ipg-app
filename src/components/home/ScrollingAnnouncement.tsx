import * as React from "react"
import { cn } from "@/lib/utils"

interface ScrollingAnnouncementProps {
  text?: string
  className?: string
}

/**
 * ScrollingAnnouncement - Horizontally scrolling text banner
 * Admin-controlled announcement that moves from right to left
 */
export function ScrollingAnnouncement({ 
  text = "🎉 Welcome to IPG I-SMART! Earn rewards daily through our premium programs. Trade crypto, stake tokens, and win big prizes! 🎉",
  className 
}: ScrollingAnnouncementProps) {
  return (
    <div 
      className={cn(
        "relative w-full h-8 rounded-xl overflow-hidden",
        "bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10",
        "border border-primary/20",
        className
      )}
      data-testid="scrolling-announcement"
    >
      {/* Scrolling text container */}
      <div className="absolute inset-0 flex items-center">
        <div 
          className="flex items-center whitespace-nowrap animate-scroll"
          style={{
            animation: 'scroll-left 30s linear infinite'
          }}
        >
          <span className="text-sm font-[Inter] font-medium text-foreground/80 px-4">
            {text}
          </span>
          {/* Duplicate for seamless loop */}
          <span className="text-sm font-[Inter] font-medium text-foreground/80 px-4">
            {text}
          </span>
        </div>
      </div>

      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/80 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent pointer-events-none z-10" />

      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}
