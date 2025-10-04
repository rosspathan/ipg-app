import React, { useState, useEffect } from 'react'
import { ArrowLeft, RotateCcw, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useISmartSpin } from '@/hooks/useISmartSpin'
import { PremiumSpinWheel } from '@/components/premium-wheel/PremiumSpinWheel'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function ISmartSpinScreen() {
  const navigate = useNavigate()
  const [betAmount, setBetAmount] = useState(10)
  const [winningSegmentIndex, setWinningSegmentIndex] = useState<number>()
  
  const {
    config,
    segments,
    userLimits,
    bskBalance,
    isLoading,
    isSpinning,
    lastResult,
    performSpin,
    calculateCosts
  } = useISmartSpin()

  useEffect(() => {
    if (config) {
      setBetAmount(config.min_bet_bsk)
    }
  }, [config])

  const handleSpin = async () => {
    if (!config || isSpinning) return

    const costs = calculateCosts(betAmount)
    if (!costs?.canAfford) return

    setWinningSegmentIndex(undefined)
    
    const result = await performSpin(betAmount)
    if (result) {
      // Find the segment index
      const segmentIndex = segments.findIndex(s => s.id === result.segment.id)
      setWinningSegmentIndex(segmentIndex)
    }
  }

  const handleSpinComplete = () => {
    // Animation complete
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                i-SMART Spin Wheel is currently unavailable
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/app/programs')}
                className="mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Programs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const costs = calculateCosts(betAmount)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/programs')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Programs
            </Button>
            <h1 className="text-sm font-semibold">i-SMART Spin</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/spin/verify')}
            >
              <Shield className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-4 space-y-3">
        {/* Segments Grid */}
        <div className="grid grid-cols-2 gap-2 pt-3">
          {segments.map((segment, index) => (
            <div
              key={segment.id}
              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                winningSegmentIndex === index 
                  ? 'bg-primary/10 border-primary shadow-md' 
                  : 'bg-card'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                style={{ backgroundColor: segment.color_hex }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{segment.label}</p>
                <p className="text-xs text-muted-foreground">
                  {((segment.weight / segments.reduce((sum, s) => sum + s.weight, 0)) * 100).toFixed(1)}% chance
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Provably Fair Badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></div>
            Provably Fair
          </Badge>
        </div>

        {/* Compact Spin Wheel */}
        <div className="py-2">
          <PremiumSpinWheel
            segments={segments}
            isSpinning={isSpinning}
            winningSegmentIndex={winningSegmentIndex}
            onSpinComplete={handleSpinComplete}
            showParticles={lastResult !== null && winningSegmentIndex !== undefined}
            particleType={lastResult?.multiplier > 0 ? 'win' : 'lose'}
            showSegmentInfo={false}
            maxSize={260}
          />
        </div>

        {/* Place Your Bet */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Place Your Bet</CardTitle>
            <CardDescription className="text-xs">Choose your bet amount</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Amount (INR)</span>
              <span className="text-lg font-bold">₹{betAmount}</span>
            </div>
            
            <Slider
              value={[betAmount]}
              onValueChange={([value]) => setBetAmount(value)}
              min={config.min_bet_bsk}
              max={config.max_bet_bsk}
              step={1}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹{config.min_bet_bsk}</span>
              <span>₹{config.max_bet_bsk}</span>
            </div>

            {costs && (
              <div className="space-y-1.5 text-sm pt-2">
                <div className="flex justify-between">
                  <span>BSK Equivalent</span>
                  <span className="font-medium">{costs.betBsk.toFixed(4)} BSK</span>
                </div>
                {!costs.isFree && (
                  <div className="flex justify-between">
                    <span>Spin Fee</span>
                    <span className="font-medium text-orange-500">{costs.feeBsk.toFixed(0)} BSK</span>
                  </div>
                )}
                {costs.isFree && (
                  <div className="text-center">
                    <Badge variant="secondary" className="text-green-600 text-xs">
                      FREE SPIN ({userLimits?.free_spins_remaining} left)
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Quick Bet Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              {[100, 250, 500, 1000].map((amount) => (
                <Button
                  key={amount}
                  variant={betAmount === amount ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBetAmount(amount)}
                  className="text-xs"
                  disabled={amount > config.max_bet_bsk || amount < config.min_bet_bsk}
                >
                  ₹{amount}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spin Button */}
        <Button
          onClick={handleSpin}
          disabled={isSpinning || !costs?.canAfford}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {isSpinning ? (
            <>
              <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
              Spinning...
            </>
          ) : (
            <>
              ⚡ SPIN NOW
            </>
          )}
        </Button>

        {!costs?.canAfford && (
          <p className="text-center text-xs text-destructive">
            Insufficient BSK balance
          </p>
        )}

        {/* Provably Fair Info */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
          <Shield className="w-3 h-3" />
          <span>Provably Fair</span>
          <span className="text-primary">Verifiable randomness</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/spin/verify')}
          className="w-full text-xs"
        >
          View Proof & Seeds
        </Button>

        {/* Last Result - Compact */}
        {lastResult && (
          <Card className="border-primary/20">
            <CardContent className="py-3">
              <div className="text-center space-y-1">
                <Badge variant={lastResult.multiplier > 0 ? "default" : "secondary"} className="text-xs">
                  {lastResult.segment.label}
                </Badge>
                {lastResult.multiplier > 0 ? (
                  <p className="text-base font-bold text-green-600">
                    Won {lastResult.payout_bsk.toFixed(2)} BSK!
                  </p>
                ) : (
                  <p className="text-base font-bold text-muted-foreground">
                    Better luck next time!
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Net: {lastResult.net_change_bsk > 0 ? '+' : ''}
                  {lastResult.net_change_bsk.toFixed(2)} BSK
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}