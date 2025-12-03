import React, { useState, useRef, useEffect } from 'react'

interface Segment {
  id: string
  label: string
  multiplier: number
  weight: number
  color_hex: string
}

interface Props {
  segments: Segment[]
  isSpinning: boolean
  winningSegmentIndex?: number
  onSpinComplete?: () => void
}

export function ISmartSpinWheel({ segments, isSpinning, winningSegmentIndex, onSpinComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const animationRef = useRef<number>()

  useEffect(() => {
    drawWheel()
  }, [segments, winningSegmentIndex])

  useEffect(() => {
    if (isSpinning) {
      console.info('WHEEL_START')
      startSpinAnimation()
    } else if (winningSegmentIndex !== undefined) {
      stopAtWinningSegment(winningSegmentIndex)
    }
  }, [isSpinning, winningSegmentIndex])

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas || !segments.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const outerRadius = Math.min(centerX, centerY) - 10
    const innerRadius = outerRadius - 8 // Golden ring width

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw outer golden ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI)
    const goldGradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius)
    goldGradient.addColorStop(0, '#d4af37')
    goldGradient.addColorStop(0.5, '#f4d03f')
    goldGradient.addColorStop(1, '#b8860b')
    ctx.fillStyle = goldGradient
    ctx.fill()

    // Draw decorative dots on rim
    const dotCount = 24
    for (let i = 0; i < dotCount; i++) {
      const dotAngle = (i / dotCount) * 2 * Math.PI - Math.PI / 2
      const dotX = centerX + Math.cos(dotAngle) * (outerRadius - 4)
      const dotY = centerY + Math.sin(dotAngle) * (outerRadius - 4)
      
      ctx.beginPath()
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI)
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#1a1a1a'
      ctx.fill()
    }

    // Draw segments with EQUAL visual size (not based on weight)
    const segmentAngle = (2 * Math.PI) / segments.length // Equal angle for each segment
    let currentAngle = -Math.PI / 2 // Start from top (12 o'clock)

    segments.forEach((segment, index) => {
      // Draw segment
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, innerRadius, currentAngle, currentAngle + segmentAngle)
      ctx.closePath()
      
      // Create gradient for segment
      const midAngle = currentAngle + segmentAngle / 2
      const gradientX1 = centerX + Math.cos(midAngle) * innerRadius * 0.3
      const gradientY1 = centerY + Math.sin(midAngle) * innerRadius * 0.3
      const gradientX2 = centerX + Math.cos(midAngle) * innerRadius * 0.9
      const gradientY2 = centerY + Math.sin(midAngle) * innerRadius * 0.9
      
      const segmentGradient = ctx.createLinearGradient(gradientX1, gradientY1, gradientX2, gradientY2)
      
      // Highlight winning segment
      if (winningSegmentIndex === index) {
        segmentGradient.addColorStop(0, '#ffffff')
        segmentGradient.addColorStop(1, '#f0f0f0')
        ctx.fillStyle = segmentGradient
        ctx.fill()
        ctx.strokeStyle = segment.color_hex
        ctx.lineWidth = 4
        ctx.stroke()
      } else {
        // Add slight gradient to segments for depth
        const baseColor = segment.color_hex
        segmentGradient.addColorStop(0, baseColor)
        segmentGradient.addColorStop(1, adjustColor(baseColor, -20))
        ctx.fillStyle = segmentGradient
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Draw text
      const textAngle = currentAngle + segmentAngle / 2
      const textRadius = innerRadius * 0.65
      const textX = centerX + Math.cos(textAngle) * textRadius
      const textY = centerY + Math.sin(textAngle) * textRadius

      ctx.save()
      ctx.translate(textX, textY)
      
      // Rotate text to be readable
      let textRotation = textAngle
      if (textAngle > Math.PI / 2 && textAngle < (3 * Math.PI) / 2) {
        textRotation += Math.PI
      }
      ctx.rotate(textRotation)
      
      ctx.fillStyle = winningSegmentIndex === index ? segment.color_hex : '#ffffff'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Add text shadow for better readability
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
      ctx.fillText(segment.label, 0, 0)
      ctx.shadowColor = 'transparent'
      
      ctx.restore()

      currentAngle += segmentAngle
    })

    // Draw center circle with gradient
    const centerGradient = ctx.createRadialGradient(centerX - 5, centerY - 5, 0, centerX, centerY, 35)
    centerGradient.addColorStop(0, '#3a3a3a')
    centerGradient.addColorStop(0.7, '#1a1a1a')
    centerGradient.addColorStop(1, '#000000')
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI)
    ctx.fillStyle = centerGradient
    ctx.fill()
    
    // Gold ring around center
    ctx.strokeStyle = '#d4af37'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw center text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 13px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SPIN', centerX, centerY)

    // Draw pointer
    drawPointer(ctx, centerX, centerY - outerRadius + 5)
  }

  // Helper to darken/lighten colors
  const adjustColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, Math.max(0, (num >> 16) + amount))
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
  }

  const drawPointer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Draw pointer shadow
    ctx.beginPath()
    ctx.moveTo(x + 2, y + 2)
    ctx.lineTo(x - 12, y - 22)
    ctx.lineTo(x + 14, y - 22)
    ctx.closePath()
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fill()
    
    // Draw pointer
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 12, y - 24)
    ctx.lineTo(x + 12, y - 24)
    ctx.closePath()
    
    const pointerGradient = ctx.createLinearGradient(x, y, x, y - 24)
    pointerGradient.addColorStop(0, '#f4d03f')
    pointerGradient.addColorStop(1, '#d4af37')
    ctx.fillStyle = pointerGradient
    ctx.fill()
    
    ctx.strokeStyle = '#b8860b'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  const startSpinAnimation = () => {
    let spinSpeed = 15
    const spin = () => {
      setRotation(prev => prev + spinSpeed)
      spinSpeed *= 0.99 // Gradual slowdown
      
      if (spinSpeed > 0.5) {
        animationRef.current = requestAnimationFrame(spin)
      }
    }
    animationRef.current = requestAnimationFrame(spin)
  }

  const stopAtWinningSegment = (segmentIndex: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Use EQUAL visual angles (not weight-based)
    const equalAngle = 360 / segments.length // 90° per segment for 4 segments
    
    // Calculate the cumulative angle up to the winning segment
    const cumulativeAngle = segmentIndex * equalAngle
    
    // Add half of the segment's angle to center the pointer on it
    const winningSegmentHalfAngle = equalAngle / 2
    const targetAngle = cumulativeAngle + winningSegmentHalfAngle
    
    // Rotate to align the winning segment with top (where pointer is)
    const finalAngle = 1440 - targetAngle + 90 // 4 full rotations + positioning
    
    setRotation(finalAngle)
    
    setTimeout(() => {
      console.info('WHEEL_DONE')
      drawWheel() // Redraw to highlight winning segment
      onSpinComplete?.()
    }, 2000)
  }

  if (!segments.length) {
    return (
      <div className="p-6 text-center rounded-lg border bg-card">
        <p className="text-muted-foreground">No segments configured</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Wheel */}
      <div className="relative flex justify-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="transition-transform duration-2000 ease-out"
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>

      {/* Segments Info - Without probability display */}
      <div className="grid grid-cols-2 gap-2">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className={`flex items-center gap-2 p-2 rounded-lg border ${
              winningSegmentIndex === index 
                ? 'bg-primary/10 border-primary' 
                : 'bg-muted/50'
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
                {segment.multiplier > 0 ? `${segment.multiplier}x payout` : 'No payout'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Provably Fair Badge */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Provably Fair
          </span>
        </div>
      </div>
    </div>
  )
}
