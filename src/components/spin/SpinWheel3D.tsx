import React, { useRef, useEffect, useState } from 'react'
import { useMotionSettings } from '@/hooks/useMotionSettings'

interface Segment {
  id: string
  label: string
  multiplier: number
  weight: number
  color_hex: string
}

interface SpinWheel3DProps {
  segments: Segment[]
  isSpinning: boolean
  winningSegmentIndex?: number
  onSpinComplete?: () => void
}

export function SpinWheel3D({
  segments,
  isSpinning,
  winningSegmentIndex,
  onSpinComplete
}: SpinWheel3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const { settings } = useMotionSettings()
  const animationRef = useRef<number>()

  useEffect(() => {
    if (isSpinning && winningSegmentIndex !== undefined) {
      startSpinAnimation(winningSegmentIndex)
    } else if (!isSpinning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    // Trigger confetti for wins
    if (!isSpinning && winningSegmentIndex !== undefined) {
      const segment = segments[winningSegmentIndex]
      if (segment && segment.multiplier > 0) {
        triggerWinAnimation()
      }
    }
  }, [isSpinning, winningSegmentIndex])

  const triggerWinAnimation = () => {
    // Emit confetti particles (simple implementation)
    // In production, this could use react-confetti or similar
    if (onSpinComplete) {
      setTimeout(() => onSpinComplete(), 500)
    }
  }

  const startSpinAnimation = (targetIndex: number) => {
    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0)
    const prevWeight = segments.slice(0, targetIndex).reduce((sum, s) => sum + s.weight, 0)
    const targetWeight = segments[targetIndex].weight

    const offsetFromTop = ((prevWeight + targetWeight / 2) / totalWeight) * 360
    const targetRotation = 360 * 5 - offsetFromTop

    const startTime = Date.now()
    const duration = settings.reducedMotion ? 1000 : 3500

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Cubic bezier easing (0.1, 1, 0.3, 1)
      const t = progress
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2

      const currentRotation = eased * targetRotation
      setRotation(currentRotation)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        onSpinComplete?.()
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    drawWheel()
  }, [segments, rotation, winningSegmentIndex])

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas || !segments.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 280
    canvas.width = size * devicePixelRatio
    canvas.height = size * devicePixelRatio
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(devicePixelRatio, devicePixelRatio)

    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 35

    ctx.clearRect(0, 0, size, size)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Outer ring with LEDs
    const ledCount = 12
    for (let i = 0; i < ledCount; i++) {
      const angle = (i / ledCount) * 2 * Math.PI
      const ledX = centerX + Math.cos(angle) * (radius + 24)
      const ledY = centerY + Math.sin(angle) * (radius + 24)

      const gradient = ctx.createRadialGradient(ledX, ledY, 0, ledX, ledY, 6)
      gradient.addColorStop(0, '#FFD700')
      gradient.addColorStop(0.5, '#FFA500')
      gradient.addColorStop(1, 'rgba(255, 165, 0, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(ledX, ledY, 6, 0, 2 * Math.PI)
      ctx.fill()

      ctx.beginPath()
      ctx.arc(ledX, ledY, 4, 0, 2 * Math.PI)
      ctx.fillStyle = '#FFED4E'
      ctx.fill()
    }

    // Golden rim
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 12, 0, 2 * Math.PI)
    ctx.arc(centerX, centerY, radius + 6, 0, 2 * Math.PI, true)
    const rimGradient = ctx.createRadialGradient(centerX, centerY, radius + 6, centerX, centerY, radius + 12)
    rimGradient.addColorStop(0, '#FFD700')
    rimGradient.addColorStop(0.5, '#FFA500')
    rimGradient.addColorStop(1, '#CC8800')
    ctx.fillStyle = rimGradient
    ctx.fill('evenodd')

    // Draw segments
    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0)
    let currentAngle = -Math.PI / 2

    segments.forEach((segment, index) => {
      const segmentAngle = (segment.weight / totalWeight) * 2 * Math.PI

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
      ctx.closePath()

      // 3D depth gradient
      const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.2,
        centerX, centerY, radius
      )
      gradient.addColorStop(0, segment.color_hex)
      gradient.addColorStop(0.7, segment.color_hex)
      gradient.addColorStop(1, adjustBrightness(segment.color_hex, -30))
      ctx.fillStyle = gradient
      ctx.fill()

      // Winning glow
      if (winningSegmentIndex === index && !isSpinning) {
        ctx.shadowColor = segment.color_hex
        ctx.shadowBlur = 20
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Text
      const textAngle = currentAngle + segmentAngle / 2
      const textRadius = radius * 0.65
      const textX = centerX + Math.cos(textAngle) * textRadius
      const textY = centerY + Math.sin(textAngle) * textRadius

      ctx.save()
      ctx.translate(textX, textY)
      ctx.rotate(textAngle + Math.PI / 2)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 13px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 3
      ctx.fillText(segment.label, 0, 0)
      ctx.restore()

      currentAngle += segmentAngle
    })

    // Center hub
    const hubGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 35)
    hubGradient.addColorStop(0, '#2a2a2a')
    hubGradient.addColorStop(1, '#0a0a0a')
    ctx.fillStyle = hubGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 35, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 3
    ctx.stroke()

    // Center cross
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(centerX - 15, centerY)
    ctx.lineTo(centerX + 15, centerY)
    ctx.moveTo(centerX, centerY - 15)
    ctx.lineTo(centerX, centerY + 15)
    ctx.stroke()
  }

  const adjustBrightness = (hex: string, amount: number) => {
    const rgb = parseInt(hex.slice(1), 16)
    const r = Math.max(0, Math.min(255, ((rgb >> 16) & 0xff) + amount))
    const g = Math.max(0, Math.min(255, ((rgb >> 8) & 0xff) + amount))
    const b = Math.max(0, Math.min(255, (rgb & 0xff) + amount))
    return `rgb(${r}, ${g}, ${b})`
  }

  return (
    <div
      data-testid="spin-wheel"
      className="relative flex justify-center items-center py-4"
      role="img"
      aria-label={isSpinning ? "Spinning wheel" : "Spin wheel ready"}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full opacity-30 blur-2xl"
        style={{
          background: 'radial-gradient(circle, rgba(124, 77, 255, 0.3), transparent 70%)'
        }}
      />

      <div
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: settings.reducedMotion ? 'transform 1s ease-out' : 'none',
          willChange: isSpinning ? 'transform' : 'auto'
        }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* Static pointer */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <defs>
          <linearGradient id="pointerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#CC8800" />
            <stop offset="50%" stopColor="#FFED4E" />
            <stop offset="100%" stopColor="#CC8800" />
          </linearGradient>
        </defs>
        <polygon
          points="20,36 5,5 35,5"
          fill="url(#pointerGrad)"
          stroke="#FFA500"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}
