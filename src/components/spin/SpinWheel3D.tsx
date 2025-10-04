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
    console.log('SpinWheel3D segments:', segments?.length, segments?.map(s => s.label))
    console.log('SpinWheel3D drawWheel called - about to draw wheel with segments:', segments)
    drawWheel()
  }, [segments, rotation, winningSegmentIndex])

  const drawWheel = () => {
    console.log('🎯 DRAWING WHEEL START - segments:', segments?.length)
    const canvas = canvasRef.current
    if (!canvas || !segments.length) {
      console.log('❌ Cannot draw wheel - canvas or segments missing:', { canvas: !!canvas, segmentsLength: segments?.length })
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.log('❌ Cannot get canvas context')
      return
    }

    console.log('✅ Drawing wheel with segments:', segments.map(s => s.label))

    const size = 320
    canvas.width = size * devicePixelRatio
    canvas.height = size * devicePixelRatio
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(devicePixelRatio, devicePixelRatio)

    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 50

    ctx.clearRect(0, 0, size, size)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Outer glow for premium effect
    const outerGlow = ctx.createRadialGradient(centerX, centerY, radius + 30, centerX, centerY, radius + 45)
    outerGlow.addColorStop(0, 'rgba(255, 215, 0, 0.3)')
    outerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)')
    ctx.fillStyle = outerGlow
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 45, 0, 2 * Math.PI)
    ctx.fill()

    // Outer LED ring with glowing lights
    const ledCount = 16
    for (let i = 0; i < ledCount; i++) {
      const angle = (i / ledCount) * 2 * Math.PI
      const ledX = centerX + Math.cos(angle) * (radius + 32)
      const ledY = centerY + Math.sin(angle) * (radius + 32)

      // LED glow
      const glowGradient = ctx.createRadialGradient(ledX, ledY, 0, ledX, ledY, 10)
      glowGradient.addColorStop(0, 'rgba(255, 237, 78, 1)')
      glowGradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.8)')
      glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)')
      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(ledX, ledY, 10, 0, 2 * Math.PI)
      ctx.fill()

      // LED core
      const ledGradient = ctx.createRadialGradient(ledX, ledY - 1, 0, ledX, ledY, 5)
      ledGradient.addColorStop(0, '#FFF8DC')
      ledGradient.addColorStop(0.5, '#FFED4E')
      ledGradient.addColorStop(1, '#FFD700')
      ctx.fillStyle = ledGradient
      ctx.beginPath()
      ctx.arc(ledX, ledY, 5, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Multi-layered golden rim for 3D effect
    // Outer rim
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 22, 0, 2 * Math.PI)
    ctx.arc(centerX, centerY, radius + 15, 0, 2 * Math.PI, true)
    const outerRimGradient = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius)
    outerRimGradient.addColorStop(0, '#B8860B')
    outerRimGradient.addColorStop(0.3, '#FFD700')
    outerRimGradient.addColorStop(0.5, '#FFF8DC')
    outerRimGradient.addColorStop(0.7, '#FFD700')
    outerRimGradient.addColorStop(1, '#B8860B')
    ctx.fillStyle = outerRimGradient
    ctx.fill('evenodd')

    // Middle rim with shadow
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 15, 0, 2 * Math.PI)
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI, true)
    const middleRimGradient = ctx.createLinearGradient(centerX, centerY - radius, centerX, centerY + radius)
    middleRimGradient.addColorStop(0, '#8B7500')
    middleRimGradient.addColorStop(0.5, '#DAA520')
    middleRimGradient.addColorStop(1, '#8B7500')
    ctx.fillStyle = middleRimGradient
    ctx.fill('evenodd')

    // Inner golden border
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI)
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI, true)
    const innerRimGradient = ctx.createRadialGradient(centerX, centerY, radius + 5, centerX, centerY, radius + 10)
    innerRimGradient.addColorStop(0, '#FFD700')
    innerRimGradient.addColorStop(0.5, '#FFED4E')
    innerRimGradient.addColorStop(1, '#DAA520')
    ctx.fillStyle = innerRimGradient
    ctx.fill('evenodd')

    // Dark inner ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI)
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, true)
    const darkRing = ctx.createLinearGradient(centerX, centerY - radius, centerX, centerY + radius)
    darkRing.addColorStop(0, '#1a1a1a')
    darkRing.addColorStop(0.5, '#2d2d2d')
    darkRing.addColorStop(1, '#1a1a1a')
    ctx.fillStyle = darkRing
    ctx.fill('evenodd')

    // Draw segments with premium gradients
    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0)
    let currentAngle = -Math.PI / 2

    segments.forEach((segment, index) => {
      const segmentAngle = (segment.weight / totalWeight) * 2 * Math.PI

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
      ctx.closePath()
      ctx.clip()

      // Dark gradient background for segment
      const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      bgGradient.addColorStop(0, 'rgba(20, 20, 20, 0.95)')
      bgGradient.addColorStop(0.5, 'rgba(30, 30, 30, 0.9)')
      bgGradient.addColorStop(1, 'rgba(15, 15, 15, 1)')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, size, size)

      // Color overlay with radial gradient
      const colorGradient = ctx.createRadialGradient(
        centerX + Math.cos(currentAngle + segmentAngle / 2) * radius * 0.3,
        centerY + Math.sin(currentAngle + segmentAngle / 2) * radius * 0.3,
        radius * 0.2,
        centerX,
        centerY,
        radius
      )
      const baseColor = segment.color_hex
      colorGradient.addColorStop(0, baseColor + 'CC')
      colorGradient.addColorStop(0.6, baseColor + '99')
      colorGradient.addColorStop(1, adjustBrightness(baseColor, -60) + 'FF')
      ctx.fillStyle = colorGradient
      ctx.fillRect(0, 0, size, size)

      ctx.restore()

      // Golden separator lines
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(
        centerX + Math.cos(currentAngle) * radius,
        centerY + Math.sin(currentAngle) * radius
      )
      const lineGradient = ctx.createLinearGradient(
        centerX, centerY,
        centerX + Math.cos(currentAngle) * radius,
        centerY + Math.sin(currentAngle) * radius
      )
      lineGradient.addColorStop(0, 'rgba(255, 215, 0, 0)')
      lineGradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.8)')
      lineGradient.addColorStop(1, 'rgba(255, 215, 0, 0.4)')
      ctx.strokeStyle = lineGradient
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.restore()

      // Winning glow effect
      if (winningSegmentIndex === index && !isSpinning) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
        ctx.closePath()
        ctx.shadowColor = baseColor
        ctx.shadowBlur = 25
        ctx.strokeStyle = baseColor + 'AA'
        ctx.lineWidth = 4
        ctx.stroke()
        ctx.restore()
      }

      // Text with premium styling
      const textAngle = currentAngle + segmentAngle / 2
      const textRadius = radius * 0.6
      const textX = centerX + Math.cos(textAngle) * textRadius
      const textY = centerY + Math.sin(textAngle) * textRadius

      ctx.save()
      ctx.translate(textX, textY)
      ctx.rotate(textAngle + Math.PI / 2)
      
      // Text shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 2
      
      // Golden text with gradient
      const textGradient = ctx.createLinearGradient(0, -10, 0, 10)
      textGradient.addColorStop(0, '#FFF8DC')
      textGradient.addColorStop(0.5, '#FFD700')
      textGradient.addColorStop(1, '#DAA520')
      ctx.fillStyle = textGradient
      ctx.font = 'bold 18px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(segment.label, 0, 0)
      
      // Text outline for better contrast
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.lineWidth = 3
      ctx.strokeText(segment.label, 0, 0)
      
      ctx.restore()

      currentAngle += segmentAngle
    })

    // Premium center hub
    // Outer hub ring
    const hubOuterGradient = ctx.createRadialGradient(centerX, centerY - 5, 0, centerX, centerY, 50)
    hubOuterGradient.addColorStop(0, '#FFD700')
    hubOuterGradient.addColorStop(0.4, '#FFA500')
    hubOuterGradient.addColorStop(1, '#B8860B')
    ctx.fillStyle = hubOuterGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI)
    ctx.fill()

    // Hub shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 15
    ctx.shadowOffsetY = 3

    // Middle hub ring
    const hubMiddleGradient = ctx.createRadialGradient(centerX, centerY - 3, 0, centerX, centerY, 42)
    hubMiddleGradient.addColorStop(0, '#8B7500')
    hubMiddleGradient.addColorStop(0.5, '#6B5500')
    hubMiddleGradient.addColorStop(1, '#4B3500')
    ctx.fillStyle = hubMiddleGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 42, 0, 2 * Math.PI)
    ctx.fill()

    // Inner hub with metallic effect
    ctx.shadowBlur = 0
    const hubInnerGradient = ctx.createRadialGradient(centerX, centerY - 2, 0, centerX, centerY, 38)
    hubInnerGradient.addColorStop(0, '#3a3a3a')
    hubInnerGradient.addColorStop(0.5, '#1a1a1a')
    hubInnerGradient.addColorStop(1, '#0a0a0a')
    ctx.fillStyle = hubInnerGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI)
    ctx.fill()

    // Golden border on inner hub
    ctx.beginPath()
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI)
    const hubBorderGradient = ctx.createLinearGradient(centerX - 38, centerY, centerX + 38, centerY)
    hubBorderGradient.addColorStop(0, '#B8860B')
    hubBorderGradient.addColorStop(0.5, '#FFD700')
    hubBorderGradient.addColorStop(1, '#B8860B')
    ctx.strokeStyle = hubBorderGradient
    ctx.lineWidth = 4
    ctx.stroke()

    // Center spindle/cross with premium styling
    ctx.save()
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'
    ctx.shadowBlur = 10
    
    // Horizontal bar
    ctx.beginPath()
    ctx.moveTo(centerX - 20, centerY)
    ctx.lineTo(centerX + 20, centerY)
    const hBarGradient = ctx.createLinearGradient(centerX - 20, centerY, centerX + 20, centerY)
    hBarGradient.addColorStop(0, '#B8860B')
    hBarGradient.addColorStop(0.3, '#FFD700')
    hBarGradient.addColorStop(0.5, '#FFF8DC')
    hBarGradient.addColorStop(0.7, '#FFD700')
    hBarGradient.addColorStop(1, '#B8860B')
    ctx.strokeStyle = hBarGradient
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.stroke()
    
    // Vertical bar
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - 20)
    ctx.lineTo(centerX, centerY + 20)
    const vBarGradient = ctx.createLinearGradient(centerX, centerY - 20, centerX, centerY + 20)
    vBarGradient.addColorStop(0, '#B8860B')
    vBarGradient.addColorStop(0.3, '#FFD700')
    vBarGradient.addColorStop(0.5, '#FFF8DC')
    vBarGradient.addColorStop(0.7, '#FFD700')
    vBarGradient.addColorStop(1, '#B8860B')
    ctx.strokeStyle = vBarGradient
    ctx.lineWidth = 6
    ctx.stroke()
    
    // Center orb
    ctx.shadowBlur = 15
    const orbGradient = ctx.createRadialGradient(centerX - 2, centerY - 2, 0, centerX, centerY, 12)
    orbGradient.addColorStop(0, '#FFF8DC')
    orbGradient.addColorStop(0.3, '#FFD700')
    orbGradient.addColorStop(0.7, '#FFA500')
    orbGradient.addColorStop(1, '#B8860B')
    ctx.fillStyle = orbGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI)
    ctx.fill()
    
    ctx.restore()
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
      className="relative flex justify-center items-center py-8"
      role="img"
      aria-label={isSpinning ? "Spinning wheel" : "Spin wheel ready"}
    >
      {/* Premium glow effect */}
      <div
        className="absolute inset-0 rounded-full opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.4), rgba(255, 165, 0, 0.2) 40%, transparent 70%)'
        }}
      />

      {/* Dark backdrop for contrast */}
      <div
        className="absolute rounded-full opacity-30"
        style={{
          width: '340px',
          height: '340px',
          background: 'radial-gradient(circle, rgba(0, 0, 0, 0.8), transparent 80%)'
        }}
      />

      <div
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: settings.reducedMotion ? 'transform 1s ease-out' : 'none',
          willChange: isSpinning ? 'transform' : 'auto',
          filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.5))'
        }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* Premium golden pointer */}
      <svg
        width="50"
        height="50"
        viewBox="0 0 50 50"
        className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ zIndex: 10, filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' }}
      >
        <defs>
          <linearGradient id="pointerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B8860B" />
            <stop offset="30%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFF8DC" />
            <stop offset="70%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          <radialGradient id="pointerGlow" cx="50%" cy="30%">
            <stop offset="0%" stopColor="rgba(255, 215, 0, 0.8)" />
            <stop offset="100%" stopColor="rgba(255, 215, 0, 0)" />
          </radialGradient>
        </defs>
        {/* Glow behind pointer */}
        <ellipse cx="25" cy="20" rx="20" ry="15" fill="url(#pointerGlow)" />
        {/* Main pointer */}
        <polygon
          points="25,45 10,10 40,10"
          fill="url(#pointerGrad)"
          stroke="#8B7500"
          strokeWidth="2"
        />
        {/* Highlight on pointer */}
        <polygon
          points="25,42 14,12 25,15"
          fill="rgba(255, 248, 220, 0.4)"
        />
      </svg>
    </div>
  )
}
