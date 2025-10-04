import * as React from "react"
import { CardLane } from "@/components/astra/CardLane"
import { cn } from "@/lib/utils"

interface Program {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  badge?: "DAILY" | "HOT" | "NEW" | "LIVE"
  onPress: () => void
}

interface ProgramsLaneProps {
  programs: Program[]
  onViewAll?: () => void
  className?: string
}

const badgeColors = {
  DAILY: "bg-success/20 text-success border-success/30",
  HOT: "bg-danger/20 text-danger border-danger/30",
  NEW: "bg-accent/20 text-accent border-accent/30",
  LIVE: "bg-primary/20 text-primary border-primary/30"
}

/**
 * ProgramsLane - Horizontal snap-scroll of program cards
 */
export function ProgramsLane({ programs, onViewAll, className }: ProgramsLaneProps) {
  return (
    <div className={className} data-testid="programs-lane">
      <CardLane
        title="My Programs"
        action={onViewAll ? { label: "View All", onClick: onViewAll } : undefined}
        enableParallax={true}
      >
        {programs.map((program) => (
          <button
            key={program.id}
            onClick={program.onPress}
            className={cn(
              "w-40 h-44 p-4 rounded-2xl",
              "bg-card/60 backdrop-blur-xl border border-border/30",
              "hover:border-primary/40 hover:bg-card/80 hover:scale-[1.02]",
              "active:scale-[0.98]",
              "transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              "flex flex-col items-start justify-between",
              "relative overflow-hidden group"
            )}
            style={{
              WebkitBackdropFilter: 'blur(16px)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
            }}
          >
            {/* Badge */}
            {program.badge && (
              <div
                className={cn(
                  "absolute top-2 right-2 px-2 py-0.5 rounded-full",
                  "text-[9px] font-[Inter] font-bold uppercase tracking-wider",
                  "border backdrop-blur-sm",
                  badgeColors[program.badge]
                )}
              >
                {program.badge}
              </div>
            )}

            {/* Icon */}
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-accent/20",
              "text-primary transition-transform duration-[220ms]",
              "group-hover:scale-110 group-hover:rotate-6"
            )}>
              {program.icon}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-end text-left w-full">
              <h3 className="font-[Space_Grotesk] font-bold text-sm text-foreground mb-1">
                {program.title}
              </h3>
              <p className="font-[Inter] text-xs text-muted-foreground leading-tight whitespace-pre-line">
                {program.subtitle}
              </p>
            </div>

            {/* Shine effect */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[320ms] pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent 30%, rgba(124, 77, 255, 0.1) 50%, rgba(0, 229, 255, 0.1) 70%, transparent)'
              }}
            />
          </button>
        ))}
      </CardLane>
    </div>
  )
}
