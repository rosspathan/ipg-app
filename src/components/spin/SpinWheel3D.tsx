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
  spinId?: number
  onSpinComplete?: () => void
}

export function SpinWheel3D({
  segments,
  isSpinning,
  winningSegmentIndex,
  spinId,
  onSpinComplete
}: SpinWheel3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const { settings } = useMotionSettings()
  const animationRef = useRef<number>()

  // Only trigger animation when all conditions are met
  // Remove spinId from deps to avoid double-trigger
  useEffect(() => {
    if (winningSegmentIndex !== undefined && segments.length > 0 && isSpinning) {
      startSpinAnimation(winningSegmentIndex)
    }
  }, [winningSegmentIndex, segments, isSpinning])

  const startSpinAnimation = (targetIndex: number) => {
    // Guard: ensure segments are loaded and index is valid
    if (!segments.length || targetIndex < 0 || targetIndex >= segments.length) {
      return
    }

    // Cancel any in-flight animation to avoid races
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = undefined
    }
    // Reset base rotation so each spin animates from 0 → target
    setRotation(0)

    // Use equal visual angles for stopping position (hides house edge)
    const equalAngle = 360 / segments.length
    const offsetFromTop = targetIndex * equalAngle + equalAngle / 2
    const fullSpins = 5 // Premium feel – deterministic
    const targetRotation = 360 * fullSpins - offsetFromTop

    console.info('WHEEL_START', { targetIndex, targetRotation, spinId })

    const startTime = Date.now()
    const duration = settings.reducedMotion ? 1000 : 3500

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      const t = progress
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2

      const currentRotation = eased * targetRotation
      setRotation(currentRotation)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        console.info('WHEEL_DONE', { targetIndex, spinId })
        onSpinComplete?.()
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    const renderSegments = segments
    if (renderSegments.length > 0) {
      drawWheel(renderSegments)
    }
  }, [segments, rotation, winningSegmentIndex])

  const drawWheel = (renderSegments: Segment[]) => {
    const canvas = canvasRef.current
    if (!canvas || renderSegments.length === 0) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

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

    // === OUTER GLOW ===
    const outerGlow = ctx.createRadialGradient(centerX, centerY, radius + 30, centerX, centerY, radius + 45)
    outerGlow.addColorStop(0, 'rgba(255, 215, 0, 0.3)')
    outerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)')
    ctx.fillStyle = outerGlow
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 45, 0, 2 * Math.PI)
    ctx.fill()

    // === LED LIGHTS (16 around the rim) ===
    const ledCount = 16
    for (let i = 0; i < ledCount; i++) {
      const angle = (i / ledCount) * 2 * Math.PI
      const ledX = centerX + Math.cos(angle) * (radius + 32)
      const ledY = centerY + Math.sin(angle) * (radius + 32)

      const glowGradient = ctx.createRadialGradient(ledX, ledY, 0, ledX, ledY, 10)
      glowGradient.addColorStop(0, 'rgba(255, 237, 78, 1)')
      glowGradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.8)')
      glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)')
      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(ledX, ledY, 10, 0, 2 * Math.PI)
      ctx.fill()

      const ledGradient = ctx.createRadialGradient(ledX, ledY - 1, 0, ledX, ledY, 5)
      ledGradient.addColorStop(0, '#FFF8DC')
      ledGradient.addColorStop(0.5, '#FFED4E')
      ledGradient.addColorStop(1, '#FFD700')
      ctx.fillStyle = ledGradient
      ctx.beginPath()
      ctx.arc(ledX, ledY, 5, 0, 2 * Math.PI)
      ctx.fill()
    }

    // === GOLDEN RIM (Multi-layered) ===
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

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 15, 0, 2 * Math.PI)
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI, true)
    const middleRimGradient = ctx.createLinearGradient(centerX, centerY - radius, centerX, centerY + radius)
    middleRimGradient.addColorStop(0, '#8B7500')
    middleRimGradient.addColorStop(0.5, '#DAA520')
    middleRimGradient.addColorStop(1, '#8B7500')
    ctx.fillStyle = middleRimGradient
    ctx.fill('evenodd')

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI)
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI, true)
    const innerRimGradient = ctx.createRadialGradient(centerX, centerY, radius + 5, centerX, centerY, radius + 10)
    innerRimGradient.addColorStop(0, '#FFD700')
    innerRimGradient.addColorStop(0.5, '#FFED4E')
    innerRimGradient.addColorStop(1, '#DAA520')
    ctx.fillStyle = innerRimGradient
    ctx.fill('evenodd')

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI)
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, true)
    const darkRing = ctx.createLinearGradient(centerX, centerY - radius, centerX, centerY + radius)
    darkRing.addColorStop(0, '#1a1a1a')
    darkRing.addColorStop(0.5, '#2d2d2d')
    darkRing.addColorStop(1, '#1a1a1a')
    ctx.fillStyle = darkRing
    ctx.fill('evenodd')

    // === SEGMENTS (Equal visual size - house edge hidden via backend weights) ===
    const segmentAngle = (2 * Math.PI) / renderSegments.length
    let currentAngle = -Math.PI / 2

    renderSegments.forEach((segment, index) => {

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
      ctx.closePath()
      ctx.clip()

      const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      bgGradient.addColorStop(0, 'rgba(20, 20, 20, 0.95)')
      bgGradient.addColorStop(0.5, 'rgba(30, 30, 30, 0.9)')
      bgGradient.addColorStop(1, 'rgba(15, 15, 15, 1)')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, size, size)

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

      // Golden separator
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

      // Winning glow - only show after spin completes (isSpinning=false) AND we have a valid spinId
      if (winningSegmentIndex === index && !isSpinning && spinId !== undefined) {
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

      // Text
      const textAngle = currentAngle + segmentAngle / 2
      const textRadius = radius * 0.6
      const textX = centerX + Math.cos(textAngle) * textRadius
      const textY = centerY + Math.sin(textAngle) * textRadius

      ctx.save()
      ctx.translate(textX, textY)
      ctx.rotate(textAngle + Math.PI / 2)
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 2
      
      const textGradient = ctx.createLinearGradient(0, -10, 0, 10)
      textGradient.addColorStop(0, '#FFF8DC')
      textGradient.addColorStop(0.5, '#FFD700')
      textGradient.addColorStop(1, '#DAA520')
      ctx.fillStyle = textGradient
      ctx.font = 'bold 18px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(segment.label, 0, 0)
      
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.lineWidth = 3
      ctx.strokeText(segment.label, 0, 0)
      
      ctx.restore()

      currentAngle += segmentAngle
    })

    // === CENTER HUB ===
    const hubOuterGradient = ctx.createRadialGradient(centerX, centerY - 5, 0, centerX, centerY, 50)
    hubOuterGradient.addColorStop(0, '#FFD700')
    hubOuterGradient.addColorStop(0.4, '#FFA500')
    hubOuterGradient.addColorStop(1, '#B8860B')
    ctx.fillStyle = hubOuterGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI)
    ctx.fill()

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 15
    ctx.shadowOffsetY = 3

    const hubMiddleGradient = ctx.createRadialGradient(centerX, centerY - 3, 0, centerX, centerY, 42)
    hubMiddleGradient.addColorStop(0, '#8B7500')
    hubMiddleGradient.addColorStop(0.5, '#6B5500')
    hubMiddleGradient.addColorStop(1, '#4B3500')
    ctx.fillStyle = hubMiddleGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 42, 0, 2 * Math.PI)
    ctx.fill()

    ctx.shadowBlur = 0
    const hubInnerGradient = ctx.createRadialGradient(centerX, centerY - 2, 0, centerX, centerY, 38)
    hubInnerGradient.addColorStop(0, '#3a3a3a')
    hubInnerGradient.addColorStop(0.5, '#1a1a1a')
    hubInnerGradient.addColorStop(1, '#0a0a0a')
    ctx.fillStyle = hubInnerGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI)
    const hubBorderGradient = ctx.createLinearGradient(centerX - 38, centerY, centerX + 38, centerY)
    hubBorderGradient.addColorStop(0, '#B8860B')
    hubBorderGradient.addColorStop(0.5, '#FFD700')
    hubBorderGradient.addColorStop(1, '#B8860B')
    ctx.strokeStyle = hubBorderGradient
    ctx.lineWidth = 4
    ctx.stroke()

    // Spindle
    ctx.save()
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'
    ctx.shadowBlur = 10
    
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
    // Return HEX string to safely concatenate with alpha suffixes
    const raw = hex.startsWith('#') ? hex.slice(1) : hex
    const six = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw
    const rgb = parseInt(six, 16)
    const r = Math.max(0, Math.min(255, ((rgb >> 16) & 0xff) + amount))
    const g = Math.max(0, Math.min(255, ((rgb >> 8) & 0xff) + amount))
    const b = Math.max(0, Math.min(255, (rgb & 0xff) + amount))
    const toHex = (n: number) => n.toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  return (
    <div
      data-testid="spin-wheel"
      className="relative flex justify-center items-center py-8"
      role="img"
      aria-label={isSpinning ? "Spinning wheel" : "Spin wheel ready"}
    >
      <div
        className="absolute inset-0 rounded-full opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.4), rgba(255, 165, 0, 0.2) 40%, transparent 70%)'
        }}
      />

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
        <ellipse cx="25" cy="20" rx="20" ry="15" fill="url(#pointerGlow)" />
        <polygon
          points="25,45 10,10 40,10"
          fill="url(#pointerGrad)"
          stroke="#8B7500"
          strokeWidth="2"
        />
        <polygon
          points="25,42 14,12 25,15"
          fill="rgba(255, 248, 220, 0.4)"
        />
      </svg>
    </div>
  )
}
