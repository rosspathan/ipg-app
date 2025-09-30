import * as React from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info" | "warning"

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastStackProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
  className?: string
  position?: "top" | "bottom"
}

const typeConfig: Record<ToastType, {
  icon: React.ReactNode
  className: string
  glowColor: string
}> = {
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    className: "bg-success/10 border-success/40 text-success",
    glowColor: "rgba(43, 214, 123, 0.3)"
  },
  error: {
    icon: <AlertCircle className="w-5 h-5" />,
    className: "bg-danger/10 border-danger/40 text-danger",
    glowColor: "rgba(255, 92, 92, 0.3)"
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    className: "bg-accent/10 border-accent/40 text-accent",
    glowColor: "rgba(0, 229, 255, 0.3)"
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    className: "bg-warning/10 border-warning/40 text-warning",
    glowColor: "rgba(247, 165, 59, 0.3)"
  }
}

/**
 * ToastStack - Compact notification system
 * Swipe-to-dismiss with type-specific glows
 * 
 * @testid toast-stack
 */
export function ToastStack({ 
  toasts, 
  onDismiss, 
  className,
  position = "bottom"
}: ToastStackProps) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  React.useEffect(() => {
    toasts.forEach(toast => {
      if (toast.duration) {
        const timer = setTimeout(() => {
          onDismiss(toast.id)
        }, toast.duration)
        return () => clearTimeout(timer)
      }
    })
  }, [toasts, onDismiss])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const toastVariants = {
    hidden: { 
      opacity: 0, 
      y: position === "bottom" ? 50 : -50,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1]
      }
    },
    exit: { 
      opacity: 0, 
      x: 100,
      scale: 0.9,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1]
      }
    }
  }

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-[var(--z-toast)] flex flex-col gap-2 px-4 pointer-events-none",
        position === "bottom" ? "bottom-20" : "top-4",
        className
      )}
      data-testid="toast-stack"
    >
      <AnimatePresence mode="sync">
        <motion.div
          className="flex flex-col gap-2"
          variants={!prefersReducedMotion ? containerVariants : undefined}
          initial={!prefersReducedMotion ? "hidden" : undefined}
          animate={!prefersReducedMotion ? "visible" : undefined}
        >
          {toasts.map(toast => {
            const config = typeConfig[toast.type]
            
            return (
              <motion.div
                key={toast.id}
                className={cn(
                  "pointer-events-auto",
                  "max-w-md mx-auto w-full",
                  "rounded-2xl border backdrop-blur-xl",
                  "p-4 shadow-elevated",
                  config.className
                )}
                variants={!prefersReducedMotion ? toastVariants : undefined}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(e, info) => {
                  if (Math.abs(info.offset.x) > 100) {
                    onDismiss(toast.id)
                  }
                }}
                style={{
                  boxShadow: `0 0 20px ${config.glowColor}`
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">
                      {toast.title}
                    </p>
                    {toast.message && (
                      <p className="text-xs mt-1 opacity-90 line-clamp-2">
                        {toast.message}
                      </p>
                    )}
                    
                    {/* Action Button */}
                    {toast.action && (
                      <button
                        onClick={toast.action.onClick}
                        className="text-xs font-semibold mt-2 underline hover:no-underline"
                      >
                        {toast.action.label}
                      </button>
                    )}
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={() => onDismiss(toast.id)}
                    className="flex-shrink-0 hover:opacity-70 transition-opacity"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Hook for managing toasts
export function useToastStack() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id, duration: toast.duration || 5000 }])
    return id
  }, [])

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    toasts,
    addToast,
    dismissToast
  }
}
