import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, TrendingUp, TrendingDown, X } from 'lucide-react'
import Confetti from 'react-confetti'

interface SpinResultModalProps {
  isOpen: boolean
  onClose: () => void
  result: {
    multiplier: number
    segment?: { label?: string }
    segment_label?: string
    net_change_bsk: number
    payout_bsk: number
  } | null
}

export function SpinResultModal({ isOpen, onClose, result }: SpinResultModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
  }, [])

  useEffect(() => {
    if (isOpen && result && result.multiplier >= 1.5) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, result])

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => onClose(), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!result) return null

  const multiplier = result.multiplier ?? 0
  const netChangeBsk = result.net_change_bsk ?? 0
  const payoutBsk = result.payout_bsk ?? 0
  const isWin = multiplier > 0
  const isBigWin = multiplier >= 1.5
  const segmentLabel = result.segment_label || result.segment?.label || 'LOSE'

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.3}
        />
      )}
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className={`max-w-sm border-2 overflow-hidden ${
            isWin 
              ? 'bg-gradient-to-br from-emerald-500/10 via-background to-background border-emerald-500/30' 
              : 'bg-gradient-to-br from-red-500/10 via-background to-background border-red-500/30'
          }`}
          onClick={onClose}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0 z-10"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="text-center space-y-6 py-8 px-4">
            {/* Icon */}
            <div className="flex justify-center">
              <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${
                isWin 
                  ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 shadow-lg shadow-emerald-500/30' 
                  : 'bg-gradient-to-br from-red-500/30 to-red-500/10 shadow-lg shadow-red-500/30'
              } animate-scale-in`}>
                {isWin ? (
                  <TrendingUp className={`w-10 h-10 ${isBigWin ? 'text-yellow-500' : 'text-emerald-500'}`} />
                ) : (
                  <TrendingDown className="w-10 h-10 text-red-500" />
                )}
                {isBigWin && (
                  <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 animate-pulse" />
                )}
              </div>
            </div>

            {/* Result */}
            <div className="space-y-2">
              <p className={`text-sm font-medium uppercase tracking-wider ${
                isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {segmentLabel}
              </p>
              
              <div className={`text-6xl font-bold ${
                isWin ? 'text-emerald-500' : 'text-red-500'
              } animate-scale-in`}>
                {multiplier}x
              </div>

              <div className={`text-3xl font-bold ${
                netChangeBsk > 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {netChangeBsk > 0 ? '+' : ''}
                {netChangeBsk.toFixed(2)} BSK
              </div>
            </div>

            {/* Payout details */}
            <div className="text-sm text-muted-foreground">
              Payout: {payoutBsk.toFixed(2)} BSK
            </div>

            {isBigWin && (
              <div className="text-2xl font-bold text-yellow-500 animate-pulse">
                🎉 BIG WIN! 🎉
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Tap anywhere to close
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
