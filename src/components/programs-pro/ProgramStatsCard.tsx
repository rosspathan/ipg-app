import * as React from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProgramState } from "@/hooks/useProgramParticipation"

interface ProgramStatsCardProps {
  state: ProgramState
  className?: string
}

export function ProgramStatsCard({ state, className }: ProgramStatsCardProps) {
  const netEarnings = state.total_earned - state.total_spent
  const isProfit = netEarnings >= 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "completed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "paused":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "expired":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  return (
    <Card className={cn("p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">Program Statistics</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your participation overview
          </p>
        </div>
        <Badge variant="outline" className={getStatusColor(state.status)}>
          {state.status}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Participations</span>
          </div>
          <p className="text-2xl font-bold">{state.participation_count}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isProfit ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm text-muted-foreground">Net Earnings</span>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            isProfit ? "text-green-500" : "text-red-500"
          )}>
            {isProfit ? "+" : ""}{netEarnings.toFixed(2)}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Total Earned</span>
          <p className="text-xl font-semibold text-green-500">
            +{state.total_earned.toFixed(2)}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Total Spent</span>
          <p className="text-xl font-semibold text-red-500">
            -{state.total_spent.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="pt-4 border-t space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">First Participated</span>
          <span className="font-medium">{formatDate(state.first_participated_at)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Last Activity</span>
          <span className="font-medium">{formatDate(state.last_participated_at)}</span>
        </div>
        {state.completed_at && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completed</span>
            <span className="font-medium text-green-500">{formatDate(state.completed_at)}</span>
          </div>
        )}
        {state.expires_at && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Expires</span>
            <span className="font-medium text-orange-500">{formatDate(state.expires_at)}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
