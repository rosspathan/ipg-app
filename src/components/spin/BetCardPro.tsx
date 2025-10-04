import React from 'react'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'

interface BetCardProProps {
  betAmount: number
  onBetChange: (amount: number) => void
  minBet: number
  maxBet: number
  bskEquivalent: number
  spinFee: number
  isFree: boolean
  isSpinning: boolean
  canAfford: boolean
  onSpin: () => void
}

export function BetCardPro({
  betAmount,
  onBetChange,
  minBet,
  maxBet,
  bskEquivalent,
  spinFee,
  isFree,
  isSpinning,
  canAfford,
  onSpin
}: BetCardProProps) {
  const quickBets = [100, 250, 500, 1000].filter(amt => amt >= minBet && amt <= maxBet)

  return (
    <Card
      data-testid="bet-card"
      className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl border-t shadow-2xl bg-background/95 backdrop-blur-xl"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)'
      }}
    >
      <CardContent className="pt-4 pb-3 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Place Your Bet</h3>
          <div className="text-right">
            <div className="text-lg font-bold">₹{betAmount}</div>
            <div className="text-[10px] text-muted-foreground">
              {bskEquivalent.toFixed(4)} BSK
            </div>
          </div>
        </div>

        <Slider
          value={[betAmount]}
          onValueChange={([value]) => onBetChange(value)}
          min={minBet}
          max={maxBet}
          step={10}
          className="w-full"
          aria-label="Bet amount slider"
        />

        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>₹{minBet}</span>
          <span>₹{maxBet}</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {quickBets.map((amount) => (
            <Button
              key={amount}
              variant={betAmount === amount ? "default" : "outline"}
              size="sm"
              onClick={() => onBetChange(amount)}
              className="text-xs h-8"
            >
              ₹{amount}
            </Button>
          ))}
        </div>

        {!isFree && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Spin Fee</span>
            <span className="font-medium text-orange-500">{spinFee} BSK</span>
          </div>
        )}

        <Button
          onClick={onSpin}
          disabled={isSpinning || !canAfford}
          className="w-full h-12 text-base font-bold bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] hover:from-[#6A3FD9] hover:to-[#00CCE6] disabled:opacity-50"
          aria-label={isSpinning ? "Spinning..." : "Spin now"}
        >
          {isSpinning ? (
            <>
              <Zap className="w-5 h-5 mr-2 animate-pulse" />
              Spinning...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              SPIN NOW
            </>
          )}
        </Button>

        {!canAfford && !isSpinning && (
          <p className="text-xs text-center text-destructive">
            Insufficient BSK balance
          </p>
        )}
      </CardContent>
    </Card>
  )
}
