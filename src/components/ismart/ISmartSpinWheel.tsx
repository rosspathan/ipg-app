import React, { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'

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
    const radius = Math.min(centerX, centerY) - 10

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw segments
    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0)
    let currentAngle = -Math.PI / 2 // Start from top (12 o'clock) to align with pointer

    segments.forEach((segment, index) => {
      const segmentAngle = (segment.weight / totalWeight) * 2 * Math.PI
      
      // Draw segment
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
      ctx.closePath()
      
      // Highlight winning segment
      if (winningSegmentIndex === index) {
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = segment.color_hex
        ctx.lineWidth = 4
        ctx.stroke()
      } else {
        ctx.fillStyle = segment.color_hex
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Draw text
      const textAngle = currentAngle + segmentAngle / 2
      const textRadius = radius * 0.7
      const textX = centerX + Math.cos(textAngle) * textRadius
      const textY = centerY + Math.sin(textAngle) * textRadius

      ctx.save()
      ctx.translate(textX, textY)
      ctx.rotate(textAngle > Math.PI / 2 && textAngle < (3 * Math.PI) / 2 ? textAngle + Math.PI : textAngle)
      
      ctx.fillStyle = winningSegmentIndex === index ? segment.color_hex : '#ffffff'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(segment.label, 0, 0)
      
      ctx.restore()

      currentAngle += segmentAngle
    })

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI)
    ctx.fillStyle = '#1a1a1a'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw center text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SPIN', centerX, centerY)

    // Draw pointer
    drawPointer(ctx, centerX, centerY - radius + 5)
  }

  const drawPointer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 10, y - 20)
    ctx.lineTo(x + 10, y - 20)
    ctx.closePath()
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#000000'
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

    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0)
    let targetAngle = 0
    
    // Calculate the angle for the winning segment (start from beginning)
    for (let i = 0; i < segmentIndex; i++) {
      targetAngle += (segments[i].weight / totalWeight) * 360
    }
    
    // Add half of the winning segment's angle to center the pointer on it
    targetAngle += (segments[segmentIndex].weight / totalWeight) * 360 / 2
    
    // Since we start drawing from -90 degrees but rotation is from 0, we need to adjust
    // The pointer is at the top, so we need the winning segment to align with 0 degrees (top)
    const finalAngle = 1440 + targetAngle // 4 full rotations + position winning segment at top
    
    setRotation(finalAngle)
    
    setTimeout(() => {
      drawWheel() // Redraw to highlight winning segment
      onSpinComplete?.()
    }, 2000)
  }

  const getTotalWeight = () => segments.reduce((sum, segment) => sum + segment.weight, 0)
  const getSegmentProbability = (weight: number) => ((weight / getTotalWeight()) * 100).toFixed(1)

  if (!segments.length) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No segments configured</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
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

      {/* Segments Info */}
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
              className="w-4 h-4 rounded-full border-2 border-white"
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
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Provably Fair
          </span>
        </div>
      </div>
    </div>
  )
}