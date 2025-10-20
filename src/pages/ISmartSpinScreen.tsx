import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useISmartSpin } from '@/hooks/useISmartSpin'
import { useProgramConfig } from '@/hooks/useProgramConfig'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { SpinWheel3D } from '@/components/spin/SpinWheel3D'
import { BetCardPro } from '@/components/spin/BetCardPro'
import { ProvablyFairPanel } from '@/components/spin/ProvablyFairPanel'
import { HistorySheet } from '@/components/spin/HistorySheet'
import { History } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useSpinMachine } from '@/hooks/useSpinMachine'
import { useAuthUser } from '@/hooks/useAuthUser'

export default function ISmartSpinScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthUser()
  const [betAmount, setBetAmount] = useState(100)
  const [winningSegmentIndex, setWinningSegmentIndex] = useState<number>()
  const [showHistory, setShowHistory] = useState(false)
  const [spinHistory, setSpinHistory] = useState<any[]>([])

  // Fetch program configuration
  const { data: programConfig } = useProgramConfig("spin");
  const programCfg = programConfig as any || {};
  const allowedBets = programCfg?.betting?.allowedBets || [10, 50, 100, 500];

  const spinMachine = useSpinMachine()
  
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
    if (segments.length > 0) {
      console.log('Spin wheel loaded with', segments.length, 'segments')
    }
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
    if (!config || isSpinning || !spinMachine.isIdle) return

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
    spinMachine.send({ type: 'SPIN_CLICK' })

    const result = await performSpin(betAmount)
    if (result) {
      const segmentIndex = segments.findIndex(s => s.id === result.segment.id)
      setWinningSegmentIndex(segmentIndex)
      spinMachine.send({ type: 'COMMIT_OK', outcomeIndex: segmentIndex })
    } else {
      spinMachine.send({ type: 'ERROR' })
    }
  }

  const handleSpinComplete = () => {
    console.info('SPIN_ANIM_COMPLETE', { outcomeIndex: winningSegmentIndex, spinId: spinMachine.spinId })
    spinMachine.send({ type: 'SPIN_ANIM_DONE' })
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
      <div className="min-h-screen flex items-center justify-center px-4">
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
    )
  }

  const costs = calculateCosts(betAmount)

  return (
    <div 
      data-testid="page-spin-v3"
      className="min-h-screen pb-48"
    >
      <div className="max-w-md mx-auto px-4 space-y-6 pt-4">
        {/* Free Spins Banner */}
        {user && userLimits && userLimits.free_spins_remaining > 0 && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              🎉 {userLimits.free_spins_remaining} Free Spins Remaining!
            </p>
          </div>
        )}

        {/* Spin Wheel */}
        <div className="flex flex-col items-center justify-center py-6">
          <SpinWheel3D
            segments={segments}
            isSpinning={spinMachine.isSpinning}
            winningSegmentIndex={winningSegmentIndex}
            spinId={spinMachine.spinId}
            onSpinComplete={handleSpinComplete}
          />
        </div>

        {/* Balance & Last Result */}
        <div className="space-y-3">
          {/* Balance */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-card/50 border border-border/40">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-lg font-bold text-foreground">
              {Number(bskBalance).toFixed(2)} BSK
            </p>
          </div>

          {/* Last Result */}
          {lastResult && (
            <div className="px-4 py-3 rounded-xl bg-card/50 border border-border/40 text-center">
              <p className="text-xs text-muted-foreground mb-1">Last Result</p>
              <p className={`text-2xl font-bold ${
                lastResult.multiplier > 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {lastResult.multiplier > 0 
                  ? `🎉 WIN +${Number(lastResult.net_payout_bsk ?? 0).toFixed(2)} BSK`
                  : '💔 LOSE'
                }
              </p>
            </div>
          )}
        </div>

        {/* History Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="text-xs"
          >
            <History className="w-3 h-3 mr-1" />
            View Spin History
          </Button>
        </div>

        {/* Provably Fair Panel */}
        <ProvablyFairPanel />
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
        isSpinning={isSpinning || !spinMachine.isIdle}
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
