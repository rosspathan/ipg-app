import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface HeroSlide {
  id: string
  image: string
  title: string
  subtitle: string
}

const mockSlides: HeroSlide[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=450&fit=crop",
    title: "New BSK Purchase Bonus",
    subtitle: "Get 50% extra BSK on your first purchase"
  },
  {
    id: "2", 
    image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&h=450&fit=crop",
    title: "Spin to Win Daily",
    subtitle: "Try your luck with i-SMART Spin"
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&h=450&fit=crop",
    title: "Staking Rewards Live",
    subtitle: "Earn 12.4% APY on your holdings"
  }
]

export function ProgramsHeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mockSlides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])
  
  return (
    <div 
      data-testid="programs-announcements"
      className="relative w-full aspect-video overflow-hidden rounded-2xl mx-4 my-4"
    >
      {mockSlides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            index === currentIndex ? "opacity-100" : "opacity-0"
          )}
        >
          <img
            src={slide.image}
            alt={slide.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-heading text-lg font-bold text-foreground mb-1">
              {slide.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {slide.subtitle}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
