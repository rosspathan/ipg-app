import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface KPIChipData {
  icon: React.ReactNode
  value: string | number
  label: string
  trend?: "up" | "down" | "neutral"
  variant?: "default" | "success" | "warning" | "danger" | "primary"
  changePercent?: string
}

interface KPIChipRowProps {
  data: KPIChipData[]
  className?: string
  compact?: boolean
}

const variantStyles = {
  default: "bg-card/60 border-border/40 text-foreground",
  primary: "bg-primary/10 border-primary/40 text-primary",
  success: "bg-success/10 border-success/40 text-success",
  warning: "bg-warning/10 border-warning/40 text-warning",
  danger: "bg-danger/10 border-danger/40 text-danger"
}

const TrendIcon = ({ trend }: { trend?: "up" | "down" | "neutral" }) => {
  if (!trend) return null
  
  const icons = {
    up: <TrendingUp className="w-3 h-3 text-success" />,
    down: <TrendingDown className="w-3 h-3 text-danger" />,
    neutral: <Minus className="w-3 h-3 text-muted-foreground" />
  }
  
  return icons[trend]
}

/**
 * KPIChipRow - Compact KPI metrics display
 * Shows 2-3 key metrics with trends
 * 
 * @testid kpi-row
 */
export function KPIChipRow({ data, className, compact = false }: KPIChipRowProps) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  return (
    <motion.div
      className={cn(
        "grid gap-3 w-full",
        data.length === 2 && "grid-cols-2",
        data.length === 3 && "grid-cols-3",
        data.length >= 4 && "grid-cols-2 sm:grid-cols-4",
        className
      )}
      data-testid="kpi-row"
      variants={!prefersReducedMotion ? containerVariants : undefined}
      initial={!prefersReducedMotion ? "hidden" : undefined}
      animate={!prefersReducedMotion ? "visible" : undefined}
    >
      {data.map((kpi, index) => (
        <motion.div
          key={index}
          className={cn(
            "flex flex-col gap-1.5 rounded-2xl border transition-all duration-220",
            "hover:scale-[1.02] active:scale-[0.98]",
            compact ? "p-3" : "p-4",
            variantStyles[kpi.variant || "default"]
          )}
          variants={!prefersReducedMotion ? itemVariants : undefined}
        >
          {/* Icon + Trend */}
          <div className="flex items-center justify-between">
            <span className="text-xl">{kpi.icon}</span>
            <TrendIcon trend={kpi.trend} />
          </div>

          {/* Value */}
          <div className={cn(
            "font-bold font-mono tabular-nums leading-none",
            compact ? "text-lg" : "text-xl"
          )}>
            {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
          </div>

          {/* Label + Change */}
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "text-xs opacity-75 line-clamp-1",
              compact && "text-[10px]"
            )}>
              {kpi.label}
            </span>
            
            {kpi.changePercent && (
              <span className={cn(
                "text-xs font-semibold tabular-nums",
                kpi.trend === "up" && "text-success",
                kpi.trend === "down" && "text-danger",
                kpi.trend === "neutral" && "text-muted-foreground"
              )}>
                {kpi.changePercent}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
