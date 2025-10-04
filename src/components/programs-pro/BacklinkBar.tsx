import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigation } from "@/hooks/useNavigation"

interface BacklinkBarProps {
  programName: string
  onBack?: () => void
}

export function BacklinkBar({ programName, onBack }: BacklinkBarProps) {
  const { navigate } = useNavigation()
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate("/app/programs")
    }
  }
  
  return (
    <div 
      data-testid="backlink-bar"
      className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/30"
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-9 w-9 -ml-2"
          aria-label="Back to Programs"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-1.5 text-sm">
          <button
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Programs
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{programName}</span>
        </div>
      </div>
    </div>
  )
}
