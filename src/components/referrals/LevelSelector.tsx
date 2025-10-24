import { useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight } from "lucide-react"


interface LevelSelectorProps {
  levels: Array<{ level: number; count: number }>
  selectedLevel: number
  onLevelChange: (level: number) => void
}

export function LevelSelector({ levels, selectedLevel, onLevelChange }: LevelSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  useEffect(() => {
    const el = itemRefs.current.get(selectedLevel)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedLevel])

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.6), behavior: 'smooth' })
  }

  return (
    <div className="relative w-full">
      {/* Left fade gradient indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      
      {/* Right fade gradient indicator */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      {/* Native scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 px-1"
        role="tablist"
        aria-label="Referral levels"
      >
        {levels.map(({ level, count }) => (
          <button
            key={level}
            type="button"
            ref={(node) => {
              if (node) itemRefs.current.set(level, node)
              else itemRefs.current.delete(level)
            }}
            onClick={() => onLevelChange(level)}
            className={`
              snap-start shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all
              ${selectedLevel === level 
                ? 'border-primary bg-primary text-primary-foreground shadow-sm' 
                : 'border-border bg-background hover:border-primary/50'
              }
            `}
            aria-pressed={selectedLevel === level}
            aria-label={`Level ${level}, ${count} members`}
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

      {/* Arrow controls */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1 pr-10">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="pointer-events-auto inline-flex items-center justify-center h-8 w-8 rounded-full bg-background/80 border border-border text-muted-foreground hover:text-foreground shadow-sm"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1 pl-10">
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="pointer-events-auto inline-flex items-center justify-center h-8 w-8 rounded-full bg-background/80 border border-border text-muted-foreground hover:text-foreground shadow-sm"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
