import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useISmartSpin } from '@/hooks/useISmartSpin'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { SpinHeaderPro } from '@/components/spin/SpinHeaderPro'
import { SpinWheel3D } from '@/components/spin/SpinWheel3D'
import { WheelStatsRow } from '@/components/spin/WheelStatsRow'
import { FreeSpinsCard } from '@/components/spin/FreeSpinsCard'
import { BetCardPro } from '@/components/spin/BetCardPro'
import { ProvablyFairPanel } from '@/components/spin/ProvablyFairPanel'
import { HistorySheet } from '@/components/spin/HistorySheet'
import { History } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function ISmartSpinScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [betAmount, setBetAmount] = useState(100)
  const [winningSegmentIndex, setWinningSegmentIndex] = useState<number>()
  const [showHistory, setShowHistory] = useState(false)
  const [spinHistory, setSpinHistory] = useState<any[]>([])
  
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

  // 🎯 PROOF MARKER: Log on mount to verify V3 is rendering
  useEffect(() => {
    console.log('✅ ISmartSpinScreen V3 MOUNTED - SpinWheel3D Active')
    console.log('📊 Segments loaded:', segments.length, segments.map(s => s.label))
  }, [segments])

  useEffect(() => {
    if (config) {
      setBetAmount(Math.max(config.min_bet_bsk, 100))
    }
  }, [config])

  useEffect(() => {
    if (lastResult) {
      setSpinHistory(prev => [lastResult, ...prev].slice(0, 20))
    }
  }, [lastResult])

  const handleSpin = async () => {
    if (!config || isSpinning) return

    const costs = calculateCosts(betAmount)
    if (!costs?.canAfford) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough BSK to place this bet",
        variant: "destructive"
      })
      return
    }

    setWinningSegmentIndex(undefined)
    
    const result = await performSpin(betAmount)
    if (result) {
      const segmentIndex = segments.findIndex(s => s.id === result.segment.id)
      setWinningSegmentIndex(segmentIndex)
    }
  }

  const handleSpinComplete = () => {
    // Animation complete - additional logic can go here
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <SpinHeaderPro />
        <div className="max-w-md mx-auto pt-12 px-4">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-muted-foreground">
                i-SMART Spin Wheel is currently unavailable
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/app/programs')}
              >
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
    <div 
      data-testid="page-spin-v3"
      className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-48"
    >
      {/* 🎯 PROOF MARKER: Visible banner to confirm V3 is rendering */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white text-center py-1 text-xs font-bold">
        ✅ V3 ACTIVE - SpinWheel3D (4 Segments)
      </div>
      
      <SpinHeaderPro />

      <div className="max-w-md mx-auto">
        {/* Subtext */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm text-muted-foreground text-center">
            Test your luck with provably fair spins
          </p>
        </div>

        {/* History Button */}
        <div className="px-4 pb-3 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="text-xs"
          >
            <History className="w-3 h-3 mr-1" />
            View History
          </Button>
        </div>

        {/* Free Spins Card */}
        {userLimits && (
          <FreeSpinsCard
            freeSpinsRemaining={userLimits.free_spins_remaining}
            totalFreeSpins={5}
            postFreeSpinFee={config.post_free_spin_fee_bsk}
            onTap={() => setShowHistory(true)}
          />
        )}

        {/* Spin Wheel - Force refresh */}
        {segments.length > 0 && (
          <SpinWheel3D
            key={`premium-wheel-${segments.length}-${JSON.stringify(segments.map(s => s.label))}`}
            segments={segments}
            isSpinning={isSpinning}
            winningSegmentIndex={winningSegmentIndex}
            onSpinComplete={handleSpinComplete}
          />
        )}

        {/* Wheel Stats Row */}
        <WheelStatsRow
          segments={segments}
          winningSegmentIndex={winningSegmentIndex}
        />

        {/* Provably Fair Panel */}
        <div className="mt-4">
          <ProvablyFairPanel />
        </div>

        {/* Last Result Display */}
        {lastResult && (
          <div className="mx-4 mb-4">
            <Card className="border-primary/20">
              <CardContent className="py-3">
                <div className="text-center space-y-1">
                  {lastResult.multiplier > 0 ? (
                    <>
                      <p className="text-lg font-bold text-green-600">
                        🎉 Won {lastResult.payout_bsk.toFixed(2)} BSK!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lastResult.segment.label} • {lastResult.multiplier}× multiplier
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-medium text-muted-foreground">
                        Better luck next time!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lastResult.segment.label}
                      </p>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Net: {lastResult.net_change_bsk > 0 ? '+' : ''}
                    {lastResult.net_change_bsk.toFixed(2)} BSK
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Balance Info */}
        <div className="mx-4 mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Available Balance</span>
            <span className="font-bold">{bskBalance.toFixed(2)} BSK</span>
          </div>
        </div>
      </div>

      {/* Floating Bet Card */}
      <BetCardPro
        betAmount={betAmount}
        onBetChange={setBetAmount}
        minBet={config.min_bet_bsk}
        maxBet={config.max_bet_bsk}
        bskEquivalent={costs?.betBsk || 0}
        spinFee={config.post_free_spin_fee_bsk}
        isFree={costs?.isFree || false}
        isSpinning={isSpinning}
        canAfford={costs?.canAfford || false}
        onSpin={handleSpin}
      />

      {/* History Sheet */}
      <HistorySheet
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={spinHistory}
        onViewAll={() => navigate('/app/spin/history')}
      />
    </div>
  )
}
