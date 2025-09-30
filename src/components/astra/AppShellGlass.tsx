import * as React from "react"
import { cn } from "@/lib/utils"

interface AppShellGlassProps {
  children: React.ReactNode
  className?: string
  topBar?: React.ReactNode
  bottomBar?: React.ReactNode
  showTopBar?: boolean
  showBottomBar?: boolean
}

/**
 * AppShellGlass - Premium glass morphism app shell
 * Sticky glass top/bottom bars with safe-area support
 * 
 * @testid shell-glass
 */
export function AppShellGlass({ 
  children, 
  className, 
  topBar, 
  bottomBar,
  showTopBar = true,
  showBottomBar = true
}: AppShellGlassProps) {
  return (
    <div 
      className={cn(
        "min-h-screen bg-background flex flex-col relative",
        className
      )}
      data-testid="shell-glass"
    >
      {/* Glass Top Bar - Safe Area Aware */}
      {showTopBar && topBar && (
        <div 
          className={cn(
            "sticky top-0 z-40",
            "bg-card/40 backdrop-blur-xl border-b border-border/40",
            "pt-[env(safe-area-inset-top)]",
            "transition-all duration-220"
          )}
          style={{
            WebkitBackdropFilter: 'blur(24px)',
            backdropFilter: 'blur(24px)'
          }}
        >
          {topBar}
        </div>
      )}
      
      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-auto relative">
        {children}
      </main>
      
      {/* Glass Bottom Bar - Safe Area Aware */}
      {showBottomBar && bottomBar && (
        <div 
          className={cn(
            "sticky bottom-0 z-40",
            "bg-card/40 backdrop-blur-xl border-t border-border/40",
            "pb-[env(safe-area-inset-bottom)]",
            "transition-all duration-220"
          )}
          style={{
            WebkitBackdropFilter: 'blur(24px)',
            backdropFilter: 'blur(24px)'
          }}
        >
          {bottomBar}
        </div>
      )}
    </div>
  )
}
