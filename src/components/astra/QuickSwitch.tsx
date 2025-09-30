import * as React from "react"
import { ArrowDownUp, ArrowUpRight, TrendingUp, Grid3x3, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface QuickSwitchProps {
  isOpen: boolean
  onClose: () => void
  onAction: (action: string) => void
  className?: string
}

const quickActions = [
  { id: "deposit", label: "Deposit", icon: ArrowDownUp, color: "text-success" },
  { id: "convert", label: "Convert", icon: ArrowUpRight, color: "text-accent" },
  { id: "trade", label: "Trade", icon: TrendingUp, color: "text-warning" },
  { id: "programs", label: "Programs", icon: Grid3x3, color: "text-primary" }
]

/**
 * QuickSwitch - Radial menu from center LogoDockButton
 * Purple Nova DS - springs in 220ms with radial layout
 */
export function QuickSwitch({ isOpen, onClose, onAction, className }: QuickSwitchProps) {
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  const handleAction = (actionId: string) => {
    onAction(actionId)
    onClose()
  }

  const radius = 90
  const angleStep = 360 / quickActions.length

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Radial Menu */}
          <div
            className={cn(
              "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
              "w-64 h-64 flex items-center justify-center",
              className
            )}
            data-testid="quick-switch"
          >
            {quickActions.map((action, index) => {
              const angle = (angleStep * index - 90) * (Math.PI / 180)
              const x = Math.cos(angle) * radius
              const y = Math.sin(angle) * radius

              const Icon = action.icon

              return (
                <motion.button
                  key={action.id}
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, x, y }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0, x: 0, y: 0 }}
                  transition={{
                    duration: 0.22,
                    delay: index * 0.05,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  onClick={() => handleAction(action.id)}
                  className={cn(
                    "absolute w-14 h-14 rounded-full",
                    "bg-card/90 backdrop-blur-xl border border-border/40",
                    "flex flex-col items-center justify-center gap-1",
                    "shadow-2xl hover:scale-110 active:scale-95",
                    "transition-transform duration-[120ms]",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                  )}
                  style={{
                    boxShadow: '0 8px 24px rgba(124, 77, 255, 0.3)'
                  }}
                  aria-label={action.label}
                >
                  <Icon className={cn("h-5 w-5", action.color)} />
                  <span className="text-[8px] font-medium text-foreground">
                    {action.label}
                  </span>
                </motion.button>
              )
            })}

            {/* Close button in center */}
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.22, delay: 0.1 }}
              onClick={onClose}
              className={cn(
                "absolute w-12 h-12 rounded-full",
                "bg-danger/20 backdrop-blur-xl border border-danger/40",
                "flex items-center justify-center",
                "hover:bg-danger/30 active:scale-95",
                "transition-all duration-[120ms]",
                "focus:outline-none focus:ring-2 focus:ring-danger/50"
              )}
              aria-label="Close"
            >
              <X className="h-5 w-5 text-danger" />
            </motion.button>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
