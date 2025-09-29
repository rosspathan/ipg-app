import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function SectionHeader({ 
  title, 
  subtitle, 
  action, 
  className 
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-1">
            {subtitle}
          </p>
        )}
      </div>
      
      {action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          className="flex items-center gap-1 text-accent hover:bg-accent/10"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}