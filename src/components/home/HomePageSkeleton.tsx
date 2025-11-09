import { Skeleton } from "@/components/ui/skeleton"

/**
 * HomePageSkeleton - Complete loading skeleton matching HomePageRebuilt layout
 * Prevents layout shift and provides instant visual feedback
 */
export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20 space-y-6">
      {/* Add Funds CTA Skeleton */}
      <div className="px-4">
        <Skeleton className="h-16 rounded-2xl" />
      </div>

      {/* KPI Card Skeleton */}
      <div className="px-4">
        <Skeleton className="h-32 rounded-2xl" />
      </div>

      {/* BSK Balance Cards - Side by Side */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>

      {/* View History Button Skeleton */}
      <div className="px-4">
        <Skeleton className="h-10 rounded-xl" />
      </div>

      {/* Scrolling Announcement Skeleton */}
      <div className="px-4">
        <Skeleton className="h-10 rounded-xl" />
      </div>

      {/* Image Carousel Skeleton */}
      <div className="px-4">
        <Skeleton className="h-48 rounded-2xl" />
      </div>

      {/* Quick Access Grid - 2x2 */}
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Programs Grid - 4x2 */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline Skeleton */}
      <div className="px-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
