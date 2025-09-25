import React, { useRef, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

interface WheelSegment {
  id: number
  label: string
  weight: number
  min_payout: number
  max_payout: number
  payout_token: string
  color_hex: string
  is_active: boolean
}

interface ProvablyFairWheelProps {
  segments: WheelSegment[]
  isSpinning: boolean
  winningSegment?: WheelSegment
}

export function ProvablyFairWheel({ 
  segments, 
  isSpinning, 
  winningSegment 
}: ProvablyFairWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    drawWheel()
  }, [segments, winningSegment])

  useEffect(() => {
    if (isSpinning) {
      // Start spinning animation
      const startTime = Date.now()
      const spinDuration = 3000 // 3 seconds
      const totalRotation = 1800 // 5 full rotations
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / spinDuration, 1)
        
        // Easing function for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const currentRotation = totalRotation * easeOut
        
        setRotation(currentRotation)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      
      animate()
    }
  }, [isSpinning])

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas || segments.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate total weight
    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0)

    // Draw segments
    let currentAngle = 0
    segments.forEach((segment, index) => {
      const segmentAngle = (segment.weight / totalWeight) * 2 * Math.PI
      
      // Draw segment
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
      ctx.closePath()
      
      // Highlight winning segment
      if (winningSegment && segment.id === winningSegment.id) {
        ctx.fillStyle = '#FFD700' // Gold color for winner
        ctx.strokeStyle = '#FFA500'
        ctx.lineWidth = 4
      } else {
        ctx.fillStyle = segment.color_hex
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
      }
      
      ctx.fill()
      ctx.stroke()

      // Draw text
      const textAngle = currentAngle + segmentAngle / 2
      const textX = centerX + Math.cos(textAngle) * (radius * 0.7)
      const textY = centerY + Math.sin(textAngle) * (radius * 0.7)
      
      ctx.save()
      ctx.translate(textX, textY)
      ctx.rotate(textAngle + Math.PI / 2)
      
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Draw text with white outline for readability
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.strokeText(segment.label, 0, 0)
      ctx.fillText(segment.label, 0, 0)
      
      ctx.restore()

      currentAngle += segmentAngle
    })

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI)
    ctx.fillStyle = '#1f2937'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw IPG text in center
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('IPG', centerX, centerY)

    // Draw pointer
    drawPointer(ctx, centerX, centerY - radius - 5)
  }

  const drawPointer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 10, y - 20)
    ctx.lineTo(x + 10, y - 20)
    ctx.closePath()
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  if (segments.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          No wheel segments available
        </div>
      </Card>
    )
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="w-full max-w-md mx-auto"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? 'none' : 'transform 0.5s ease-out'
        }}
      />
      
      {/* Segment List */}
      <div className="mt-4 space-y-2">
        <h4 className="font-semibold">Segments & Probabilities:</h4>
        {segments.map((segment) => {
          const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0)
          const probability = ((segment.weight / totalWeight) * 100).toFixed(1)
          
          return (
            <div 
              key={segment.id}
              className={`flex items-center justify-between p-2 rounded text-sm ${
                winningSegment && segment.id === winningSegment.id 
                  ? 'bg-yellow-100 border-yellow-500 border-2' 
                  : 'bg-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: segment.color_hex }}
                />
                <span className="font-medium">{segment.label}</span>
              </div>
              <div className="text-right">
                <div>{probability}%</div>
                <div className="text-xs text-muted-foreground">
                  {segment.min_payout === segment.max_payout 
                    ? `${segment.min_payout} ${segment.payout_token}`
                    : `${segment.min_payout}-${segment.max_payout} ${segment.payout_token}`
                  }
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}