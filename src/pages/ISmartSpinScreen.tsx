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
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/programs')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Programs
            </Button>
            <div className="text-center">
              <h1 className="font-semibold">i-SMART Spin Wheel</h1>
              <p className="text-xs text-muted-foreground">Provably Fair</p>
            </div>
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

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Balance & Free Spins */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-lg font-bold">{bskBalance.toFixed(2)} BSK</p>
                <p className="text-xs text-muted-foreground">Available Balance</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">
                  {userLimits?.free_spins_remaining || 0}
                </p>
                <p className="text-xs text-muted-foreground">Free Spins Left</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bet Amount */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bet Amount (BSK)</CardTitle>
            <CardDescription>
              {config.min_bet_bsk} - {config.max_bet_bsk} BSK
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{betAmount} BSK</div>
            </div>
            
            <Slider
              value={[betAmount]}
              onValueChange={([value]) => setBetAmount(value)}
              min={config.min_bet_bsk}
              max={config.max_bet_bsk}
              step={1}
              className="w-full"
            />

            {costs && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Bet:</span>
                  <span>{costs.betBsk.toFixed(2)} BSK</span>
                </div>
                {!costs.isFree && (
                  <div className="flex justify-between">
                    <span>Fee:</span>
                    <span>{costs.feeBsk.toFixed(2)} BSK</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total Cost:</span>
                  <span className={costs.canAfford ? '' : 'text-destructive'}>
                    {costs.totalCost.toFixed(2)} BSK
                  </span>
                </div>
                {costs.isFree && (
                  <div className="text-center">
                    <Badge variant="secondary" className="text-green-600">
                      FREE SPIN ({userLimits?.free_spins_remaining} left)
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spin Wheel */}
        <Card>
          <CardContent className="pt-6">
            <PremiumSpinWheel
              segments={segments}
              isSpinning={isSpinning}
              winningSegmentIndex={winningSegmentIndex}
              onSpinComplete={handleSpinComplete}
              showParticles={lastResult !== null && winningSegmentIndex !== undefined}
              particleType={lastResult?.multiplier > 0 ? 'win' : 'lose'}
            />
          </CardContent>
        </Card>

        {/* Spin Button */}
        <div className="space-y-3">
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
            ) : costs?.isFree ? (
              'SPIN FOR FREE!'
            ) : (
              `SPIN (${betAmount} BSK)`
            )}
          </Button>

          {!costs?.canAfford && (
            <p className="text-center text-sm text-destructive">
              Insufficient BSK balance
            </p>
          )}
        </div>

        {/* Last Result */}
        {lastResult && (
          <Card className="border-primary/20">
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <Badge variant={lastResult.multiplier > 0 ? "default" : "secondary"}>
                  {lastResult.segment.label}
                </Badge>
                <div className="space-y-1">
                  {lastResult.multiplier > 0 ? (
                    <p className="text-lg font-bold text-green-600">
                      Won {lastResult.payout_bsk.toFixed(2)} BSK!
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-muted-foreground">
                      Better luck next time!
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Net change: {lastResult.net_change_bsk > 0 ? '+' : ''}
                    {lastResult.net_change_bsk.toFixed(2)} BSK
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Links */}
        <div className="flex justify-center space-x-4 text-sm">
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate('/app/spin/history')}
            className="h-auto p-0"
          >
            Spin History
          </Button>
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate('/app/spin/verify')}
            className="h-auto p-0"
          >
            Verify Results
          </Button>
        </div>
      </div>
    </div>
  )
}