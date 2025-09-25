import React, { useRef, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

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
  winningSegmentIndex?: number
  disabled?: boolean
}

export const ProvablyFairWheel: React.FC<ProvablyFairWheelProps> = ({
  segments,
  isSpinning,
  winningSegmentIndex,
  disabled = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const animationRef = useRef<number>()

  useEffect(() => {
    drawWheel()
  }, [segments])

  useEffect(() => {
    if (isSpinning) {
      startSpinAnimation()
    } else if (winningSegmentIndex !== undefined) {
      stopAtWinningSegment()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isSpinning, winningSegmentIndex])

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas || segments.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 20

    // Clear canvas
    ctx.fillStyle = 'rgba(26, 32, 46, 0.95)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw outer glow
    const outerGlow = ctx.createRadialGradient(centerX, centerY, radius - 10, centerX, centerY, radius + 20)
    outerGlow.addColorStop(0, 'rgba(0, 255, 136, 0.1)')
    outerGlow.addColorStop(1, 'rgba(0, 255, 136, 0)')
    ctx.fillStyle = outerGlow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0)
    let currentAngle = -Math.PI / 2 // Start from top

    segments.forEach((segment, index) => {
      const segmentAngle = (segment.weight / totalWeight) * 2 * Math.PI

      // Create gradient for segment
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      gradient.addColorStop(0.3, segment.color_hex)
      gradient.addColorStop(1, segment.color_hex + '80')

      // Draw segment
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()

      // Add segment glow
      ctx.shadowColor = segment.color_hex
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0

      // Draw segment border
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
      ctx.closePath()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw text
      const textAngle = currentAngle + segmentAngle / 2
      const textRadius = radius * 0.65
      const textX = centerX + Math.cos(textAngle) * textRadius
      const textY = centerY + Math.sin(textAngle) * textRadius

      ctx.save()
      ctx.translate(textX, textY)
      ctx.rotate(textAngle + Math.PI / 2)
      
      // Text shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 4
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(segment.label, 0, 0)
      
      // Payout amount
      ctx.font = '10px Arial'
      ctx.fillText(`${segment.min_payout > 0 ? '+' : ''}${segment.min_payout}`, 0, 15)
      
      ctx.restore()
      currentAngle += segmentAngle
    })

    // Draw center hub
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40)
    centerGradient.addColorStop(0, '#4a5568')
    centerGradient.addColorStop(1, '#2d3748')
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI)
    ctx.fillStyle = centerGradient
    ctx.fill()
    
    // Center glow
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur = 15
    ctx.fill()
    ctx.shadowBlur = 0

    // Center border
    ctx.beginPath()
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI)
    ctx.strokeStyle = '#00ff88'
    ctx.lineWidth = 3
    ctx.stroke()

    // Center text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur = 5
    ctx.fillText('IPG', centerX, centerY + 5)
    ctx.shadowBlur = 0

    // Draw pointer
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - radius - 15)
    ctx.lineTo(centerX - 15, centerY - radius - 35)
    ctx.lineTo(centerX + 15, centerY - radius - 35)
    ctx.closePath()
    
    const pointerGradient = ctx.createLinearGradient(centerX - 15, centerY - radius - 35, centerX + 15, centerY - radius - 15)
    pointerGradient.addColorStop(0, '#ff0066')
    pointerGradient.addColorStop(1, '#ff3384')
    
    ctx.fillStyle = pointerGradient
    ctx.fill()
    
    ctx.shadowColor = '#ff0066'
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.shadowBlur = 0
    
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  const startSpinAnimation = () => {
    const animate = () => {
      setRotation(prev => prev + 12)
      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)
  }

  const stopAtWinningSegment = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    if (winningSegmentIndex !== undefined && segments.length > 0) {
      const segmentAngle = 360 / segments.length
      const targetAngle = winningSegmentIndex * segmentAngle + (segmentAngle / 2)
      const finalRotation = 360 * 4 + (360 - targetAngle) // 4 full spins + land on segment
      
      setRotation(prev => prev + finalRotation)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative">
        <div 
          className="rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(168, 85, 247, 0.1) 50%, transparent 100%)',
            padding: '20px'
          }}
        >
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            className="drop-shadow-2xl"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: !isSpinning && winningSegmentIndex !== undefined ? 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
              transformOrigin: 'center'
            }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {segments.filter(s => s.is_active).map((segment) => (
          <div
            key={segment.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/50"
          >
            <div 
              className="w-3 h-3 rounded-full border border-white/20"
              style={{ backgroundColor: segment.color_hex }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{segment.label}</div>
              <div className="text-xs text-muted-foreground">
                {segment.weight}% | {segment.payout_token}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}