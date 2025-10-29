import React from 'react'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Zap } from 'lucide-react'

export type FilterType = 'all' | 'wins' | 'losses' | 'free'

interface SpinHistoryFiltersProps {
  activeFilter: FilterType
  onFilterChange: (filter: FilterType) => void
  counts?: {
    all: number
    wins: number
    losses: number
    free: number
  }
}

export function SpinHistoryFilters({ 
  activeFilter, 
  onFilterChange,
  counts = { all: 0, wins: 0, losses: 0, free: 0 }
}: SpinHistoryFiltersProps) {
  const filters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All', icon: null },
    { value: 'wins', label: 'Wins', icon: <TrendingUp className="w-3 h-3" /> },
    { value: 'losses', label: 'Losses', icon: <TrendingDown className="w-3 h-3" /> },
    { value: 'free', label: 'Free', icon: <Zap className="w-3 h-3" /> },
  ]

  return (
    <div className="flex items-center gap-2 pb-4 border-b border-border/40">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value
        const count = counts[filter.value]
        
        return (
          <Button
            key={filter.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.value)}
            className={`flex-1 h-9 text-xs font-medium transition-all ${
              isActive 
                ? 'shadow-md' 
                : 'hover:bg-muted/50'
            }`}
          >
            {filter.icon && <span className="mr-1">{filter.icon}</span>}
            {filter.label}
            {count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                isActive 
                  ? 'bg-background/20 text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {count}
              </span>
            )}
          </Button>
        )
      })}
    </div>
  )
}
