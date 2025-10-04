import * as React from "react"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export type ErrorSeverity = "error" | "warning" | "info"

export interface ErrorHint {
  message: string
  severity: ErrorSeverity
  action?: {
    label: string
    onClick: () => void
  }
}

interface ErrorHintBarProps {
  errors: ErrorHint[]
  className?: string
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    text: "text-destructive",
    iconColor: "text-destructive"
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    iconColor: "text-warning"
  },
  info: {
    icon: Info,
    bg: "bg-accent/10",
    border: "border-accent/30",
    text: "text-accent",
    iconColor: "text-accent"
  }
}

/**
 * ErrorHintBar - Compact error/warning display
 */
export function ErrorHintBar({ errors, className }: ErrorHintBarProps) {
  if (errors.length === 0) return null

  return (
    <div 
      data-testid="amount-errors"
      className={cn("space-y-2", className)}
    >
      {errors.map((error, idx) => {
        const config = severityConfig[error.severity]
        const Icon = config.icon
        
        return (
          <div
            key={idx}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border",
              config.bg,
              config.border,
              error.severity === "error" && "animate-shake motion-reduce:animate-none"
            )}
          >
            <Icon className={cn("h-4 w-4 flex-shrink-0", config.iconColor)} />
            <p className={cn("text-xs font-medium flex-1", config.text)}>
              {error.message}
            </p>
            {error.action && (
              <button
                onClick={error.action.onClick}
                className={cn(
                  "text-xs font-semibold underline hover:no-underline",
                  config.text
                )}
              >
                {error.action.label}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
