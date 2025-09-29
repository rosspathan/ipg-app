import * as React from "react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface ActivityItem {
  id: string
  type: "deposit" | "withdraw" | "trade" | "spin" | "reward" | "referral" | "stake" | "loan"
  title: string
  subtitle: string
  amount?: number
  currency?: string
  timestamp: Date
  status: "completed" | "pending" | "failed"
  icon: React.ReactNode
}

interface ActivityGridProps {
  activities: ActivityItem[]
  className?: string
  compact?: boolean
  maxItems?: number
}

const typeColors = {
  deposit: "text-success",
  withdraw: "text-warning",
  trade: "text-accent",
  spin: "text-primary",
  reward: "text-success",
  referral: "text-accent",
  stake: "text-primary", 
  loan: "text-warning"
}

const statusColors = {
  completed: "text-success",
  pending: "text-warning",
  failed: "text-danger"
}

const statusDots = {
  completed: "bg-success",
  pending: "bg-warning",
  failed: "bg-danger"
}

export function ActivityGrid({ 
  activities, 
  className, 
  compact = false,
  maxItems = 6
}: ActivityGridProps) {
  const displayedActivities = activities.slice(0, maxItems)

  if (displayedActivities.length === 0) {
    return (
      <div 
        className={cn("text-center py-8", className)}
        data-testid="activity-grid"
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
          <span className="text-2xl opacity-40">📱</span>
        </div>
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 gap-2" : "grid-cols-1 sm:grid-cols-2",
        className
      )}
      data-testid="activity-grid"
    >
      {displayedActivities.map((activity, index) => (
        <div
          key={activity.id}
          className={cn(
            "bg-card/60 border border-border/30 rounded-xl p-3 transition-all duration-220",
            "hover:bg-card/80 hover:border-border/50",
            "animate-fade-in-scale"
          )}
          style={{ 
            animationDelay: `${index * 50}ms`,
            animationFillMode: "both"
          }}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
              "bg-card-secondary/60 border border-border/30",
              typeColors[activity.type]
            )}>
              {activity.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm text-foreground line-clamp-1">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {activity.subtitle}
                  </p>
                </div>

                {/* Status Dot */}
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    statusDots[activity.status]
                  )} />
                </div>
              </div>

              {/* Amount & Timestamp */}
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </div>
                
                {activity.amount && (
                  <div className={cn(
                    "text-xs font-mono tabular-nums font-medium",
                    statusColors[activity.status]
                  )}>
                    {activity.type === "withdraw" ? "-" : "+"}
                    {activity.amount.toLocaleString()} {activity.currency}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}