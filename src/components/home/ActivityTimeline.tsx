import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface Activity {
  id: string
  type: "reward" | "spin" | "draw" | "deposit" | "stake" | "trade" | "ad"
  title: string
  subtitle: string
  amount?: number
  currency?: string
  timestamp: Date
  icon: React.ReactNode
  status: "completed" | "pending" | "failed"
}

interface ActivityTimelineProps {
  activities?: Activity[]
  isLoading?: boolean
  onViewAll?: () => void
  className?: string
}

const statusColors = {
  completed: "text-success",
  pending: "text-warning",
  failed: "text-danger"
}

/**
 * ActivityTimeline - Recent user actions with icons
 */
export function ActivityTimeline({
  activities = [],
  isLoading = false,
  onViewAll,
  className
}: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)} data-testid="activity-timeline">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={cn("space-y-3", className)} data-testid="activity-timeline">
        <h2 className="font-[Space_Grotesk] font-bold text-base text-foreground">
          Recent Activity
        </h2>
        <div className="text-center py-12 text-muted-foreground font-[Inter] text-sm">
          No recent activity
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)} data-testid="activity-timeline">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-[Space_Grotesk] font-bold text-sm text-foreground">
          Recent Activity
        </h2>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-[10px] text-text-secondary font-[Inter] font-semibold"
          >
            View All →
          </Button>
        )}
      </div>

      {/* Activities */}
      <div className="space-y-2">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={cn(
              "p-3 rounded-xl bg-card/60 backdrop-blur-xl border border-border/30",
              "transition-all duration-[120ms] hover:border-border/50 hover:bg-card/80"
            )}
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary flex-shrink-0">
                {React.cloneElement(activity.icon as React.ReactElement, { className: "h-3.5 w-3.5" })}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-[Inter] text-xs font-semibold text-foreground truncate">
                      {activity.title}
                    </p>
                    <p className="font-[Inter] text-[10px] text-muted-foreground truncate">
                      {activity.subtitle}
                    </p>
                  </div>
                  {activity.amount && (
                    <div className="text-right flex-shrink-0">
                      <p className={cn(
                        "font-[Space_Grotesk] font-bold text-xs tabular-nums",
                        statusColors[activity.status]
                      )}>
                        +{activity.amount}
                      </p>
                      {activity.currency && (
                        <p className="font-[Inter] text-[10px] text-muted-foreground">
                          {activity.currency}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <p className="font-[Inter] text-[9px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
