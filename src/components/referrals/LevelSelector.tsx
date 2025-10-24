import { Badge } from "@/components/ui/badge"

interface LevelSelectorProps {
  levels: Array<{ level: number; count: number }>
  selectedLevel: number
  onLevelChange: (level: number) => void
}

export function LevelSelector({ levels, selectedLevel, onLevelChange }: LevelSelectorProps) {
  return (
    <div className="relative w-full">
      {/* Left fade gradient indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      
      {/* Right fade gradient indicator */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      {/* Native scrollable container */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 px-1">
        {levels.map(({ level, count }) => (
          <button
            key={level}
            onClick={() => onLevelChange(level)}
            className={`
              snap-start shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all
              ${selectedLevel === level 
                ? 'border-primary bg-primary text-primary-foreground shadow-sm' 
                : 'border-border bg-background hover:border-primary/50'
              }
            `}
          >
            <span className="font-semibold text-sm whitespace-nowrap">L{level}</span>
            <Badge 
              variant={selectedLevel === level ? "secondary" : "outline"}
              className="text-xs"
            >
              {count}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  )
}
