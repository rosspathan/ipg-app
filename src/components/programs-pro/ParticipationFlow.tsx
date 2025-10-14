import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useProgramParticipation } from "@/hooks/useProgramParticipation"
import { useProgramProgress } from "@/hooks/useProgramProgress"
import { Loader2, CheckCircle2, XCircle, Trophy } from "lucide-react"

interface ParticipationFlowProps {
  moduleId: string
  moduleName: string
  participationType: string
  onComplete?: () => void
  children?: ((props: {
    programState: any
    handleParticipate: (data: any) => void
    isRecording: boolean
  }) => React.ReactNode) | React.ReactNode
}

export function ParticipationFlow({
  moduleId,
  moduleName,
  participationType,
  onComplete,
  children
}: ParticipationFlowProps) {
  const {
    programState,
    isLoading,
    initializeState,
    recordParticipation,
    isInitializing,
    isRecording
  } = useProgramParticipation(moduleId)

  const { progress, completionPercentage } = useProgramProgress(moduleId)

  // Initialize state if needed
  React.useEffect(() => {
    if (!isLoading && !programState) {
      initializeState(moduleId)
    }
  }, [isLoading, programState, moduleId, initializeState])

  const handleParticipate = async (data: {
    inputData?: any
    outputData?: any
    amountPaid?: number
    amountEarned?: number
  }) => {
    recordParticipation({
      moduleId,
      participationType,
      ...data
    })
    onComplete?.()
  }

  if (isLoading || isInitializing) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Program State Card */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{moduleName}</h3>
              <p className="text-sm text-muted-foreground">
                Status: <Badge variant="outline">{programState?.status || "not_started"}</Badge>
              </p>
            </div>
            {programState?.status === "completed" && (
              <Trophy className="h-6 w-6 text-primary" />
            )}
          </div>

          {/* Progress */}
          {progress.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(completionPercentage)}%</span>
              </div>
              <Progress value={completionPercentage} />
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Participations</p>
              <p className="text-lg font-semibold">{programState?.participation_count || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Earned</p>
              <p className="text-lg font-semibold text-green-500">
                {programState?.total_earned || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Spent</p>
              <p className="text-lg font-semibold text-red-500">
                {programState?.total_spent || 0}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Participation Content */}
      {children && (
        <Card className="p-6">
          {typeof children === "function" 
            ? children({ 
                programState, 
                handleParticipate, 
                isRecording 
              })
            : children
          }
        </Card>
      )}

      {/* Milestones */}
      {progress.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Milestones</h4>
          <div className="space-y-2">
            {progress.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {milestone.is_completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-border" />
                  )}
                  <span className="text-sm font-medium capitalize">
                    {milestone.milestone_key.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {milestone.current_value} / {milestone.target_value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
