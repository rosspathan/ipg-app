import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Repeat, 
  Gift, 
  Star, 
  TrendingUp,
  Eye,
  CreditCard,
  Target
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Activity {
  id: string
  type: "deposit" | "withdrawal" | "spin" | "draw" | "ad_view" | "reward" | "loan_emi" | "swap" | "trade"
  title: string
  description: string
  amount?: number
  currency?: string
  timestamp: Date
  status: "completed" | "pending" | "failed"
}

interface ActivityRowProps {
  activity: Activity
  className?: string
}

const activityConfig = {
  deposit: {
    icon: ArrowDownCircle,
    color: "text-success",
    bgColor: "bg-success/10"
  },
  withdrawal: {
    icon: ArrowUpCircle,
    color: "text-danger", 
    bgColor: "bg-danger/10"
  },
  swap: {
    icon: Repeat,
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
  spin: {
    icon: Target,
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  draw: {
    icon: Gift,
    color: "text-warning",
    bgColor: "bg-warning/10"
  },
  ad_view: {
    icon: Eye,
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
  reward: {
    icon: Star,
    color: "text-success",
    bgColor: "bg-success/10"
  },
  loan_emi: {
    icon: CreditCard,
    color: "text-warning",
    bgColor: "bg-warning/10"
  },
  trade: {
    icon: TrendingUp,
    color: "text-success",
    bgColor: "bg-success/10"
  }
}

export function ActivityRow({ activity, className }: ActivityRowProps) {
  const config = activityConfig[activity.type]
  const Icon = config.icon

  const formatAmount = (amount: number, currency: string) => {
    if (currency === "BSK" || currency === "INR") {
      return `${amount.toLocaleString()} ${currency}`
    }
    return `${amount.toFixed(4)} ${currency}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-success"
      case "pending":
        return "text-warning"
      case "failed":
        return "text-danger"
      default:
        return "text-text-secondary"
    }
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg hover:bg-card-glass/30 transition-colors cursor-pointer group",
        className
      )}
      data-testid="activity-row"
    >
      {/* Icon */}
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-standard",
        config.bgColor,
        "group-hover:scale-110"
      )}>
        <Icon className={cn("h-5 w-5", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-text-primary truncate">
            {activity.title}
          </h4>
          {activity.amount && (
            <span className={cn(
              "font-mono font-semibold text-sm ml-2",
              config.color
            )}>
              {activity.type === "withdrawal" ? "-" : "+"}{formatAmount(activity.amount, activity.currency || "BSK")}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary truncate">
            {activity.description}
          </p>
          <div className="flex items-center gap-2 ml-2">
            <span className={cn("text-xs", getStatusColor(activity.status))}>
              {activity.status}
            </span>
            <span className="text-xs text-text-secondary">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Activity List Component
interface ActivityListProps {
  activities: Activity[]
  className?: string
  emptyMessage?: string
}

export function ActivityList({ 
  activities, 
  className,
  emptyMessage = "No recent activity" 
}: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className={cn("text-center py-8 text-text-secondary", className)} data-testid="activity-list">
        <div className="relative">
          <Gift className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-xl opacity-20" />
        </div>
        <p className="font-bold text-lg mb-2">No Activity Yet</p>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-1", className)} data-testid="activity-list">
      {activities.map((activity) => (
        <ActivityRow 
          key={activity.id} 
          activity={activity}
        />
      ))}
    </div>
  )
}