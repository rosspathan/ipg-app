import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface GridViewportProps {
  children: React.ReactNode
  className?: string
  onIntersection?: (entries: IntersectionObserverEntry[]) => void
  skeletonCount?: number
  showSkeletons?: boolean
}

export function GridViewport({ 
  children, 
  className, 
  onIntersection,
  skeletonCount = 6,
  showSkeletons = false
}: GridViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const observer = new IntersectionObserver(
      (entries) => {
        setIsIntersecting(entries[0].isIntersecting)
        onIntersection?.(entries)
      },
      {
        root: null,
        rootMargin: "50px",
        threshold: 0.1
      }
    )

    observer.observe(viewport)
    return () => observer.disconnect()
  }, [onIntersection])

  return (
    <div 
      ref={viewportRef}
      className={cn("w-full", className)}
      data-testid="grid-viewport"
    >
      {showSkeletons ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <SkeletonTile key={i} delay={i * 100} />
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

function SkeletonTile({ delay = 0 }: { delay?: number }) {
  return (
    <div 
      className="bg-card/60 border border-border/40 rounded-xl p-4 space-y-3 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-8 h-8 bg-muted/30 rounded-lg" />
      <div className="space-y-2">
        <div className="h-4 bg-muted/30 rounded w-3/4" />
        <div className="h-3 bg-muted/20 rounded w-full" />
        <div className="h-3 bg-muted/20 rounded w-2/3" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 bg-muted/20 rounded-full w-12" />
        <div className="h-5 bg-muted/20 rounded-full w-10" />
      </div>
    </div>
  )
}