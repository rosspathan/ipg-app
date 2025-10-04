import React, { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { WheelRenderer } from './WheelRenderer'
import { ParticleSystem } from './ParticleSystem'
import { AnimationEngine, AnimationPhase } from './AnimationEngine'
import { useMotionSettings } from '@/hooks/useMotionSettings'
import { useAudioManager } from '@/hooks/useAudioManager'

interface Segment {
  id: string
  label: string
  multiplier: number
  weight: number
  color_hex: string
}

interface PremiumSpinWheelProps {
  segments: Segment[]
  isSpinning: boolean
  winningSegmentIndex?: number
  onSpinComplete?: () => void
  showParticles?: boolean
  particleType?: 'win' | 'lose'
}

export function PremiumSpinWheel({ 
  segments, 
  isSpinning, 
  winningSegmentIndex, 
  onSpinComplete,
  showParticles = false,
  particleType = 'win'
}: PremiumSpinWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<AnimationEngine | null>(null)
  const [rotation, setRotation] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<AnimationPhase | null>(null)
  const [showResultParticles, setShowResultParticles] = useState(false)
  const [wheelCenter, setWheelCenter] = useState({ x: 200, y: 200 })
  
  const { getAnimationConfig, settings } = useMotionSettings()
  const { playTick, playWin, playLose, triggerHaptic } = useAudioManager()

  // Initialize animation engine
  useEffect(() => {
    const config = getAnimationConfig()
    engineRef.current = new AnimationEngine(config.fps)
    
    return () => {
      engineRef.current?.stop()
    }
  }, [])

  // Update wheel center for particles
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setWheelCenter({ 
        x: rect.width / 2, 
        y: rect.height / 2 
      })
    }
  }, [])

  // Handle spin animation
  useEffect(() => {
    if (isSpinning && winningSegmentIndex !== undefined && engineRef.current) {
      const config = getAnimationConfig()
      
      const animation = engineRef.current.createSpinAnimation(
        winningSegmentIndex,
        segments.length,
        {
          durationRange: typeof config.duration === 'object' 
            ? config.duration 
            : { min: config.duration, max: config.duration },
          reducedMotion: settings.reducedMotion,
          weights: segments.map(s => s.weight),
          onPhaseChange: (phase) => {
            setCurrentPhase(phase)
            
            // Trigger haptic feedback on phase changes
            if (phase.name === 'ramp-up') {
              triggerHaptic('light')
            } else if (phase.name === 'settle') {
              triggerHaptic('medium')
            }
          },
          onTick: (velocity, currentRotation) => {
            setRotation(currentRotation)
            
            // Play tick sounds based on velocity
            if (currentPhase?.name === 'cruise' || currentPhase?.name === 'deceleration') {
              const normalizedVelocity = Math.min(velocity / 8, 1)
              if (Math.random() < normalizedVelocity * 0.3) {
                playTick(normalizedVelocity)
              }
            }
          },
          onComplete: () => {
            // Show result particles and play sounds
            setShowResultParticles(true)
            
            if (particleType === 'win') {
              playWin()
              triggerHaptic('heavy')
            } else {
              playLose()
              triggerHaptic('medium')
            }
            
            // Hide particles after animation
            setTimeout(() => {
              setShowResultParticles(false)
              onSpinComplete?.()
            }, 2000)
          }
        }
      )

      engineRef.current.start(animation)
    } else if (!isSpinning && engineRef.current) {
      engineRef.current.stop()
      setCurrentPhase(null)
    }
  }, [isSpinning, winningSegmentIndex, segments.length, particleType])

  // Performance monitoring
  useEffect(() => {
    if (!isSpinning || !engineRef.current) return

    const monitorPerformance = () => {
      const fps = engineRef.current?.getCurrentFPS() || 0
      
      // Auto-adjust quality if performance drops
      if (fps < 45 && settings.autoAdapt) {
        console.warn('Low FPS detected, consider reducing particle quality')
      }
    }

    const interval = setInterval(monitorPerformance, 2000)
    return () => clearInterval(interval)
  }, [isSpinning, settings.autoAdapt])

  const getTotalWeight = () => segments.reduce((sum, segment) => sum + segment.weight, 0)
  const getSegmentProbability = (weight: number) => ((weight / getTotalWeight()) * 100).toFixed(1)

  const getPhaseDescription = () => {
    if (!currentPhase) return ''
    
    const descriptions = {
      'ramp-up': 'Accelerating...',
      'cruise': 'Spinning...',
      'deceleration': 'Slowing down...',
      'settle': 'Almost there...'
    }
    
    return descriptions[currentPhase.name]
  }

  if (!segments.length) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No segments configured</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wheel Container */}
      <div className="relative flex justify-center">
        <div 
          ref={containerRef}
          className="relative"
          style={{ 
            filter: settings.reducedMotion ? 'none' : (
              isSpinning ? 'brightness(1.1) contrast(1.05)' : 'none'
            )
          }}
        >
          <WheelRenderer
            segments={segments}
            rotation={rotation}
            winningSegmentIndex={winningSegmentIndex}
            isSpinning={isSpinning}
            centerGlow={!settings.reducedMotion}
            rimGlow={!settings.reducedMotion && isSpinning}
            specularHighlight={!settings.reducedMotion}
          />
          
          {/* Particle System */}
          {(showParticles || showResultParticles) && (
            <ParticleSystem
              isActive={showParticles || showResultParticles}
              centerX={wheelCenter.x}
              centerY={wheelCenter.y}
              type={particleType}
              intensity="medium"
              onComplete={() => setShowResultParticles(false)}
            />
          )}
          
          {/* Phase Indicator */}
          {isSpinning && currentPhase && !settings.reducedMotion && (
            <div className="absolute top-full mt-2 w-full text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-xs font-medium text-primary">
                  {getPhaseDescription()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Segments Info */}
      <div className="grid grid-cols-2 gap-2">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-300 ${
              winningSegmentIndex === index 
                ? 'bg-primary/10 border-primary shadow-md scale-105' 
                : 'bg-muted/50 hover:bg-muted/70'
            }`}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: segment.color_hex }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {segment.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {getSegmentProbability(segment.weight)}% chance
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Provably Fair Badge */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Provably Fair
          </span>
        </div>
      </div>
    </div>
  )
}