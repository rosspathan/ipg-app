import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useMotionSettings } from '@/hooks/useMotionSettings'

interface Segment {
  id: string
  label: string
  multiplier: number
  weight: number
  color_hex: string
}

interface WheelRendererProps {
  segments: Segment[]
  rotation: number
  winningSegmentIndex?: number
  isSpinning: boolean
  centerGlow?: boolean
  rimGlow?: boolean
  specularHighlight?: boolean
}

export function WheelRenderer({
  segments,
  rotation,
  winningSegmentIndex,
  isSpinning,
  centerGlow = true,
  rimGlow = true,
  specularHighlight = true
}: WheelRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { settings, deviceCapabilities } = useMotionSettings()
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 })
  
  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const size = Math.min(rect.width, 400, window.innerWidth * 0.8)
        setDimensions({ width: size, height: size })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // High-performance wheel rendering with GPU acceleration
  const canvasStyle = useMemo(() => ({
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center',
    willChange: isSpinning ? 'transform' : 'auto',
    backfaceVisibility: 'hidden' as const,
    perspective: 1000,
    filter: settings.reducedMotion ? 'none' : (
      rimGlow && isSpinning ? 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))' : 'none'
    )
  }), [rotation, isSpinning, rimGlow, settings.reducedMotion])

  useEffect(() => {
    drawWheel()
  }, [segments, winningSegmentIndex, dimensions, centerGlow, specularHighlight])

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas || !segments.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = dimensions
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(devicePixelRatio, devicePixelRatio)

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(centerX, centerY) - 35
    const innerRadius = radius * 0.15

    // Clear canvas with anti-aliasing
    ctx.clearRect(0, 0, width, height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw dark outer ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 28, 0, 2 * Math.PI)
    const outerRingGradient = ctx.createRadialGradient(centerX, centerY, radius + 20, centerX, centerY, radius + 28)
    outerRingGradient.addColorStop(0, '#2a2a2a')
    outerRingGradient.addColorStop(0.5, '#1a1a1a')
    outerRingGradient.addColorStop(1, '#0a0a0a')
    ctx.fillStyle = outerRingGradient
    ctx.fill()

    // Draw decorative golden lights around the outer ring
    const lightCount = 8
    for (let i = 0; i < lightCount; i++) {
      const angle = (i / lightCount) * 2 * Math.PI
      const lightX = centerX + Math.cos(angle) * (radius + 24)
      const lightY = centerY + Math.sin(angle) * (radius + 24)
      
      // Golden glow
      const glowGradient = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 8)
      glowGradient.addColorStop(0, '#FFD700')
      glowGradient.addColorStop(0.3, '#FFA500')
      glowGradient.addColorStop(1, 'rgba(255, 165, 0, 0)')
      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(lightX, lightY, 8, 0, 2 * Math.PI)
      ctx.fill()
      
      // Golden ball
      const ballGradient = ctx.createRadialGradient(lightX - 1, lightY - 1, 0, lightX, lightY, 5)
      ballGradient.addColorStop(0, '#FFED4E')
      ballGradient.addColorStop(0.5, '#FFD700')
      ballGradient.addColorStop(1, '#FFA500')
      ctx.fillStyle = ballGradient
      ctx.beginPath()
      ctx.arc(lightX, lightY, 5, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Draw golden rim border
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 15, 0, 2 * Math.PI)
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI, true)
    const goldenRimGradient = ctx.createRadialGradient(centerX, centerY, radius + 8, centerX, centerY, radius + 15)
    goldenRimGradient.addColorStop(0, '#FFD700')
    goldenRimGradient.addColorStop(0.3, '#FFA500')
    goldenRimGradient.addColorStop(0.6, '#FFD700')
    goldenRimGradient.addColorStop(1, '#CC8800')
    ctx.fillStyle = goldenRimGradient
    ctx.fill('evenodd')

    // Inner golden border
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI)
    ctx.strokeStyle = '#FFED4E'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw segments
    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0)
    let currentAngle = -Math.PI / 2 // Start from top

    segments.forEach((segment, index) => {
      const segmentAngle = (segment.weight / totalWeight) * 2 * Math.PI
      
      // Create segment path
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
      ctx.closePath()

      // Segment fill with gradient for depth
      if (winningSegmentIndex === index) {
        // Winning segment highlight
        const highlightGradient = ctx.createRadialGradient(
          centerX, centerY, innerRadius,
          centerX, centerY, radius
        )
        highlightGradient.addColorStop(0, '#ffffff')
        highlightGradient.addColorStop(0.7, segment.color_hex)
        highlightGradient.addColorStop(1, darkenColor(segment.color_hex, 0.3))
        ctx.fillStyle = highlightGradient
      } else {
        // Normal segment with depth gradient
        const gradient = ctx.createRadialGradient(
          centerX, centerY, innerRadius,
          centerX, centerY, radius
        )
        gradient.addColorStop(0, lightenColor(segment.color_hex, 0.3))
        gradient.addColorStop(0.7, segment.color_hex)
        gradient.addColorStop(1, darkenColor(segment.color_hex, 0.2))
        ctx.fillStyle = gradient
      }
      
      ctx.fill()

      // Segment border
      ctx.strokeStyle = winningSegmentIndex === index ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = winningSegmentIndex === index ? 3 : 1
      ctx.stroke()

      // Specular highlight
      if (specularHighlight && !settings.reducedMotion) {
        const highlightAngle = currentAngle + segmentAngle * 0.3
        const highlightX = centerX + Math.cos(highlightAngle) * radius * 0.8
        const highlightY = centerY + Math.sin(highlightAngle) * radius * 0.8
        
        const specGradient = ctx.createRadialGradient(
          highlightX, highlightY, 0,
          highlightX, highlightY, 30
        )
        specGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
        specGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        
        ctx.fillStyle = specGradient
        ctx.beginPath()
        ctx.arc(highlightX, highlightY, 30, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Draw text
      const textAngle = currentAngle + segmentAngle / 2
      const textRadius = radius * 0.7
      const textX = centerX + Math.cos(textAngle) * textRadius
      const textY = centerY + Math.sin(textAngle) * textRadius

      ctx.save()
      ctx.translate(textX, textY)
      ctx.rotate(textAngle > Math.PI / 2 && textAngle < (3 * Math.PI) / 2 ? textAngle + Math.PI : textAngle)
      
      // Text with shadow for better readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 2
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
      
      ctx.fillStyle = winningSegmentIndex === index ? segment.color_hex : '#ffffff'
      ctx.font = `bold ${Math.max(12, radius * 0.06)}px Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(segment.label, 0, 0)
      
      ctx.restore()

      currentAngle += segmentAngle
    })

    // Draw dark center circle
    const centerRadius = 40
    
    // Dark background
    ctx.beginPath()
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI)
    const centerBgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, centerRadius)
    centerBgGradient.addColorStop(0, '#2a2a2a')
    centerBgGradient.addColorStop(1, '#0a0a0a')
    ctx.fillStyle = centerBgGradient
    ctx.fill()
    
    // Golden border
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw golden pin design (cross pattern)
    ctx.save()
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    
    // Horizontal line
    ctx.beginPath()
    ctx.moveTo(centerX - 15, centerY)
    ctx.lineTo(centerX + 15, centerY)
    ctx.stroke()
    
    // Vertical line
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - 15)
    ctx.lineTo(centerX, centerY + 15)
    ctx.stroke()
    
    // Corner circles
    const cornerRadius = 3
    const cornerDistance = 12
    const corners = [
      { x: centerX - cornerDistance, y: centerY - cornerDistance },
      { x: centerX + cornerDistance, y: centerY - cornerDistance },
      { x: centerX - cornerDistance, y: centerY + cornerDistance },
      { x: centerX + cornerDistance, y: centerY + cornerDistance }
    ]
    
    corners.forEach(corner => {
      ctx.beginPath()
      ctx.arc(corner.x, corner.y, cornerRadius, 0, 2 * Math.PI)
      const cornerGradient = ctx.createRadialGradient(corner.x, corner.y, 0, corner.x, corner.y, cornerRadius)
      cornerGradient.addColorStop(0, '#FFED4E')
      cornerGradient.addColorStop(1, '#FFD700')
      ctx.fillStyle = cornerGradient
      ctx.fill()
    })
    
    // Center golden dot
    ctx.beginPath()
    ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI)
    const centerDotGradient = ctx.createRadialGradient(centerX - 1, centerY - 1, 0, centerX, centerY, 4)
    centerDotGradient.addColorStop(0, '#FFED4E')
    centerDotGradient.addColorStop(1, '#FFA500')
    ctx.fillStyle = centerDotGradient
    ctx.fill()
    
    ctx.restore()

    // Draw pointer
    drawPointer(ctx, centerX, centerY - radius + 5)
  }

  const drawPointer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Golden pointer with 3D effect
    ctx.save()
    
    // Pointer shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 3
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 15, y - 30)
    ctx.lineTo(x + 15, y - 30)
    ctx.closePath()
    
    // Golden gradient for 3D effect
    const pointerGradient = ctx.createLinearGradient(x - 15, y - 30, x + 15, y - 30)
    pointerGradient.addColorStop(0, '#CC8800')
    pointerGradient.addColorStop(0.3, '#FFD700')
    pointerGradient.addColorStop(0.5, '#FFED4E')
    pointerGradient.addColorStop(0.7, '#FFD700')
    pointerGradient.addColorStop(1, '#CC8800')
    
    ctx.fillStyle = pointerGradient
    ctx.fill()
    
    // Golden border
    ctx.strokeStyle = '#FFA500'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Highlight on top
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 6, y - 15)
    ctx.lineTo(x + 6, y - 15)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255, 237, 78, 0.6)'
    ctx.fill()
    
    ctx.restore()
  }

  // Color utility functions
  const lightenColor = (color: string, amount: number) => {
    const hex = color.replace('#', '')
    const rgb = [
      parseInt(hex.substr(0, 2), 16),
      parseInt(hex.substr(2, 2), 16),
      parseInt(hex.substr(4, 2), 16)
    ]
    const lightened = rgb.map(c => Math.min(255, Math.floor(c + (255 - c) * amount)))
    return `rgb(${lightened.join(', ')})`
  }

  const darkenColor = (color: string, amount: number) => {
    const hex = color.replace('#', '')
    const rgb = [
      parseInt(hex.substr(0, 2), 16),
      parseInt(hex.substr(2, 2), 16),
      parseInt(hex.substr(4, 2), 16)
    ]
    const darkened = rgb.map(c => Math.floor(c * (1 - amount)))
    return `rgb(${darkened.join(', ')})`
  }

  return (
    <div 
      ref={containerRef} 
      className="relative flex justify-center items-center"
      style={{ width: '100%', maxWidth: '400px', aspectRatio: '1' }}
    >
      {/* Golden pedestal effect */}
      <div className="absolute bottom-0 w-3/4 h-8 rounded-[50%] opacity-40 blur-sm"
        style={{
          background: 'linear-gradient(90deg, #CC8800 0%, #FFD700 20%, #FFA500 50%, #FFD700 80%, #CC8800 100%)',
          transform: 'translateY(120%)',
          boxShadow: '0 4px 20px rgba(255, 215, 0, 0.6)'
        }}
      />
      
      <canvas
        ref={canvasRef}
        style={{
          ...canvasStyle,
          filter: settings.reducedMotion ? 'none' : 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4))'
        }}
        className={`transition-all duration-300 ${
          isSpinning ? 'will-change-transform' : ''
        }`}
      />
    </div>
  )
}