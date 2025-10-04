import * as React from "react"
import { ChevronLeft, Bell, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigation } from "@/hooks/useNavigation"

export function ProgramsHeaderPro() {
  const { navigate } = useNavigation()
  
  return (
    <header 
      data-testid="programs-header"
      className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/30"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app")}
            className="h-9 w-9 -ml-2"
            aria-label="Back to Home"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">
              Programs
            </h1>
            <p className="text-xs text-muted-foreground">
              Explore all programs
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="Support"
            onClick={() => window.open("https://wa.me/", "_blank")}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
