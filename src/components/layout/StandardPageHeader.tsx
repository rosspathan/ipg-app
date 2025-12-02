import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

interface Breadcrumb {
  label: string
  route: string
}

interface StandardPageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  parentRoute: string
  rightAction?: React.ReactNode
}

export function StandardPageHeader({
  title,
  subtitle,
  breadcrumbs,
  parentRoute,
  rightAction,
}: StandardPageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(parentRoute)
  }

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/30">
      <div className="flex items-center gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-9 w-9 -ml-2 shrink-0"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm mb-1 overflow-x-auto no-scrollbar">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.route}>
                  <button
                    onClick={() => navigate(crumb.route)}
                    className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    {crumb.label}
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          <h1 className="text-lg font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>
    </div>
  )
}
