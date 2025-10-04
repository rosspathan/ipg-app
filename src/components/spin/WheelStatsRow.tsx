import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Segment {
  id: string
  label: string
  multiplier: number
  weight: number
  color_hex: string
}

interface WheelStatsRowProps {
  segments: Segment[]
  winningSegmentIndex?: number
}

export function WheelStatsRow({ segments, winningSegmentIndex }: WheelStatsRowProps) {
  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0)

  return (
    <div data-testid="wheel-stats" className="w-full overflow-x-auto pb-2">
      <div className="flex gap-2 px-4 min-w-max snap-x snap-mandatory">
        {segments.map((segment, index) => {
          const chance = ((segment.weight / totalWeight) * 100).toFixed(1)
          const isWin = segment.multiplier > 0
          const isWinning = winningSegmentIndex === index

          return (
            <TooltipProvider key={segment.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={`snap-center flex-shrink-0 w-28 p-2.5 transition-all duration-200 cursor-pointer ${
                      isWinning
                        ? 'ring-2 ring-primary shadow-lg scale-105'
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                    style={{
                      background: isWinning
                        ? `linear-gradient(135deg, ${segment.color_hex}20, ${segment.color_hex}10)`
                        : 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      borderColor: isWinning ? segment.color_hex : 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full ring-2 ring-white/50"
                        style={{ backgroundColor: segment.color_hex }}
                      />
                      <span className={`text-xs font-semibold ${isWin ? 'text-green-500' : 'text-rose-500'}`}>
                        {segment.label}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {chance}% chance
                    </div>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Expected return: {isWin ? `${segment.multiplier}× × ${chance}% = ${(segment.multiplier * parseFloat(chance) / 100).toFixed(2)}×` : '0×'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    </div>
  )
}
