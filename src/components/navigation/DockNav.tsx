import * as React from "react"
import { createPortal } from "react-dom"
import { Home, Wallet, TrendingUp, Grid3x3, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocation } from "react-router-dom"
import { LogoDockButton } from "./LogoDockButton"

interface DockNavProps {
  onNavigate?: (path: string) => void
  onCenterPress?: () => void
  className?: string
}

const navItems = [
  { id: "home", label: "Home", icon: Home, path: "/app/home" },
  { id: "wallet", label: "Wallet", icon: Wallet, path: "/app/wallet" },
  { id: "center", label: "Quick", icon: null, path: null }, // Center button placeholder
  { id: "programs", label: "Programs", icon: Grid3x3, path: "/app/programs" },
  { id: "profile", label: "Profile", icon: User, path: "/app/profile" }
]

/**
 * DockNav - Sticky bottom glass dock with center LogoDockButton
 * Purple Nova DS - glass morphism, neon underlines, breathing glow
 */
export function DockNav({ onNavigate, onCenterPress, className }: DockNavProps) {
  const location = useLocation()
  
  // Setup portal root for fixed dock; create if missing
  const navRef = React.useRef<HTMLDivElement | null>(null)
  const [portalRootEl, setPortalRootEl] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (typeof document === 'undefined') return
    let root = document.getElementById('dock-portal') as HTMLElement | null
    if (!root) {
      root = document.createElement('div')
      root.id = 'dock-portal'
      document.body.appendChild(root)
    }
    setPortalRootEl(root)
  }, [])


  const isActive = (path: string | null) => {
    if (!path) return false
    return location.pathname === path || location.pathname.startsWith(path + "/")
  }

  const handleNavClick = (path: string | null) => {
    if (path && onNavigate) {
      onNavigate(path)
    }
  }

  const handleCenterPress = () => {
    onCenterPress?.()
  }

  const portalRoot = portalRootEl

  // Console marker to help debug safe area on device builds
  React.useEffect(() => {
    console.debug("SAFE_AREA_APPLIED")
  }, [])

  const navEl = (
    <nav
      ref={navRef}
      className={cn(
        "fixed bottom-0 inset-x-0 w-full max-w-[430px] mx-auto z-50",
        className
      )}
      style={{
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
      }}
      data-testid="dock-nav"
    >
      {/* Background with curved cutout for center button */}
      <div className="relative">
        {/* Main nav bar with notch */}
        <div 
          className={cn(
            "relative bg-card/95 backdrop-blur-2xl border-t border-border/40",
            "transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          )}
          style={{
            WebkitBackdropFilter: 'blur(32px)',
            backdropFilter: 'blur(32px)',
            boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Curved notch cutout using SVG mask */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-24 h-12 overflow-visible">
            <svg 
              width="96" 
              height="48" 
              viewBox="0 0 96 48" 
              className="w-full h-full"
              style={{ filter: 'drop-shadow(0 -2px 8px rgba(124, 77, 255, 0.3))' }}
            >
              <path
                d="M 0,48 Q 0,20 24,8 Q 48,0 48,0 Q 48,0 72,8 Q 96,20 96,48 Z"
                fill="hsl(var(--card) / 0.95)"
                stroke="hsl(var(--border) / 0.4)"
                strokeWidth="1"
              />
            </svg>
          </div>

          <div className="flex items-center justify-around px-1 pt-2 pb-1.5 relative">
            {navItems.map((item, index) => {
              if (item.id === "center") {
                return (
                  <div key={item.id} className="flex items-center justify-center relative" style={{ flex: '0 0 96px' }}>
                    {/* Spacer for center button - it floats above */}
                  </div>
                )
              }

              const Icon = item.icon!
              const active = isActive(item.path)

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl",
                    "transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50",
                    "hover:bg-primary/10",
                    "relative",
                    active && "text-primary",
                    !active && "text-muted-foreground hover:text-foreground",
                    index < 2 ? "mr-auto" : "ml-auto" // Push items away from center
                  )}
                  style={{ minWidth: '64px' }}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-[120ms]",
                    active && "scale-110"
                  )} />
                  
                  <span className={cn(
                    "text-[9px] font-medium transition-all duration-[120ms]",
                    "font-[Inter,sans-serif]",
                    active && "font-semibold"
                  )}>
                    {item.label}
                  </span>

                  {/* Active indicator */}
                  {active && (
                    <div 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-gradient-to-r from-primary to-accent rounded-full"
                      style={{
                        boxShadow: '0 0 8px hsl(var(--primary))'
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Floating center button - positioned absolutely above the nav */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <LogoDockButton onClick={handleCenterPress} />
        </div>
      </div>

    </nav>
  )

  return (
    <>
      {portalRoot ? createPortal(navEl, portalRoot) : navEl}
    </>
  )
}
