import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface LevelSelectorProps {
  levels: Array<{ level: number; count: number }>
  selectedLevel: number
  onLevelChange: (level: number) => void
}

export function LevelSelector({ levels, selectedLevel, onLevelChange }: LevelSelectorProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {levels.map(({ level, count }) => (
          <button
            key={level}
            onClick={() => onLevelChange(level)}
            className={`
              inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all
              ${selectedLevel === level 
                ? 'border-primary bg-primary text-primary-foreground shadow-sm' 
                : 'border-border bg-background hover:border-primary/50'
              }
            `}
          >
            <span className="font-semibold text-sm">Level {level}</span>
            <Badge 
              variant={selectedLevel === level ? "secondary" : "outline"}
              className="ml-1"
            >
              {count}
            </Badge>
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
