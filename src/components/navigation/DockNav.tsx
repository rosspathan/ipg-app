import * as React from "react"
import { createPortal } from "react-dom"
import { Home, Wallet, Coins, Gift, TrendingUp, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocation } from "react-router-dom"

interface DockNavProps {
  onNavigate?: (path: string) => void
  onCenterPress?: () => void
  className?: string
}

const navItems = [
  { id: "home", label: "Home", icon: Home, path: "/app/home" },
  { id: "wallet", label: "Wallet", icon: Wallet, path: "/app/wallet" },
  { id: "staking", label: "Staking", icon: Coins, path: "/app/staking" },
  { id: "programs", label: "Programs", icon: Gift, path: "/app/programs" },
  { id: "trading", label: "Trading", icon: TrendingUp, path: "/app/trade" },
  { id: "profile", label: "Profile", icon: User, path: "/app/profile" }
]

/**
 * DockNav - Sticky bottom glass dock with center LogoDockButton
 * Purple Nova DS - glass morphism, neon underlines, breathing glow
 */
export function DockNav({ onNavigate, onCenterPress, className }: DockNavProps) {
  const location = useLocation()
  
  // Measure nav height to create an accurate spacer and avoid overlap on APK/WebView
  const navRef = React.useRef<HTMLDivElement | null>(null)
  const [spacerHeight, setSpacerHeight] = React.useState<number>(96)

  React.useLayoutEffect(() => {
    const update = () => {
      const h = navRef.current?.offsetHeight ?? 96
      setSpacerHeight(h)
    }
    // initial + on resize
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
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

  const portalRoot = typeof document !== "undefined" ? document.getElementById("dock-portal") : null

  // Console marker to help debug safe area on device builds
  React.useEffect(() => {
    console.debug("SAFE_AREA_APPLIED")
  }, [])

  const navEl = (
    <nav
      ref={navRef}
      className={cn(
        "fixed left-0 right-0 max-w-[430px] mx-auto z-50",
        className
      )}
      style={{
        bottom: 'var(--bso)'
      }}
      data-testid="dock-nav"
      id="qa-bottom-dock"
    >
      {/* Background with curved cutout for center button */}
      <div className="relative">
        {/* Main nav bar */}
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
          <div 
            className="flex items-center justify-around relative"
            style={{
              paddingLeft: 'var(--bsl)',
              paddingRight: 'var(--bsr)',
              paddingTop: '8px',
              paddingBottom: '6px'
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg",
                    "transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50",
                    "hover:bg-primary/10",
                    "relative flex-1",
                    active && "text-primary",
                    !active && "text-muted-foreground hover:text-foreground"
                  )}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-all duration-[120ms]",
                    active && "scale-110"
                  )} />
                  
                  <span className={cn(
                    "text-[8px] font-medium transition-all duration-[120ms]",
                    "font-[Inter,sans-serif]",
                    active && "font-semibold"
                  )}>
                    {item.label}
                  </span>

                  {/* Active indicator */}
                  {active && (
                    <div 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 bg-gradient-to-r from-primary to-accent rounded-full"
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
      </div>

    </nav>
  )

  return portalRoot ? createPortal(navEl, portalRoot) : navEl
}
