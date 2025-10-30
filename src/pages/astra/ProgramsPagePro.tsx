import * as React from "react"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { useActivePrograms, getLucideIcon } from "@/hooks/useActivePrograms"

/**
 * ProgramsPagePro - Full grid view of all programs (database-driven)
 */
export function ProgramsPagePro() {
  const { navigate } = useNavigation()
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const { programs, isLoading, isUsingDefaults } = useActivePrograms()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading programs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="page-programs">
        {/* Default Programs Notice */}
        {isUsingDefaults && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Using default programs. Configure in admin panel for custom programs.
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 gap-3">
          {programs.map((program) => {
            const IconComponent = getLucideIcon(program.icon);
            return (
              <button
                key={program.id}
                onClick={() => navigate(program.route)}
                className={cn(
                  "flex flex-col items-center gap-2 p-2 rounded-xl",
                  "transition-all duration-300 ease-out",
                  "hover:bg-gradient-to-br hover:from-primary/5 hover:to-accent/5",
                  "active:scale-95"
                )}
              >
                {/* Icon Circle */}
                <div
                  className={cn(
                    "h-14 w-14 rounded-full",
                    "bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10",
                    "border border-primary/30",
                    "shadow-lg shadow-primary/10",
                    "backdrop-blur-xl",
                    "flex items-center justify-center",
                    "text-primary",
                    "transition-all duration-300 ease-out",
                    "hover:scale-110 hover:shadow-xl hover:shadow-primary/20",
                    "hover:border-primary/50"
                  )}
                >
                  <IconComponent className="h-6 w-6" />
                </div>

                {/* Label */}
                <span className="font-[Inter] text-[10px] text-center text-foreground/90 font-medium leading-tight">
                  {program.name}
                </span>
              </button>
            );
          })}
        </div>

      {/* Quick Switch Radial Menu */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={(action) => {
          switch (action) {
            case "deposit":
              navigate("/app/wallet/deposit")
              break
            case "convert":
              navigate("/app/swap")
              break
            case "trade":
              navigate("/app/trade")
              break
            case "programs":
              navigate("/app/programs")
              break
          }
        }}
      />
    </div>
  )
}
