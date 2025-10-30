import * as React from "react"
import { useEffect, useCallback } from "react"
import useEmblaCarousel from "embla-carousel-react"
import AutoPlay from "embla-carousel-autoplay"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface AnnouncementSlide {
  id: string
  image: string
  title: string
  description?: string
  onClick?: () => void
}

interface AnnouncementCarouselProps {
  slides?: AnnouncementSlide[]
  className?: string
}

/**
 * AnnouncementCarousel - Image-based announcement cards carousel
 * Displays admin-uploaded promotional images with auto-play
 */
export function AnnouncementCarousel({ slides, className }: AnnouncementCarouselProps) {
  const defaultSlides: AnnouncementSlide[] = [
    {
      id: "1",
      image: "/placeholder.svg",
      title: "Lucky Draw",
      description: "Win amazing prizes daily"
    },
    {
      id: "2",
      image: "/placeholder.svg",
      title: "Spin Wheel",
      description: "Try your luck today"
    },
    {
      id: "3",
      image: "/placeholder.svg",
      title: "List Your Coin",
      description: "Add your token now"
    }
  ]

  const carouselSlides = slides || defaultSlides

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      align: "start",
      skipSnaps: false
    },
    [AutoPlay({ delay: 4000, stopOnInteraction: false })]
  )

  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className={cn("relative w-full", className)} data-testid="announcement-carousel">
      {/* Carousel container */}
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex gap-3">
          {carouselSlides.map((slide) => (
            <div
              key={slide.id}
              className="flex-[0_0_85%] min-w-0"
            >
              <button
                onClick={slide.onClick}
                className={cn(
                  "relative w-full h-32 rounded-2xl overflow-hidden",
                  "bg-gradient-to-br from-card/95 via-card/90 to-card/95",
                  "border border-primary/20",
                  "shadow-lg shadow-primary/5",
                  "backdrop-blur-xl",
                  "transition-all duration-300 ease-out",
                  "hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  "group cursor-pointer"
                )}
              >
                {/* Image background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                  />
                </div>

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
                  <h3 className="text-lg font-[Space_Grotesk] font-bold text-foreground leading-tight drop-shadow-lg">
                    {slide.title}
                  </h3>
                  {slide.description && (
                    <p className="text-sm font-[Inter] font-medium text-muted-foreground drop-shadow-md">
                      {slide.description}
                    </p>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={scrollPrev}
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 z-10",
          "h-8 w-8 rounded-full",
          "bg-background/80 backdrop-blur-sm border border-border/50",
          "flex items-center justify-center",
          "transition-opacity duration-300",
          "hover:bg-background hover:opacity-80",
          "shadow-lg"
        )}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4 text-foreground" />
      </button>

      <button
        onClick={scrollNext}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 z-10",
          "h-8 w-8 rounded-full",
          "bg-background/80 backdrop-blur-sm border border-border/50",
          "flex items-center justify-center",
          "transition-opacity duration-300",
          "hover:bg-background hover:opacity-80",
          "shadow-lg"
        )}
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4 text-foreground" />
      </button>
    </div>
  )
}
