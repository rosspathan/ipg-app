import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useISmartSpin } from '@/hooks/useISmartSpin'
import { useProgramConfig } from '@/hooks/useProgramConfig'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { SpinWheel3D } from '@/components/spin/SpinWheel3D'
import { BetCardPro } from '@/components/spin/BetCardPro'
import { ProvablyFairPanel } from '@/components/spin/ProvablyFairPanel'
import { SpinResultModal } from '@/components/spin/SpinResultModal'
import { SpinHistoryItem } from '@/components/spin/SpinHistoryItem'
import { SpinDetailSheet } from '@/components/spin/SpinDetailSheet'
import { History } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useSpinMachine } from '@/hooks/useSpinMachine'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useSpinHistory, SpinHistoryItem as SpinHistoryItemType } from '@/hooks/useSpinHistory'
import { setBalanceNotificationSuppression } from '@/lib/balanceNotificationControl'

export default function ISmartSpinScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthUser()
  const [betAmount, setBetAmount] = useState(100)
  const [winningSegmentIndex, setWinningSegmentIndex] = useState<number>()
  const [showResultModal, setShowResultModal] = useState(false)
  const [selectedSpin, setSelectedSpin] = useState<SpinHistoryItemType | null>(null)

  // Fetch spin history from database
  const { history: spinHistory, refetch: refetchHistory } = useSpinHistory('all', 5)

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

  // Log on mount to verify V3 is rendering
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

  // Refetch history when a new spin result comes in
  useEffect(() => {
    if (lastResult) {
      refetchHistory()
    }
  }, [lastResult, refetchHistory])

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

    // Suppress balance notifications during spin animation
    setBalanceNotificationSuppression(true)

    // Clear previous winning segment BEFORE starting new spin
    setWinningSegmentIndex(undefined)
    spinMachine.send({ type: 'SPIN_CLICK' })

    const result = await performSpin(betAmount)
    if (result) {
      const segmentIndex = segments.findIndex(s => s.id === result.segment.id)
      // CRITICAL: Send machine event FIRST so isSpinning=true, THEN set winning index
      // This prevents result from flashing before wheel spins
      spinMachine.send({ type: 'COMMIT_OK', outcomeIndex: segmentIndex })
      setWinningSegmentIndex(segmentIndex)
    } else {
      spinMachine.send({ type: 'ERROR' })
    }
  }

  const handleSpinComplete = () => {
    console.info('SPIN_ANIM_COMPLETE', { outcomeIndex: winningSegmentIndex, spinId: spinMachine.spinId })
    spinMachine.send({ type: 'SPIN_ANIM_DONE' })
    
    // Re-enable balance notifications after wheel animation completes
    setBalanceNotificationSuppression(false)
    
    // Show result modal
    setShowResultModal(true)
    
    // Show toast AFTER wheel animation completes
    if (lastResult) {
      if ((lastResult.multiplier ?? 0) > 0) {
        toast({
          title: "🎉 You Won!",
          description: `${lastResult.segment?.label || 'WIN'} - Won ${Number(lastResult.net_payout_bsk ?? 0).toFixed(2)} BSK`,
        })
      } else {
        toast({
          title: "Better luck next time!",
          description: `${lastResult.segment?.label || 'LOSE'}`,
        })
      }
    }
    
    // Auto-handle result after modal shows
    setTimeout(() => {
      spinMachine.send({ type: 'RESULT_HANDLED' })
    }, 500)
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

        {/* Balance */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-card/50 border border-border/40">
          <p className="text-sm text-muted-foreground">Your Balance</p>
          <p className="text-lg font-bold text-foreground">
            {Number(bskBalance).toFixed(2)} BSK
          </p>
        </div>


        {/* Recent Spins History - Trust Wallet Style */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-base font-bold">Recent Spins</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/spin/history')}
              className="text-xs h-8 px-3 hover:bg-primary/10"
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              View All
            </Button>
          </div>

          {spinHistory.length === 0 ? (
            <Card className="border-dashed border-2 border-muted-foreground/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <span className="text-3xl">🎰</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">No spins yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Place your first bet to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden divide-y divide-border">
              {spinHistory.map((spin) => (
                <SpinHistoryItem
                  key={spin.id}
                  spin={spin}
                  onClick={() => setSelectedSpin(spin)}
                />
              ))}
            </Card>
          )}
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

      {/* Spin Detail Sheet */}
      <SpinDetailSheet
        spin={selectedSpin}
        open={!!selectedSpin}
        onOpenChange={(open) => !open && setSelectedSpin(null)}
      />

      {/* Result Modal */}
      <SpinResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        result={lastResult}
      />
    </div>
  )
}
