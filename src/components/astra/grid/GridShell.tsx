import * as React from "react"
import { cn } from "@/lib/utils"

interface GridShellProps {
  children: React.ReactNode
  className?: string
  topBar?: React.ReactNode
  bottomBar?: React.ReactNode
}

export function GridShell({ 
  children, 
  className, 
  topBar, 
  bottomBar 
}: GridShellProps) {
  return (
    <div 
      className={cn(
        "min-h-screen bg-background flex flex-col",
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        className
      )}
      data-testid="grid-shell"
    >
      {/* Glass Top Bar */}
      {topBar && (
        <div className="sticky top-0 z-40 glass-card border-b border-border/50">
          {topBar}
        </div>
      )}
      
      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Glass Bottom Bar */}
      {bottomBar && (
        <div className="sticky bottom-0 z-40 glass-card border-t border-border/50">
          {bottomBar}
        </div>
      )}
    </div>
  )
}