import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { 
  Home, Wallet, TrendingUp, Grid3x3, User, 
  Repeat, Send, ArrowDownToLine, ArrowUpFromLine,
  Gift, Shield, Sparkles, Users, Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface QuickSwitchMenuItem {
  id: string
  label: string
  icon: React.ElementType
  path: string
  color: string
}

const mainActions: QuickSwitchMenuItem[] = [
  { id: "home", label: "Home", icon: Home, path: "/app/home", color: "text-primary" },
  { id: "wallet", label: "Wallet", icon: Wallet, path: "/app/wallet", color: "text-accent" },
  { id: "trade", label: "Trade", icon: TrendingUp, path: "/app/trade", color: "text-success" },
  { id: "programs", label: "Programs", icon: Grid3x3, path: "/app/programs", color: "text-secondary" },
  { id: "profile", label: "Profile", icon: User, path: "/app/profile", color: "text-muted-foreground" }
]

const quickActions: QuickSwitchMenuItem[] = [
  { id: "send", label: "Send", icon: Send, path: "/app/wallet?action=send", color: "text-primary" },
  { id: "receive", label: "Receive", icon: ArrowDownToLine, path: "/app/wallet?action=receive", color: "text-accent" },
  { id: "deposit", label: "Deposit", icon: ArrowUpFromLine, path: "/app/wallet?action=deposit", color: "text-success" },
  { id: "swap", label: "Swap", icon: Repeat, path: "/app/wallet?action=swap", color: "text-secondary" }
]

const programShortcuts: QuickSwitchMenuItem[] = [
  { id: "insurance", label: "Insurance", icon: Shield, path: "/app/programs/insurance", color: "text-primary" },
  { id: "spin", label: "Spin Wheel", icon: Sparkles, path: "/app/programs/spin", color: "text-accent" },
  { id: "referrals", label: "Referrals", icon: Users, path: "/app/programs/referrals", color: "text-success" },
  
]

interface QuickSwitchMenuProps {
  isOpen: boolean
  onClose: () => void
  triggerPosition?: { x: number; y: number }
}

/**
 * QuickSwitchMenu - Radial menu for fast navigation
 * Triggered by LogoDockButton press
 * Features:
 * - Radial layout with 3 rings (main nav, quick actions, programs)
 * - Smooth spring animations
 * - Click-to-navigate, auto-closes on selection
 * - Glass morphism with purple glow
 */
export function QuickSwitchMenu({ isOpen, onClose, triggerPosition }: QuickSwitchMenuProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleItemClick = (path: string) => {
    navigate(path)
    onClose()
  }

  const isActive = (path: string) => {
    const basePath = path.split("?")[0]
    return location.pathname === basePath || location.pathname.startsWith(basePath + "/")
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[45]"
            onClick={onClose}
          />

          {/* Radial Menu */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
            style={{
              width: '320px',
              height: '320px'
            }}
          >
            {/* Center Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl flex items-center justify-center">
              <Gift className="h-8 w-8 text-primary-foreground animate-pulse" />
            </div>

            {/* Ring 1: Main Navigation */}
            {mainActions.map((item, index) => {
              const angle = (index * 360) / mainActions.length - 90
              const radius = 100
              const x = Math.cos((angle * Math.PI) / 180) * radius
              const y = Math.sin((angle * Math.PI) / 180) * radius

              return (
                <motion.button
                  key={item.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.03, type: "spring", stiffness: 300 }}
                  onClick={() => handleItemClick(item.path)}
                  className={cn(
                    "absolute top-1/2 left-1/2 w-16 h-16 rounded-full",
                    "bg-card/90 backdrop-blur-xl border-2 border-border/50",
                    "flex flex-col items-center justify-center gap-0.5",
                    "shadow-lg transition-all duration-200",
                    "hover:scale-110 hover:shadow-2xl hover:border-primary",
                    isActive(item.path) && "border-primary bg-primary/10"
                  )}
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                  }}
                >
                  <item.icon className={cn("h-5 w-5", item.color)} />
                  <span className="text-[9px] font-medium">{item.label}</span>
                </motion.button>
              )
            })}

            {/* Ring 2: Quick Actions */}
            {quickActions.map((item, index) => {
              const angle = (index * 360) / quickActions.length - 45
              const radius = 140
              const x = Math.cos((angle * Math.PI) / 180) * radius
              const y = Math.sin((angle * Math.PI) / 180) * radius

              return (
                <motion.button
                  key={item.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.03 + 0.15, type: "spring", stiffness: 300 }}
                  onClick={() => handleItemClick(item.path)}
                  className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full bg-card/80 backdrop-blur-xl border border-border/50 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-xl transition-all duration-200"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                  }}
                >
                  <item.icon className={cn("h-4 w-4", item.color)} />
                </motion.button>
              )
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
