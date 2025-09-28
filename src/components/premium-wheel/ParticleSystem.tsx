import React, { useRef, useEffect, useState } from 'react'
import { useMotionSettings } from '@/hooks/useMotionSettings'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  scale: number
  life: number
  maxLife: number
  color: string
  type: 'confetti' | 'coin' | 'star'
}

interface ParticleSystemProps {
  isActive: boolean
  centerX: number
  centerY: number
  type: 'win' | 'lose'
  intensity: 'low' | 'medium' | 'high'
  onComplete?: () => void
}

const PARTICLE_SHAPES = {
  confetti: ['🎊', '🎉', '✨'],
  coin: ['🪙', '💰', '💎'],
  star: ['⭐', '🌟', '💫']
}

export function ParticleSystem({ 
  isActive, 
  centerX, 
  centerY, 
  type, 
  intensity, 
  onComplete 
}: ParticleSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const startTimeRef = useRef<number>(0)
  const { getParticleConfig, settings } = useMotionSettings()
  
  const [isWebGLSupported, setIsWebGLSupported] = useState(false)

  useEffect(() => {
    // Check WebGL support
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    setIsWebGLSupported(!!gl)
  }, [])

  useEffect(() => {
    if (!isActive || settings.reducedMotion) return

    const config = getParticleConfig()
    if (config.maxParticles === 0) return

    startTimeRef.current = performance.now()
    createParticles()
    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, centerX, centerY, type, intensity])

  const createParticles = () => {
    const config = getParticleConfig()
    const particles: Particle[] = []
    
    const particleCount = Math.min(config.maxParticles, intensity === 'high' ? 200 : intensity === 'medium' ? 100 : 50)
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const velocity = 2 + Math.random() * 4
      const life = 1000 + Math.random() * 1000
      
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - Math.random() * 2, // Slight upward bias
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        scale: 0.5 + Math.random() * 0.5,
        life,
        maxLife: life,
        color: type === 'win' ? getRandomWinColor() : getRandomLoseColor(),
        type: type === 'win' ? getRandomWinParticleType() : 'confetti'
      })
    }
    
    particlesRef.current = particles
  }

  const getRandomWinColor = () => {
    const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  const getRandomLoseColor = () => {
    const colors = ['#95A5A6', '#BDC3C7', '#7F8C8D']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  const getRandomWinParticleType = (): Particle['type'] => {
    const types: Particle['type'][] = ['confetti', 'coin', 'star']
    return types[Math.floor(Math.random() * types.length)]
  }

  const animate = () => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const now = performance.now()
    const elapsed = now - startTimeRef.current
    const deltaTime = 16 // ~60fps

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Update and draw particles
    const particles = particlesRef.current
    let activeParticles = 0

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i]
      
      // Update physics
      particle.x += particle.vx * (deltaTime / 16)
      particle.y += particle.vy * (deltaTime / 16)
      particle.vy += 0.3 // Gravity
      particle.vx *= 0.99 // Air resistance
      particle.rotation += particle.rotationSpeed
      particle.life -= deltaTime

      // Update scale based on life
      const lifeRatio = particle.life / particle.maxLife
      particle.scale = Math.max(0, lifeRatio * (0.5 + Math.random() * 0.5))

      if (particle.life <= 0) {
        particles.splice(i, 1)
        continue
      }

      activeParticles++

      // Draw particle
      ctx.save()
      ctx.translate(particle.x, particle.y)
      ctx.rotate(particle.rotation)
      ctx.scale(particle.scale, particle.scale)
      
      const alpha = Math.min(1, lifeRatio)
      ctx.globalAlpha = alpha

      if (isWebGLSupported && settings.particleQuality === 'high') {
        // Draw as colored rectangles for high quality
        ctx.fillStyle = particle.color
        ctx.fillRect(-5, -2, 10, 4)
      } else {
        // Use emoji particles for better performance and compatibility
        ctx.font = '20px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        const shapes = PARTICLE_SHAPES[particle.type]
        const shape = shapes[Math.floor(elapsed / 200) % shapes.length]
        ctx.fillText(shape, 0, 0)
      }
      
      ctx.restore()
    }

    // Continue animation if particles remain
    if (activeParticles > 0) {
      animationRef.current = requestAnimationFrame(animate)
    } else {
      onComplete?.()
    }
  }

  if (settings.reducedMotion) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="absolute inset-0 pointer-events-none"
      style={{
        mixBlendMode: type === 'win' ? 'screen' : 'multiply'
      }}
    />
  )
}