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
import { History, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useSpinMachine } from '@/hooks/useSpinMachine'
import { useAuthUser } from '@/hooks/useAuthUser'
import { setBalanceNotificationSuppression } from '@/lib/balanceNotificationControl'

export default function ISmartSpinScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthUser()
  const [betAmount, setBetAmount] = useState(100)
  const [winningSegmentIndex, setWinningSegmentIndex] = useState<number>()
  const [showResultModal, setShowResultModal] = useState(false)
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


        {/* Recent Spins History - Premium Design */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Recent Spins
              </h3>
              {spinHistory.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                  {spinHistory.length}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/spin/history')}
              className="text-xs h-8 px-3 hover:bg-primary/10 transition-all"
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              View All
            </Button>
          </div>

          {spinHistory.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-br from-muted/40 to-muted/20 border-2 border-dashed border-muted-foreground/20 p-8 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
              <div className="relative space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                  <div className="text-3xl">🎰</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No spins yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Place your first bet to get started
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {spinHistory.slice(0, 5).map((spin, index) => {
                const isNewest = index === 0;
                const isWin = (spin.multiplier || 0) > 0;
                const isBigWin = (spin.multiplier || 0) >= 1.5;
                
                return (
                  <div
                    key={spin.server_seed || index}
                    className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                      isWin 
                        ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10' 
                        : 'bg-gradient-to-br from-red-500/10 via-red-400/5 to-transparent border-red-500/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10'
                    } ${isNewest ? 'animate-scale-in ring-2 ring-primary/30' : 'hover:scale-[1.01]'}`}
                    style={{
                      animation: isNewest ? 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : undefined
                    }}
                  >
                    {/* Accent stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      isWin ? 'bg-gradient-to-b from-emerald-500 to-emerald-600' : 'bg-gradient-to-b from-red-500 to-red-600'
                    }`} />

                    {/* Glow effect */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      isWin ? 'shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'shadow-[0_0_30px_rgba(239,68,68,0.15)]'
                    }`} />

                    {/* Multiplier Badge */}
                    <div
                      className={`relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-transform group-hover:scale-105 ${
                        isWin 
                          ? 'bg-gradient-to-br from-emerald-500/30 via-emerald-500/20 to-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-500/20' 
                          : 'bg-gradient-to-br from-red-500/30 via-red-500/20 to-red-500/10 text-red-500 shadow-lg shadow-red-500/20'
                      }`}
                    >
                      {spin.multiplier}x
                      {isBigWin && (
                        <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="relative flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {spin.segment?.label || 'LOSE'}
                        </span>
                        {isNewest && (
                          <span className="text-xs animate-pulse">✨</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(spin.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Bet: {Number(spin.bet_bsk ?? 0).toFixed(0)} BSK
                      </div>
                    </div>

                    {/* Net Change */}
                    <div className="relative text-right">
                      <div className={`text-base font-bold ${
                        (spin.net_change_bsk ?? 0) > 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {(spin.net_change_bsk ?? 0) > 0 ? '+' : ''}
                        {Number(spin.net_change_bsk ?? 0).toFixed(0)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">BSK</div>
                    </div>
                  </div>
                );
              })}
            </div>
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

      {/* Result Modal */}
      <SpinResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        result={lastResult}
      />
    </div>
  )
}
