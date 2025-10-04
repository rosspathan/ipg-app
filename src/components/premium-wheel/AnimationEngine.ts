export interface AnimationPhase {
  name: 'ramp-up' | 'cruise' | 'deceleration' | 'settle'
  duration: number
  startVelocity: number
  endVelocity: number
  easing: (t: number) => number
}

export interface SpinAnimation {
  phases: AnimationPhase[]
  totalDuration: number
  targetRotation: number
  onPhaseChange?: (phase: AnimationPhase) => void
  onTick?: (velocity: number, rotation: number) => void
  onComplete?: () => void
}

// Easing functions for realistic motion
export const easings = {
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  mechanical: (t: number) => {
    // Custom easing that mimics mechanical deceleration with friction
    const friction = 0.8
    return 1 - Math.pow(1 - t, 2 + friction * t)
  }
}

export class AnimationEngine {
  private animationId: number | null = null
  private startTime: number = 0
  private currentAnimation: SpinAnimation | null = null
  private accumulatedRotation: number = 0
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private targetFPS: number = 60

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS
  }

  createSpinAnimation(
    targetSegmentIndex: number,
    segmentCount: number,
    options: {
      durationRange: { min: number; max: number }
      reducedMotion: boolean
      onPhaseChange?: (phase: AnimationPhase) => void
      onTick?: (velocity: number, rotation: number) => void
      onComplete?: () => void
    }
  ): SpinAnimation {
    // Calculate target rotation - ensure pointer lands on segment CENTER
    const segmentAngle = 360 / segmentCount
    
    // Calculate the center of the target segment
    // Segments start at top (0°), so segment 0 center is at segmentAngle/2
    const segmentCenterAngle = targetSegmentIndex * segmentAngle + segmentAngle / 2
    
    // Add multiple full rotations for dramatic effect
    const baseRotations = options.reducedMotion ? 1 : 4 + Math.random() * 2
    
    // Final rotation must land exactly on segment center (round to avoid floating point errors)
    const targetRotation = Math.round((baseRotations * 360 + segmentCenterAngle) * 100) / 100
    
    if (options.reducedMotion) {
      // Simple animation for reduced motion
      return {
        phases: [{
          name: 'settle',
          duration: 500,
          startVelocity: 0,
          endVelocity: 0,
          easing: easings.easeOutQuart
        }],
        totalDuration: 500,
        targetRotation,
        onPhaseChange: options.onPhaseChange,
        onTick: options.onTick,
        onComplete: options.onComplete
      }
    }

    // Generate random duration within range
    const totalDuration = options.durationRange.min + 
      Math.random() * (options.durationRange.max - options.durationRange.min)
    
    // Phase timing ratios (should sum to 1.0)
    const rampUpRatio = 0.15    // 15% for acceleration
    const cruiseRatio = 0.35     // 35% for steady spinning
    const decelRatio = 0.45      // 45% for deceleration  
    const settleRatio = 0.05     // 5% for final settle
    
    const phases: AnimationPhase[] = [
      {
        name: 'ramp-up',
        duration: totalDuration * rampUpRatio,
        startVelocity: 0,
        endVelocity: 8, // Max velocity in rotations per second
        easing: easings.easeInQuart
      },
      {
        name: 'cruise',
        duration: totalDuration * cruiseRatio,
        startVelocity: 8,
        endVelocity: 8,
        easing: (t: number) => t // Linear
      },
      {
        name: 'deceleration',
        duration: totalDuration * decelRatio,
        startVelocity: 8,
        endVelocity: 0.2,
        easing: easings.mechanical
      },
      {
        name: 'settle',
        duration: totalDuration * settleRatio,
        startVelocity: 0.2,
        endVelocity: 0,
        easing: easings.easeOutQuart
      }
    ]

    return {
      phases,
      totalDuration,
      targetRotation,
      onPhaseChange: options.onPhaseChange,
      onTick: options.onTick,
      onComplete: options.onComplete
    }
  }

  start(animation: SpinAnimation) {
    this.stop()
    this.currentAnimation = animation
    this.startTime = performance.now()
    this.accumulatedRotation = 0
    this.lastFrameTime = this.startTime
    this.frameCount = 0
    this.animate()
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.currentAnimation = null
  }

  private animate() {
    if (!this.currentAnimation) return

    const now = performance.now()
    const elapsed = now - this.startTime
    const deltaTime = now - this.lastFrameTime
    
    // Frame rate limiting for target FPS
    const targetFrameTime = 1000 / this.targetFPS
    if (deltaTime < targetFrameTime * 0.8) {
      this.animationId = requestAnimationFrame(() => this.animate())
      return
    }

    this.lastFrameTime = now
    this.frameCount++

    // Find current phase
    let phaseStartTime = 0
    let currentPhase: AnimationPhase | null = null
    
    for (const phase of this.currentAnimation.phases) {
      if (elapsed >= phaseStartTime && elapsed < phaseStartTime + phase.duration) {
        currentPhase = phase
        break
      }
      phaseStartTime += phase.duration
    }

    if (!currentPhase) {
      // Animation complete - ensure we land EXACTLY on target
      const finalRotation = this.currentAnimation.targetRotation
      this.currentAnimation.onTick?.(0, finalRotation)
      this.currentAnimation.onComplete?.()
      this.stop()
      return
    }

    // Calculate progress within current phase
    const phaseElapsed = elapsed - phaseStartTime
    const phaseProgress = Math.min(phaseElapsed / currentPhase.duration, 1)
    const easedProgress = currentPhase.easing(phaseProgress)

    // Calculate velocity and rotation
    const velocity = currentPhase.startVelocity + 
      (currentPhase.endVelocity - currentPhase.startVelocity) * easedProgress
    
    // Update rotation based on velocity
    const rotationDelta = velocity * (deltaTime / 1000) * 360
    this.accumulatedRotation += rotationDelta

    // For the final phase, interpolate directly to target to ensure exact landing
    let currentRotation = this.accumulatedRotation
    if (currentPhase.name === 'settle') {
      const settleProgress = easedProgress
      const rotationGap = this.currentAnimation.targetRotation - this.accumulatedRotation
      currentRotation = this.accumulatedRotation + rotationGap * settleProgress
      
      // At the very end of settle phase, snap to exact target
      if (phaseProgress >= 0.99) {
        currentRotation = this.currentAnimation.targetRotation
      }
    }

    // Notify callbacks
    this.currentAnimation.onTick?.(velocity, currentRotation)
    
    // Continue animation
    this.animationId = requestAnimationFrame(() => this.animate())
  }

  getCurrentFPS(): number {
    if (this.frameCount === 0 || !this.startTime) return 0
    const elapsed = performance.now() - this.startTime
    return (this.frameCount * 1000) / elapsed
  }

  isRunning(): boolean {
    return this.animationId !== null
  }
}