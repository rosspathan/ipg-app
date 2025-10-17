import * as React from "react"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HeroSlide {
  id: string
  image: string
  title?: string
  description?: string
  cta?: {
    label: string
    onClick: () => void
  }
}

interface HeroCarouselProps {
  slides: HeroSlide[]
  autoplayInterval?: number
  className?: string
}

/**
 * HeroCarousel - 16:9 hero carousel with auto-play
 */
export function HeroCarousel({
  slides,
  autoplayInterval = 5000,
  className
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, autoplayInterval)

    return () => clearInterval(interval)
  }, [slides.length, autoplayInterval])

  if (slides.length === 0) return null

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length)
  }

  return (
    <div
      className={cn("relative rounded-2xl overflow-hidden", className)}
      style={{ aspectRatio: "16/9" }}
      data-testid="hero-carousel"
    >
      {/* Slides */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-[600ms]",
              index === currentIndex 
                ? "opacity-100 pointer-events-auto" 
                : "opacity-0 pointer-events-none"
            )}
            style={{ willChange: index === currentIndex ? 'auto' : 'transform' }}
          >
            <img
              src={slide.image}
              alt={slide.title || "Hero slide"}
              className="w-full h-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
            />

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Content */}
            {(slide.title || slide.description || slide.cta) && (
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                {slide.title && (
                  <h3 className="font-[Space_Grotesk] font-bold text-lg mb-1">
                    {slide.title}
                  </h3>
                )}
                {slide.description && (
                  <p className="font-[Inter] text-sm text-white/90 mb-3">
                    {slide.description}
                  </p>
                )}
                {slide.cta && (
                  <Button
                    onClick={slide.cta.onClick}
                    size="sm"
                    className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 text-white"
                  >
                    {slide.cta.label}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      {slides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 z-10",
              "h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm",
              "flex items-center justify-center",
              "hover:bg-black/60 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-white/50"
            )}
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>

          <button
            onClick={handleNext}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 z-10",
              "h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm",
              "flex items-center justify-center",
              "hover:bg-black/60 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-white/50"
            )}
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-[220ms]",
                  index === currentIndex
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
