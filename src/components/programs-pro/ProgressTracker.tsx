import * as React from "react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Circle, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProgressMilestone } from "@/hooks/useProgramParticipation"

interface ProgressTrackerProps {
  milestones: ProgressMilestone[]
  className?: string
}

export function ProgressTracker({ milestones, className }: ProgressTrackerProps) {
  const completedCount = milestones.filter(m => m.is_completed).length
  const totalProgress = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0

  const getMilestoneIcon = (milestone: ProgressMilestone) => {
    if (milestone.is_completed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    
    const progress = milestone.target_value > 0 
      ? (milestone.current_value / milestone.target_value) * 100 
      : 0

    if (progress > 0) {
      return (
        <div className="relative h-5 w-5">
          <Circle className="h-5 w-5 text-primary" />
          <div
            className="absolute inset-0 rounded-full border-2 border-primary"
            style={{
              clipPath: `polygon(0 0, 100% 0, 100% ${100 - progress}%, 0 ${100 - progress}%)`
            }}
          />
        </div>
      )
    }

    return <Circle className="h-5 w-5 text-muted-foreground" />
  }

  const getMilestoneTypeColor = (type: string) => {
    switch (type) {
      case "level":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "achievement":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "streak":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "threshold":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <Card className={cn("p-6 space-y-6", className)}>
      {/* Overall Progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Progress Tracker</h3>
          <span className="text-sm text-muted-foreground">
            {completedCount} / {milestones.length} completed
          </span>
        </div>
        <Progress value={totalProgress} className="h-2" />
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.map((milestone) => {
          const progress = milestone.target_value > 0 
            ? (milestone.current_value / milestone.target_value) * 100 
            : 0

          return (
            <div
              key={milestone.id}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                milestone.is_completed ? "bg-green-500/5 border-green-500/20" : "bg-card"
              )}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getMilestoneIcon(milestone)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm capitalize">
                      {milestone.milestone_key.replace(/_/g, " ")}
                    </h4>
                    <Badge
                      variant="outline"
                      className={cn("mt-1 text-xs", getMilestoneTypeColor(milestone.milestone_type))}
                    >
                      {milestone.milestone_type}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">
                    {milestone.current_value} / {milestone.target_value}
                  </span>
                </div>

                {/* Progress Bar */}
                {!milestone.is_completed && (
                  <div className="space-y-1">
                    <Progress value={progress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {Math.round(progress)}% complete
                    </p>
                  </div>
                )}

                {/* Completion Date */}
                {milestone.is_completed && milestone.completed_at && (
                  <p className="text-xs text-green-500">
                    Completed on {new Date(milestone.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )
        })}

        {milestones.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No milestones available yet</p>
          </div>
        )}
      </div>
    </Card>
  )
}
