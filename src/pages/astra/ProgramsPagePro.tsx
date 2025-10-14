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
        <div className="grid grid-cols-2 gap-4">
          {programs.map((program) => {
            const IconComponent = getLucideIcon(program.icon);
            return (
              <button
                key={program.id}
                onClick={() => navigate(program.route)}
                className={cn(
                  "p-4 rounded-2xl",
                  "bg-card/60 backdrop-blur-xl border border-border/30",
                  "transition-all duration-200",
                  "hover:bg-card/80 hover:scale-[1.02] active:scale-95",
                  "flex flex-col items-start gap-3"
                )}
                style={{
                  WebkitBackdropFilter: 'blur(16px)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 4px 20px rgba(124, 77, 255, 0.1)'
                }}
              >
                {/* Icon & Badge */}
                <div className="flex items-start justify-between w-full">
                  <div
                    className={cn(
                      "h-14 w-14 rounded-full",
                      "bg-primary/10 border border-primary/20",
                      "flex items-center justify-center",
                      "text-primary"
                    )}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                  {program.badge && (
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-[Inter] font-bold uppercase",
                        program.badgeColor
                      )}
                    >
                      {program.badge}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="text-left w-full">
                  <h3 className="font-[Space_Grotesk] font-bold text-sm text-foreground mb-1">
                    {program.name}
                  </h3>
                  <p className="font-[Inter] text-[11px] text-muted-foreground leading-tight">
                    {program.description}
                  </p>
                </div>
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
