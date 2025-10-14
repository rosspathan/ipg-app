import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ParticipationFlowProps {
  steps: {
    id: string
    title: string
    description?: string
    status: "pending" | "active" | "completed" | "failed"
    icon?: React.ReactNode
  }[]
  currentStepIndex: number
  onStepComplete?: (stepId: string) => void
  onCancel?: () => void
  className?: string
}

export function ParticipationFlow({
  steps,
  currentStepIndex,
  onStepComplete,
  onCancel,
  className
}: ParticipationFlowProps) {
  const currentStep = steps[currentStepIndex]
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "active":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "failed":
        return "bg-red-500"
      case "active":
        return "bg-primary"
      default:
        return "bg-muted"
    }
  }

  return (
    <Card className={cn("p-6 space-y-6", className)}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg transition-colors",
              index === currentStepIndex && "bg-muted/50",
              step.status === "completed" && "opacity-60"
            )}
          >
            {/* Step Icon/Number */}
            <div className="flex-shrink-0">
              {step.status === "pending" ? (
                <div className="h-8 w-8 rounded-full border-2 border-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                  {index + 1}
                </div>
              ) : (
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  getStatusColor(step.status)
                )}>
                  {getStatusIcon(step.status)}
                </div>
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">{step.title}</h4>
                {step.status !== "pending" && (
                  <Badge
                    variant={
                      step.status === "completed" ? "default" :
                      step.status === "failed" ? "destructive" :
                      "secondary"
                    }
                    className="text-xs"
                  >
                    {step.status}
                  </Badge>
                )}
              </div>
              {step.description && (
                <p className="text-xs text-muted-foreground">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {currentStep && currentStep.status === "active" && (
        <div className="flex gap-2 pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          {onStepComplete && (
            <Button
              onClick={() => onStepComplete(currentStep.id)}
              className="flex-1"
            >
              Continue
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
