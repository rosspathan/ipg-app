import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

interface Program {
  id: string
  title: string
  icon: React.ReactNode
  onPress: () => void
}

interface ProgramsGridProps {
  programs: Program[]
  title?: string
  onViewAll?: () => void
  className?: string
}

/**
 * ProgramsGrid - PhonePe-style grid menu for programs
 * Memoized to prevent unnecessary re-renders
 */
const ProgramsGridComponent = ({
  programs,
  title = "My Programs",
  onViewAll,
  className
}: ProgramsGridProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-[Space_Grotesk] font-bold text-lg text-foreground">
          {title}
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-primary font-[Inter] text-sm font-medium hover:opacity-80 transition-opacity"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-4">
        {programs.map((program) => (
          <button
            key={program.id}
            onClick={program.onPress}
            className={cn(
              "flex flex-col items-center gap-2 p-2 rounded-xl",
              "transition-opacity duration-200",
              "hover:bg-gradient-to-br hover:from-primary/5 hover:to-accent/5",
              "active:scale-95"
            )}
          >
            {/* Icon Circle - Removed scale animations to prevent flicker */}
            <div
              className={cn(
                "h-14 w-14 rounded-full",
                "bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10",
                "border border-primary/30",
                "shadow-lg shadow-primary/10",
                "backdrop-blur-xl",
                "flex items-center justify-center",
                "text-primary"
              )}
            >
              {program.icon}
            </div>

            {/* Label */}
            <span className="font-[Inter] text-[10px] text-center text-foreground/90 font-medium leading-tight">
              {program.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export const ProgramsGrid = React.memo(ProgramsGridComponent)

