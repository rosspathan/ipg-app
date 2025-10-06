import * as React from "react"
import { useRef, useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface CardLaneProps {
  children: React.ReactNode
  title?: string
  action?: {
    label: string
    onClick: () => void
  }
  enableParallax?: boolean
  className?: string
}

/**
 * CardLane - Horizontal snap-scroll lane with parallax
 * Purple Nova DS - smooth 60fps transforms
 * Respects prefers-reduced-motion (disables parallax)
 */
export function CardLane({
  children,
  title,
  action,
  enableParallax = true,
  className
}: CardLaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollX, setScrollX] = useState(0)
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  useEffect(() => {
    if (!enableParallax || prefersReducedMotion) return

    const handleScroll = () => {
      if (scrollRef.current) {
        setScrollX(scrollRef.current.scrollLeft)
      }
    }

    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true })
      return () => scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [enableParallax, prefersReducedMotion])

  return (
    <div className={cn("space-y-3", className)} data-testid="card-lane">
      {/* Header */}
      {(title || action) && (
        <div className="flex items-center justify-between px-4">
          {title && (
            <h2 className="font-heading text-lg font-bold text-foreground">
              {title}
            </h2>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-[120ms]"
            >
              {action.label} →
            </button>
          )}
        </div>
      )}

      {/* Scrollable lane */}
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide",
          "px-4 pb-2",
          "scroll-smooth"
        )}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {React.Children.map(children, (child, index) => (
          <div
            className="flex-shrink-0 snap-center"
            style={
              enableParallax && !prefersReducedMotion
                ? {
                    transform: `translateX(${scrollX * 0.05 * (index % 3 - 1)}px)`,
                    transition: 'transform 0.1s ease-out',
                    willChange: 'transform'
                  }
                : undefined
            }
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper styles for hiding scrollbar
const scrollbarHideStyles = `
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style')
  styleEl.textContent = scrollbarHideStyles
  document.head.appendChild(styleEl)
}
