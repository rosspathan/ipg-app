import * as React from "react"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AstraCard } from "./AstraCard"

interface Announcement {
  id: string
  title: string
  description: string
  imageUrl?: string
  ctaText?: string
  ctaUrl?: string
  isActive: boolean
}

interface AnnouncementCarouselProps {
  className?: string
}

// Mock data - replace with real data hook
const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "New Insurance Plans Available",
    description: "Protect your assets with our comprehensive insurance coverage",
    imageUrl: "/placeholder-announcement.jpg",
    ctaText: "Learn More",
    ctaUrl: "/app/insurance",
    isActive: true
  },
  {
    id: "2", 
    title: "BSK Fortune Wheel - Daily Rewards",
    description: "Spin daily to win exciting BSK rewards and bonuses",
    imageUrl: "/placeholder-announcement.jpg",
    ctaText: "Spin Now",
    ctaUrl: "/app/spin",
    isActive: true
  },
  {
    id: "3",
    title: "Referral Program Bonuses",
    description: "Earn 10% commission on every friend you refer",
    imageUrl: "/placeholder-announcement.jpg", 
    ctaText: "Refer Friends",
    ctaUrl: "/app/programs/referrals",
    isActive: true
  }
]

export function AnnouncementCarousel({ className }: AnnouncementCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const activeAnnouncements = mockAnnouncements.filter(a => a.isActive)

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (activeAnnouncements.length <= 1) return
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [activeAnnouncements.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? activeAnnouncements.length - 1 : prev - 1
    )
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length)
  }

  if (activeAnnouncements.length === 0) return null

  const currentAnnouncement = activeAnnouncements[currentIndex]

  return (
    <div className={cn("relative", className)} data-testid="announcements">
      <AstraCard variant="elevated" className="overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-primary/20 to-accent/20">
          {/* Background Image */}
          {currentAnnouncement.imageUrl && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${currentAnnouncement.imageUrl})` }}
            />
          )}
          
          {/* Content Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background-primary/80 to-transparent" />
          
          <div className="relative p-6 h-full flex flex-col justify-end">
            <h3 className="font-heading font-semibold text-lg mb-2 text-text-primary">
              {currentAnnouncement.title}
            </h3>
            <p className="text-sm text-text-secondary mb-3 line-clamp-2">
              {currentAnnouncement.description}
            </p>
            
            {currentAnnouncement.ctaText && (
              <Button
                size="sm"
                variant="secondary"
                className="self-start bg-accent/20 text-accent hover:bg-accent/30 border-accent/30"
              >
                {currentAnnouncement.ctaText}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Controls */}
        {activeAnnouncements.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-background-primary/60 hover:bg-background-primary/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-background-primary/60 hover:bg-background-primary/80"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Pagination Dots */}
        {activeAnnouncements.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {activeAnnouncements.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-standard",
                  index === currentIndex 
                    ? "bg-accent w-4" 
                    : "bg-text-secondary/50 hover:bg-text-secondary"
                )}
              />
            ))}
          </div>
        )}
      </AstraCard>
    </div>
  )
}