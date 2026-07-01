import * as React from "react"
import { Home, Wallet, TrendingUp, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocation } from "react-router-dom"
import { useNavigation } from "@/hooks/useNavigation"
import ismartCoinLogo from "@/assets/ipg-coin-center.jpeg.asset.json"

const navItems = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    route: "/app"
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: Wallet,
    route: "/app/wallet"
  },
  {
    id: "trading",
    label: "Trading",
    icon: TrendingUp,
    route: "/app/trade"
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
    route: "/app/profile"
  }
]

export function BottomNavBar() {
  const location = useLocation()
  const { navigate } = useNavigation()

  const isActive = (route: string) => {
    if (route === "/app") {
      return location.pathname === "/app" || location.pathname === "/app/"
    }
    return location.pathname.startsWith(route)
  }

  // Split nav items around the center logo: Home | Wallet | [Logo] | Trading | Profile
  const leftItems = navItems.slice(0, 2)
  const rightItems = navItems.slice(2)

  const renderItem = (item: typeof navItems[number]) => {
    const Icon = item.icon
    const active = isActive(item.route)

    return (
      <button
        key={item.id}
        onClick={() => navigate(item.route)}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors duration-300",
          active ? "text-accent" : "text-muted-foreground hover:text-foreground/80"
        )}
      >
        <Icon
          className={cn(
            "h-[22px] w-[22px] transition-all duration-300",
            active && "drop-shadow-[0_0_8px_hsl(var(--accent)/0.6)]"
          )}
        />
        <span className="text-[10px] font-medium tracking-wide">
          {item.label}
        </span>
        {active && (
          <span className="absolute -top-0.5 h-1 w-1 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.9)]" />
        )}
      </button>
    )
  }

  return (
    <nav
      className="mobile-fixed z-50"
      style={{
        bottom: "var(--bso)",
        height: "var(--dock-h)"
      }}
    >
      {/* Glass footer surface */}
      <div className="absolute inset-0 border-t border-white/[0.07] bg-[hsl(var(--card)/0.85)] backdrop-blur-xl">
        {/* Ambient blue + green glow line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      <div
        className="relative h-full flex items-stretch"
        style={{
          paddingLeft: "var(--bsl)",
          paddingRight: "var(--bsr)",
          paddingBottom: "6px",
          paddingTop: "6px"
        }}
      >
        <div className="flex flex-1 items-stretch">
          {leftItems.map(renderItem)}
        </div>

        {/* Center floating logo */}
        <div className="relative flex w-[72px] shrink-0 items-end justify-center">
          <button
            onClick={() => navigate("/app")}
            aria-label="Home"
            className="absolute -top-7 flex items-center justify-center"
          >
            {/* Soft blue + green glow */}
            <span className="pointer-events-none absolute inset-0 -m-2 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.55),transparent_70%)] blur-md animate-pulse" />
            <span className="pointer-events-none absolute inset-0 -m-1 rounded-full bg-[radial-gradient(circle,hsl(var(--secondary)/0.45),transparent_70%)] blur-md" />
            {/* Shining rotating circumference */}
            <span
              className="pointer-events-none absolute -inset-[3px] rounded-full motion-safe:animate-spin"
              style={{
                animationDuration: "3s",
                background:
                  "conic-gradient(from 0deg, transparent 0deg, hsl(var(--accent)) 70deg, hsl(var(--secondary)) 130deg, transparent 200deg, transparent 360deg)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))"
              }}
            />
            <span className="pointer-events-none absolute -inset-[3px] rounded-full shadow-[0_0_16px_2px_hsl(var(--accent)/0.6)]" />
            {/* Glass ring */}
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-[hsl(var(--card)/0.6)] p-[3px] backdrop-blur-xl shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.5)]">
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-transparent to-secondary/30" />
              <img
                src={ismartCoinLogo.url}
                alt="BSK Coin"
                className="relative h-full w-full rounded-full object-cover"
                draggable={false}
              />
            </span>
          </button>
        </div>

        <div className="flex flex-1 items-stretch">
          {rightItems.map(renderItem)}
        </div>
      </div>
    </nav>
  )
}
