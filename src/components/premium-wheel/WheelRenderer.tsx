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
    const radius = Math.min(centerX, centerY) - 10
    const innerRadius = radius * 0.2

    // Clear canvas with anti-aliasing
    ctx.clearRect(0, 0, width, height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw outer rim glow
    if (rimGlow && !settings.reducedMotion) {
      const gradient = ctx.createRadialGradient(centerX, centerY, radius - 5, centerX, centerY, radius + 10)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI)
      ctx.fill()
    }

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

    // Draw center circle with glow
    if (centerGlow && !settings.reducedMotion) {
      const centerGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, 40
      )
      centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      centerGradient.addColorStop(0.7, 'rgba(200, 200, 200, 0.8)')
      centerGradient.addColorStop(1, 'rgba(100, 100, 100, 0.6)')
      ctx.fillStyle = centerGradient
    } else {
      ctx.fillStyle = '#1a1a1a'
    }
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI)
    ctx.fill()
    
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()

    // Center text
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.max(10, radius * 0.05)}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SPIN', centerX, centerY)

    // Draw pointer
    drawPointer(ctx, centerX, centerY - radius + 5)
  }

  const drawPointer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Enhanced pointer with 3D effect
    ctx.save()
    
    // Pointer shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 5
    ctx.shadowOffsetY = 2
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 12, y - 25)
    ctx.lineTo(x + 12, y - 25)
    ctx.closePath()
    
    // Pointer gradient for 3D effect
    const pointerGradient = ctx.createLinearGradient(x - 12, y - 25, x + 12, y - 25)
    pointerGradient.addColorStop(0, '#f0f0f0')
    pointerGradient.addColorStop(0.5, '#ffffff')
    pointerGradient.addColorStop(1, '#d0d0d0')
    
    ctx.fillStyle = pointerGradient
    ctx.fill()
    
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 2
    ctx.stroke()
    
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
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        className={`transition-all duration-300 ${
          isSpinning ? 'will-change-transform' : ''
        }`}
      />
    </div>
  )
}