import * as React from "react"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AstraCard } from "../AstraCard"

interface Announcement {
  id: string
  title: string
  message: string
  type: "info" | "promotion" | "maintenance" | "feature"
  actionLabel?: string
  actionUrl?: string
  region?: string[]
  startDate: Date
  endDate: Date
  imageUrl?: string
}

interface AnnouncementsCarouselProps {
  announcements: Announcement[]
  className?: string
  autoRotate?: boolean
  rotateInterval?: number
}

const typeStyles = {
  info: "border-accent/40 bg-accent/5",
  promotion: "border-warning/40 bg-warning/5",
  maintenance: "border-danger/40 bg-danger/5", 
  feature: "border-success/40 bg-success/5"
}

const typeIcons = {
  info: "ℹ️",
  promotion: "🎉",
  maintenance: "🔧",
  feature: "✨"
}

export function AnnouncementsCarousel({
  announcements,
  className,
  autoRotate = true,
  rotateInterval = 5000
}: AnnouncementsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const activeAnnouncements = announcements.filter(announcement => {
    const now = new Date()
    return now >= announcement.startDate && now <= announcement.endDate
  })

  useEffect(() => {
    if (!autoRotate || isPaused || activeAnnouncements.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeAnnouncements.length)
    }, rotateInterval)

    return () => clearInterval(timer)
  }, [autoRotate, isPaused, activeAnnouncements.length, rotateInterval])

  if (activeAnnouncements.length === 0) return null

  const currentAnnouncement = activeAnnouncements[currentIndex]

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % activeAnnouncements.length)
  }

  const goToPrevious = () => {
    setCurrentIndex(prev => 
      prev === 0 ? activeAnnouncements.length - 1 : prev - 1
    )
  }

  return (
    <div className={cn("relative", className)} data-testid="announcements">
      <AstraCard
        variant="elevated"
        className={cn(
          "relative overflow-hidden transition-all duration-320",
          typeStyles[currentAnnouncement.type]
        )}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Background Image */}
        {currentAnnouncement.imageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{ backgroundImage: `url(${currentAnnouncement.imageUrl})` }}
          />
        )}

        <div className="relative p-4">
          <div className="flex items-start gap-3">
            {/* Type Icon */}
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-card/60 rounded-lg text-sm">
              {typeIcons[currentAnnouncement.type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
                {currentAnnouncement.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {currentAnnouncement.message}
              </p>

              {/* Action Button */}
              {currentAnnouncement.actionLabel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs text-accent hover:bg-accent/20"
                  onClick={() => currentAnnouncement.actionUrl && window.open(currentAnnouncement.actionUrl, '_blank')}
                >
                  {currentAnnouncement.actionLabel}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>

            {/* Navigation */}
            {activeAnnouncements.length > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevious}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNext}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Indicators */}
        {activeAnnouncements.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {activeAnnouncements.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-220",
                  index === currentIndex 
                    ? "bg-accent" 
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </AstraCard>
    </div>
  )
}