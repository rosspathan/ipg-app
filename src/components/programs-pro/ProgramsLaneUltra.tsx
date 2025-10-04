import * as React from "react"
import { CardLane } from "@/components/astra/CardLane"
import { ProgramTileUltra, type TileBadgeType } from "./ProgramTileUltra"

interface Program {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  badge?: TileBadgeType
  sparkline?: number[]
  progress?: { value: number; label?: string }
  streak?: { total: number; completed: number }
  footer?: string
  onPress: () => void
  onKebabPress?: () => void
}

interface ProgramsLaneUltraProps {
  programs: Program[]
  onViewAll?: () => void
  className?: string
}

/**
 * ProgramsLaneUltra - Horizontal snap-scroll lane with ultra tiles
 */
export function ProgramsLaneUltra({ programs, onViewAll, className }: ProgramsLaneUltraProps) {
  return (
    <div className={className} data-testid="programs-lane">
      <CardLane
        title="My Programs"
        action={onViewAll ? { label: "View All", onClick: onViewAll } : undefined}
        enableParallax={true}
      >
        {programs.map((program) => (
          <div key={program.id} className="w-40">
            <ProgramTileUltra
              icon={program.icon}
              title={program.title}
              subtitle={program.subtitle}
              badge={program.badge}
              sparkline={program.sparkline}
              progress={program.progress}
              streak={program.streak}
              footer={program.footer}
              onPress={program.onPress}
              onKebabPress={program.onKebabPress}
            />
          </div>
        ))}
      </CardLane>
    </div>
  )
}
