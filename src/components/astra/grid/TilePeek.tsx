import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { X, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AstraCard } from "../AstraCard"

interface TilePeekContent {
  title: string
  description: string
  details: string[]
  metrics?: Array<{
    label: string
    value: string | number
    type?: "currency" | "percentage" | "count"
  }>
  actions?: Array<{
    label: string
    variant?: "default" | "secondary" | "outline"
    onPress: () => void
  }>
  imageUrl?: string
}

interface TilePeekProps {
  children: React.ReactNode
  content: TilePeekContent
  className?: string
  longPressDuration?: number
}

export function TilePeek({ 
  children, 
  content, 
  className,
  longPressDuration = 500
}: TilePeekProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const pressStartTime = useRef<number>(0)

  const startLongPress = () => {
    pressStartTime.current = Date.now()
    setIsLongPressing(true)
    
    longPressTimer.current = setTimeout(() => {
      setIsOpen(true)
      setIsLongPressing(false)
    }, longPressDuration)
  }

  const endLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsLongPressing(false)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  return (
    <>
      <div
        className={cn(
          "relative transition-all duration-220",
          isLongPressing && "scale-105 shadow-neon",
          className
        )}
        onMouseDown={startLongPress}
        onMouseUp={endLongPress}
        onMouseLeave={endLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={endLongPress}
      >
        {children}
        
        {/* Long Press Progress Ring */}
        {isLongPressing && (
          <div className="absolute inset-0 rounded-xl pointer-events-none">
            <div className="absolute inset-0 border-2 border-primary/30 rounded-xl animate-pulse" />
            <div 
              className="absolute inset-0 border-2 border-primary rounded-xl"
              style={{
                clipPath: "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)",
                animation: `fillProgress ${longPressDuration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[70vh] rounded-t-2xl border-t border-border/50"
          data-testid="tile-peek"
        >
          <div className="space-y-4 h-full overflow-auto pb-6">
            {/* Header */}
            <div className="flex items-start justify-between sticky top-0 bg-background/95 backdrop-blur-sm pb-4 border-b border-border/30">
              <div className="flex-1">
                <h2 className="font-bold text-lg text-foreground">
                  {content.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {content.description}
                </p>
              </div>
              
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Hero Image */}
            {content.imageUrl && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden">
                <img 
                  src={content.imageUrl} 
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              </div>
            )}

            {/* Metrics Grid */}
            {content.metrics && content.metrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {content.metrics.map((metric, index) => (
                  <AstraCard key={index} variant="glass" className="p-3 text-center">
                    <div className="text-lg font-bold text-primary font-mono tabular-nums">
                      {typeof metric.value === "number" 
                        ? metric.value.toLocaleString()
                        : metric.value
                      }
                      {metric.type === "percentage" && "%"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {metric.label}
                    </div>
                  </AstraCard>
                ))}
              </div>
            )}

            {/* Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Details</h3>
              <div className="space-y-2">
                {content.details.map((detail, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0 mt-2" />
                    <span className="text-muted-foreground">{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {content.actions && content.actions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                {content.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "default"}
                    onClick={() => {
                      action.onPress()
                      handleClose()
                    }}
                    className="h-12 font-medium"
                  >
                    {action.label}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// CSS for progress animation (add to global styles)
const progressAnimation = `
@keyframes fillProgress {
  0% { clip-path: polygon(50% 50%, 50% 0%, 50% 0%, 50% 50%); }
  25% { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 50% 50%); }
  50% { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 50%); }
  75% { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%, 50% 50%); }
  100% { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%, 0% 100%, 0% 0%, 50% 50%); }
}
`

export { progressAnimation }