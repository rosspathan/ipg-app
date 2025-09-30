import * as React from "react"

export type MotionPreset = "flip3D" | "crossFadeMask"
export type GlowIntensity = "low" | "med" | "high"

export interface LogoMotionSettings {
  flipIntervalMs: number
  animationPreset: MotionPreset
  idleGlowIntensity: GlowIntensity
  reducedMotionForce: "auto" | "on" | "off"
  logoOrder: ["primary", "alt"] | ["alt", "primary"]
  disableAboutModal: boolean
}

export const DEFAULT_MOTION_SETTINGS: LogoMotionSettings = {
  flipIntervalMs: 5000,
  animationPreset: "flip3D",
  idleGlowIntensity: "med",
  reducedMotionForce: "auto",
  logoOrder: ["primary", "alt"],
  disableAboutModal: false
}

/**
 * LogoMotionFX - Premium animation controller for logo flipper
 * Provides 60fps animations with reduced-motion support
 */
export function useLogoMotionFX(settings: Partial<LogoMotionSettings> = {}) {
  const config = { ...DEFAULT_MOTION_SETTINGS, ...settings }
  
  const [isFlipping, setIsFlipping] = React.useState(false)
  const [glowPhase, setGlowPhase] = React.useState(0)
  const prefersReducedMotion = React.useRef(
    typeof window !== "undefined" 
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches 
      : false
  )

  // Update reduced motion preference
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches
    }
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  // Idle glow pulse animation
  React.useEffect(() => {
    let frame: number
    const animate = () => {
      setGlowPhase((prev) => (prev + 0.016) % (Math.PI * 2)) // ~60fps
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const shouldReduceMotion = React.useMemo(() => {
    if (config.reducedMotionForce === "on") return true
    if (config.reducedMotionForce === "off") return false
    return prefersReducedMotion.current
  }, [config.reducedMotionForce])

  const getGlowOpacity = React.useCallback(() => {
    const intensityMap = { low: 0.02, med: 0.04, high: 0.08 }
    const base = intensityMap[config.idleGlowIntensity]
    return base + Math.sin(glowPhase) * base
  }, [glowPhase, config.idleGlowIntensity])

  const getFlipAnimation = React.useCallback(() => {
    if (shouldReduceMotion) {
      // Reduced motion: simple 200ms fade
      return {
        animation: "fade-out 200ms ease-out forwards",
        transition: "opacity 200ms ease-out"
      }
    }

    if (config.animationPreset === "crossFadeMask") {
      return {
        animation: "fade-out 280ms ease-in-out",
        transition: "opacity 280ms ease-in-out, transform 280ms cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }

    // Default: flip3D
    return {
      animation: "none",
      transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease-in-out"
    }
  }, [shouldReduceMotion, config.animationPreset])

  const getIdleGlow = React.useCallback(() => {
    const opacity = getGlowOpacity()
    return {
      boxShadow: `
        0 0 8px hsl(var(--primary) / ${opacity}),
        0 0 16px hsl(var(--primary) / ${opacity * 0.6}),
        inset 0 0 12px hsl(var(--primary) / ${opacity * 0.3})
      `
    }
  }, [getGlowOpacity])

  const triggerFlip = React.useCallback(() => {
    setIsFlipping(true)
    setTimeout(() => setIsFlipping(false), shouldReduceMotion ? 200 : 680)
  }, [shouldReduceMotion])

  const getSuccessPulse = () => ({
    animation: "scale-in 220ms cubic-bezier(0.22, 1, 0.36, 1)",
    boxShadow: "0 0 20px hsl(var(--success) / 0.8), inset 0 0 16px hsl(var(--success) / 0.4)"
  })

  const getErrorShake = () => ({
    animation: "shake 120ms ease-in-out",
    boxShadow: "0 0 16px hsl(var(--danger) / 0.8), 0 0 2px 2px hsl(var(--danger) / 0.6)"
  })

  return {
    isFlipping,
    triggerFlip,
    getFlipAnimation,
    getIdleGlow,
    getSuccessPulse,
    getErrorShake,
    shouldReduceMotion,
    config
  }
}

// Keyframes for animations (add to global CSS if needed)
export const logoMotionKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
`
