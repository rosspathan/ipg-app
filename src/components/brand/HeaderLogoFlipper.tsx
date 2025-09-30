import * as React from "react"
import { motion as Motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LogoCropper } from "./LogoCropper"
import { useLogoMotionFX, LogoMotionSettings } from "@/hooks/useLogoMotionFX"
import logoPrimary from "../../../brand/input/logo_primary.jpg"
import logoAlt from "../../../brand/input/logo_alt.jpg"

interface HeaderLogoFlipperProps {
  size?: "sm" | "md" | "lg"
  settings?: Partial<LogoMotionSettings>
  onRefresh?: boolean
  onSuccess?: boolean
  onError?: boolean
  className?: string
}

/**
 * HeaderLogoFlipper - Premium alternating logo component
 * 
 * Features:
 * - Auto-flips between two logos every 5s with world-class 3D motion
 * - 36×36px circular container with brand purple glow
 * - 60fps GPU-accelerated animations
 * - Reduced-motion support (200ms fade fallback)
 * - Click opens About modal
 * - Fully utilizes circular space via LogoCropper
 */
export function HeaderLogoFlipper({
  size = "md",
  settings,
  onRefresh = false,
  onSuccess = false,
  onError = false,
  className = ""
}: HeaderLogoFlipperProps) {
  const [showAbout, setShowAbout] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const intervalRef = React.useRef<NodeJS.Timeout>()
  
  const motion = useLogoMotionFX(settings)
  
  const sizeMap = {
    sm: { container: 32, logo: 28 },
    md: { container: 36, logo: 32 },
    lg: { container: 44, logo: 40 }
  }
  const dimensions = sizeMap[size]

  const logos = React.useMemo(() => {
    const order = motion.config.logoOrder
    return order[0] === "primary" 
      ? [logoPrimary, logoAlt]
      : [logoAlt, logoPrimary]
  }, [motion.config.logoOrder])

  const currentLogo = logos[activeIndex]
  const logoLabel = activeIndex === 0 ? "primary" : "alt"

  // Auto-flip interval
  React.useEffect(() => {
    intervalRef.current = setInterval(() => {
      motion.triggerFlip()
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % logos.length)
      }, motion.shouldReduceMotion ? 100 : 150) // Swap at 90° (hidden phase)
    }, motion.config.flipIntervalMs)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [motion.config.flipIntervalMs, motion.shouldReduceMotion, logos.length, motion])

  // Handle external state changes
  React.useEffect(() => {
    if (onRefresh || onSuccess || onError) {
      motion.triggerFlip()
    }
  }, [onRefresh, onSuccess, onError, motion])

  const handleClick = () => {
    if (!motion.config.disableAboutModal) {
      setShowAbout(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleClick()
    }
  }

  // Animation variants for flip
  const flipVariants = {
    initial: {
      rotateY: motion.shouldReduceMotion ? 0 : -90,
      opacity: motion.shouldReduceMotion ? 0 : 0.6,
      scale: 1
    },
    animate: {
      rotateY: 0,
      opacity: 1,
      scale: [1, 1.02, 1],
      transition: {
        rotateY: { duration: motion.shouldReduceMotion ? 0.2 : 0.18, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: motion.shouldReduceMotion ? 0.2 : 0.18 },
        scale: { duration: 0.12, delay: motion.shouldReduceMotion ? 0 : 0.18, times: [0, 0.5, 1] }
      }
    },
    exit: {
      rotateY: motion.shouldReduceMotion ? 0 : 90,
      opacity: motion.shouldReduceMotion ? 0 : 0.6,
      transition: {
        duration: motion.shouldReduceMotion ? 0.2 : 0.12,
        ease: "easeIn"
      }
    }
  }

  // Dynamic styles based on state
  const getContainerStyle = () => {
    if (onSuccess) return motion.getSuccessPulse()
    if (onError) return motion.getErrorShake()
    return motion.getIdleGlow()
  }

  return (
    <>
      <Motion.button
        data-testid="header-logo-flipper"
        className={`
          relative rounded-full overflow-hidden
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
          cursor-pointer transition-all duration-[120ms]
          hover:scale-105 active:scale-95
          ${className}
        `}
        style={{
          width: dimensions.container,
          height: dimensions.container,
          perspective: "1000px",
          transformStyle: "preserve-3d",
          ...getContainerStyle()
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label={`IPG I-SMART logo — ${logoLabel}`}
        whileTap={{ scale: 0.95 }}
      >
        {/* Inner glow ring */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: "2px solid hsl(var(--primary) / 0.3)",
            boxShadow: "inset 0 0 8px hsl(var(--primary) / 0.2)"
          }}
        />

        {/* Logo container with AnimatePresence for smooth transitions */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            width: dimensions.logo,
            height: dimensions.logo,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)"
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <Motion.div
              key={activeIndex}
              variants={flipVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{
                width: "100%",
                height: "100%",
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden"
              }}
            >
              <LogoCropper
                src={currentLogo}
                alt={`IPG I-SMART Logo ${logoLabel}`}
                className="w-full h-full"
              />
            </Motion.div>
          </AnimatePresence>
        </div>

        {/* Specular light sweep overlay (during flip) */}
        {motion.isFlipping && !motion.shouldReduceMotion && (
          <Motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.4) 50%, transparent 100%)", x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        )}
      </Motion.button>

      {/* About Modal */}
      {!motion.config.disableAboutModal && (
        <Dialog open={showAbout} onOpenChange={setShowAbout}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-card border-2 border-primary/20">
                  <img
                    src={logoPrimary}
                    alt="IPG I-SMART Logo"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                About IPG I-Smart Exchange
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                World's No.1 trusted crypto exchange
              </p>

              <div className="space-y-2">
                <h4 className="font-semibold">Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Secure Web3 wallet with BIP39 recovery</li>
                  <li>• Multi-level BSK rewards ecosystem</li>
                  <li>• Real-time trading with live market data</li>
                  <li>• Insurance and loan programs</li>
                  <li>• World-class motion design & UX</li>
                </ul>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Version 1.0.0 • Built with Lovable • Premium Logo System Active
                </p>
              </div>

              <Button onClick={() => setShowAbout(false)} className="w-full">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
