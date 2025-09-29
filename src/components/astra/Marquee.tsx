import * as React from "react"
import { cn } from "@/lib/utils"

interface MarqueeItem {
  id: string
  text: string
  isActive: boolean
}

interface MarqueeProps {
  className?: string
  speed?: "slow" | "medium" | "fast"
}

// Mock data - replace with real data hook
const mockMarqueeItems: MarqueeItem[] = [
  {
    id: "1",
    text: "🎉 New BSK Loan feature now available - borrow ₹100 to ₹50,000 with 0% interest!",
    isActive: true
  },
  {
    id: "2", 
    text: "⚡ Lucky Draw Pool #47 closing soon - 73/100 tickets sold, ₹25,000 prize pool!",
    isActive: true
  },
  {
    id: "3",
    text: "🔥 Daily Ad Mining bonus increased by 50% this week - watch ads and earn more BSK!",
    isActive: true
  }
]

export function Marquee({ className, speed = "medium" }: MarqueeProps) {
  const activeItems = mockMarqueeItems.filter(item => item.isActive)
  
  if (activeItems.length === 0) return null

  const marqueeText = activeItems.map(item => item.text).join(" • ")
  
  const speedClass = {
    slow: "animate-marquee-slow",
    medium: "animate-marquee",
    fast: "animate-marquee-fast"
  }[speed]

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-gradient-to-r from-accent/5 via-primary/5 to-accent/5",
        "border border-accent/10 rounded-lg py-2",
        className
      )}
      data-testid="marquee"
    >
      <div className={cn(
        "whitespace-nowrap will-change-transform",
        speedClass
      )}>
        <span className="text-sm text-text-secondary font-medium px-4">
          {marqueeText} • {marqueeText}
        </span>
      </div>
      
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background-primary to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background-primary to-transparent pointer-events-none" />
    </div>
  )
}