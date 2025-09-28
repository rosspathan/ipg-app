import { useState, useRef, useCallback } from 'react'
import { AnimationEngine } from '@/components/premium-wheel/AnimationEngine'
import { useMotionSettings } from './useMotionSettings'
import { useAudioManager } from './useAudioManager'

export interface AnimationState {
  phase: 'idle' | 'ramp-up' | 'cruise' | 'deceleration' | 'settle' | 'complete'
  rotation: number
  velocity: number
  fps: number
}

export interface SpinResult {
  segmentIndex: number
  isWin: boolean
  multiplier: number
}

export function usePremiumAnimation() {
  const [animationState, setAnimationState] = useState<AnimationState>({
    phase: 'idle',
    rotation: 0,
    velocity: 0,
    fps: 0
  })
  
  const engineRef = useRef<AnimationEngine | null>(null)
  const { getAnimationConfig, settings } = useMotionSettings()
  const { playTick, playWin, playLose, triggerHaptic } = useAudioManager()
  
  const startSpin = useCallback((
    winningSegmentIndex: number,
    segmentCount: number,
    onComplete?: (result: SpinResult) => void
  ) => {
    if (!engineRef.current) {
      const config = getAnimationConfig()
      engineRef.current = new AnimationEngine(config.fps)
    }

    const config = getAnimationConfig()
    
    const animation = engineRef.current.createSpinAnimation(
      winningSegmentIndex,
      segmentCount,
      {
        durationRange: typeof config.duration === 'object' 
          ? config.duration 
          : { min: config.duration, max: config.duration },
        reducedMotion: settings.reducedMotion,
        onPhaseChange: (phase) => {
          setAnimationState(prev => ({ ...prev, phase: phase.name }))
          
          // Haptic feedback for phase transitions
          if (phase.name === 'ramp-up') {
            triggerHaptic('light')
          } else if (phase.name === 'settle') {
            triggerHaptic('medium')
          }
        },
        onTick: (velocity, rotation) => {
          const fps = engineRef.current?.getCurrentFPS() || 0
          
          setAnimationState(prev => ({
            ...prev,
            rotation,
            velocity,
            fps
          }))
          
          // Audio feedback based on phase and velocity
          const currentPhase = animationState.phase
          if ((currentPhase === 'cruise' || currentPhase === 'deceleration') && velocity > 1) {
            const normalizedVelocity = Math.min(velocity / 8, 1)
            if (Math.random() < normalizedVelocity * 0.15) { // Reduced frequency
              playTick(normalizedVelocity)
            }
          }
        },
        onComplete: () => {
          setAnimationState(prev => ({ ...prev, phase: 'complete' }))
          
          // Determine if this is a win (you'll need to pass the multiplier data)
          // This is a placeholder - replace with actual win/lose logic
          const isWin = Math.random() > 0.5 // Replace with actual logic
          const multiplier = isWin ? 2 : 0 // Replace with actual multiplier
          
          if (isWin) {
            playWin()
            triggerHaptic('heavy')
          } else {
            playLose()
            triggerHaptic('medium')
          }
          
          onComplete?.({
            segmentIndex: winningSegmentIndex,
            isWin,
            multiplier
          })
        }
      }
    )

    setAnimationState(prev => ({ ...prev, phase: 'ramp-up' }))
    engineRef.current.start(animation)
  }, [settings.reducedMotion, animationState.phase, playTick, playWin, playLose, triggerHaptic])

  const stopSpin = useCallback(() => {
    engineRef.current?.stop()
    setAnimationState({
      phase: 'idle',
      rotation: 0,
      velocity: 0,
      fps: 0
    })
  }, [])

  const isSpinning = useCallback(() => {
    return animationState.phase !== 'idle' && animationState.phase !== 'complete'
  }, [animationState.phase])

  const getPerformanceMetrics = useCallback(() => {
    return {
      fps: animationState.fps,
      isRunning: engineRef.current?.isRunning() || false,
      phase: animationState.phase,
      velocity: animationState.velocity
    }
  }, [animationState])

  return {
    animationState,
    startSpin,
    stopSpin,
    isSpinning: isSpinning(),
    getPerformanceMetrics
  }
}