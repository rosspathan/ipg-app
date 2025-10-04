import * as React from "react"
import { X, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface QuickAction {
  id: string
  label: string
  variant?: "default" | "secondary" | "outline"
  onPress: () => void
}

interface QuickActionsSheetProps {
  isOpen: boolean
  onClose: () => void
  programTitle: string
  actions: QuickAction[]
  rulesLink?: string
}

export function QuickActionsSheet({
  isOpen,
  onClose,
  programTitle,
  actions,
  rulesLink
}: QuickActionsSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        data-testid="program-actions"
        side="bottom"
        className="rounded-t-3xl border-t border-border/50 max-h-[80vh]"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-heading text-lg">
              {programTitle}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        
        <div className="space-y-3 pb-safe">
          {/* Quick Actions */}
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || "default"}
              className={cn(
                "w-full h-12 text-base font-semibold",
                action.variant === "default" && "bg-primary hover:bg-primary/90"
              )}
              onClick={() => {
                action.onPress()
                onClose()
              }}
            >
              {action.label}
            </Button>
          ))}
          
          {/* Rules Link */}
          {rulesLink && (
            <Button
              variant="outline"
              className="w-full h-12 gap-2"
              onClick={() => {
                window.open(rulesLink, "_blank")
                onClose()
              }}
            >
              Rules & Rewards
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
