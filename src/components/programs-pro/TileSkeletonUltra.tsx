import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface TileSkeletonUltraProps {
  className?: string
}

export function TileSkeletonUltra({ className }: TileSkeletonUltraProps) {
  return (
    <div
      data-testid="program-tile-skel"
      className={cn(
        "rounded-2xl p-4 h-[180px]",
        "bg-gradient-to-br from-[#161A2C] to-[#1B2036]",
        "border border-[#2A2F42]/30",
        className
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-4">
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>

      {/* Title & Subtitle */}
      <div className="text-center mb-4 space-y-2">
        <Skeleton className="h-4 w-24 mx-auto" />
        <Skeleton className="h-3 w-32 mx-auto" />
        <Skeleton className="h-3 w-28 mx-auto" />
      </div>

      {/* Footer */}
      <div className="mt-auto">
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  )
}
