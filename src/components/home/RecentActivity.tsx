import * as React from "react"
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Zap, 
  Target, 
  Eye, 
  Gift,
  TrendingUp,
  CreditCard
} from "lucide-react"
import { NeoCard } from "@/components/ui/neo-card"
import { formatDistanceToNow } from "date-fns"

interface ActivityItem {
  id: string
  type: "deposit" | "withdrawal" | "spin" | "draw" | "ad_view" | "reward" | "loan" | "trade"
  title: string
  description: string
  amount?: number
  currency?: string
  timestamp: Date
  status?: "completed" | "pending" | "failed"
}

// Mock data - replace with real data
const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "reward",
    title: "Ad Mining Reward",
    description: "Daily ad viewing completed",
    amount: 25.50,
    currency: "BSK",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    status: "completed"
  },
  {
    id: "2", 
    type: "spin",
    title: "Spin Wheel Win",
    description: "Won 2x multiplier",
    amount: 200.00,
    currency: "BSK", 
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2h ago
    status: "completed"
  },
  {
    id: "3",
    type: "deposit",
    title: "IPG Deposit",
    description: "Wallet funding",
    amount: 1000.00,
    currency: "INR",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1d ago
    status: "completed"
  },
  {
    id: "4",
    type: "loan",
    title: "BSK Loan EMI",
    description: "Week 3 of 16 paid",
    amount: 750.00,
    currency: "BSK",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2d ago
    status: "completed"
  }
]

const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "deposit":
      return <ArrowDownLeft className="h-4 w-4 text-success" />
    case "withdrawal":
      return <ArrowUpRight className="h-4 w-4 text-warning" />
    case "spin":
      return <Zap className="h-4 w-4 text-accent" />
    case "draw":
      return <Target className="h-4 w-4 text-primary" />
    case "ad_view":
      return <Eye className="h-4 w-4 text-muted-foreground" />
    case "reward":
      return <Gift className="h-4 w-4 text-success" />
    case "loan":
      return <CreditCard className="h-4 w-4 text-warning" />
    case "trade":
      return <TrendingUp className="h-4 w-4 text-accent" />
    default:
      return <Gift className="h-4 w-4 text-muted-foreground" />
  }
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case "completed":
      return "text-success"
    case "pending": 
      return "text-warning"
    case "failed":
      return "text-danger"
    default:
      return "text-muted-foreground"
  }
}

export function RecentActivity() {
  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg font-semibold">Recent Activity</h2>
        <button className="text-sm text-text-secondary">
          View All
        </button>
      </div>

      <NeoCard variant="elevated" size="sm">
        <div className="space-y-3">
          {mockActivities.map((activity, index) => (
            <div key={activity.id}>
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center">
                  {getActivityIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {activity.title}
                    </p>
                    {activity.amount && (
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold">
                          {activity.type === "withdrawal" ? "-" : "+"}
                          {activity.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.currency}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider (except for last item) */}
              {index < mockActivities.length - 1 && (
                <div className="border-t border-divider mt-3" />
              )}
            </div>
          ))}
        </div>
      </NeoCard>
    </div>
  )
}