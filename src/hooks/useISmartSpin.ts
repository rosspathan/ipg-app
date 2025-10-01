import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface SpinConfig {
  id: string
  is_enabled: boolean
  min_bet_inr: number
  max_bet_inr: number
  free_spins_count: number
  post_free_fee_inr: number
  risk_free_free_spins: boolean
  bsk_inr_rate: number
}

interface SpinSegment {
  id: string
  label: string
  multiplier: number
  weight: number
  color_hex: string
  position_order: number
}

interface UserLimits {
  free_spins_remaining: number
  daily_spins_count: number
  lifetime_spins_count: number
}

interface SpinResult {
  spin_id: string
  segment: SpinSegment
  multiplier: number
  bet_bsk: number
  fee_bsk: number
  payout_bsk: number
  net_change_bsk: number
  new_balance_bsk: number
  was_free_spin: boolean
  was_risk_free: boolean
  verify_data: any
}

export function useISmartSpin() {
  const [config, setConfig] = useState<SpinConfig | null>(null)
  const [segments, setSegments] = useState<SpinSegment[]>([])
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null)
  const [bskBalance, setBskBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSpinning, setIsSpinning] = useState(false)
  const [lastResult, setLastResult] = useState<SpinResult | null>(null)
  const { toast } = useToast()

  // Load spin configuration and user data
  const loadSpinData = async () => {
    try {
      setIsLoading(true)

      // Get active config
      const { data: configData, error: configError } = await supabase
        .from('ismart_spin_config')
        .select('*')
        .eq('is_enabled', true)
        .single()

      if (configError) {
        console.error('Config error:', configError)
        toast({
          title: "Error",
          description: "Failed to load spin wheel configuration",
          variant: "destructive"
        })
        return
      }

      setConfig(configData)

      // Get active segments
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('ismart_spin_segments')
        .select('*')
        .eq('config_id', configData.id)
        .eq('is_active', true)
        .order('position_order')

      if (segmentsError) {
        console.error('Segments error:', segmentsError)
        toast({
          title: "Error", 
          description: "Failed to load spin wheel segments",
          variant: "destructive"
        })
        return
      }

      setSegments(segmentsData || [])

      // Get user limits
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: limitsData, error: limitsError } = await supabase
          .from('ismart_user_limits')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!limitsData && !limitsError) {
          // Create initial limits
          const { data: newLimits, error: insertError } = await supabase
            .from('ismart_user_limits')
            .insert({
              user_id: user.id,
              free_spins_remaining: configData.free_spins_count
            })
            .select()
            .single()

          if (!insertError) {
            setUserLimits({
              free_spins_remaining: newLimits.free_spins_remaining,
              daily_spins_count: newLimits.daily_spins_count,
              lifetime_spins_count: newLimits.lifetime_spins_count
            })
          }
        } else if (limitsData) {
          setUserLimits({
            free_spins_remaining: limitsData.free_spins_remaining,
            daily_spins_count: limitsData.daily_spins_count,
            lifetime_spins_count: limitsData.lifetime_spins_count
          })
        }

        // Get BSK balance
        const { data: balanceData, error: balanceError } = await supabase
          .from('user_bsk_balance_summary')
          .select('withdrawable_balance')
          .eq('user_id', user.id)
          .maybeSingle()

        if (balanceData) {
          setBskBalance(balanceData.withdrawable_balance)
        } else if (!balanceError) {
          // Create initial balance record
          await supabase
            .from('user_bsk_balance_summary')
            .insert({ user_id: user.id })
        }
      }

    } catch (error) {
      console.error('Load spin data error:', error)
      toast({
        title: "Error",
        description: "Failed to load spin wheel data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Perform spin
  const performSpin = async (betInr: number): Promise<SpinResult | null> => {
    if (!config || isSpinning) return null

    try {
      setIsSpinning(true)

      // Generate client seed
      const clientSeed = Array.from({ length: 16 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')

      // Step 1: Commit
      const { data: commitData, error: commitError } = await supabase.functions.invoke(
        'ismart-spin-commit',
        {
          body: {
            bet_inr: betInr,
            client_seed: clientSeed,
            idempotency_key: crypto.randomUUID()
          }
        }
      )

      if (commitError || !commitData?.success) {
        throw new Error(commitData?.error || 'Failed to commit spin')
      }

      // Step 2: Reveal (process the spin)
      const { data: revealData, error: revealError } = await supabase.functions.invoke(
        'ismart-spin-reveal',
        {
          body: commitData.commit_data
        }
      )

      if (revealError || !revealData?.success) {
        throw new Error(revealData?.error || 'Failed to reveal spin result')
      }

      const result = revealData.result
      setLastResult(result)

      // Update local state
      await loadSpinData()

      // Show result toast
      if (result.multiplier > 0) {
        toast({
          title: "🎉 You Won!",
          description: `${result.segment.label} - Won ${result.payout_bsk.toFixed(2)} BSK`,
          variant: "default"
        })
      } else {
        toast({
          title: "😅 Better luck next time!",
          description: `${result.segment.label} - Try again!`,
          variant: "destructive"
        })
      }

      return result

    } catch (error) {
      console.error('Spin error:', error)
      toast({
        title: "Spin Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
      return null
    } finally {
      setIsSpinning(false)
    }
  }

  // Calculate costs for a bet
  const calculateCosts = (betInr: number) => {
    if (!config || !userLimits) return null

    const betBsk = betInr / config.bsk_inr_rate
    const isFree = userLimits.free_spins_remaining > 0
    const feeInr = isFree ? 0 : config.post_free_fee_inr
    const feeBsk = feeInr / config.bsk_inr_rate
    const totalCost = betBsk + feeBsk

    return {
      betBsk,
      feeInr,
      feeBsk,
      totalCost,
      isFree,
      canAfford: bskBalance >= totalCost
    }
  }

  useEffect(() => {
    loadSpinData()
  }, [])

  return {
    config,
    segments,
    userLimits,
    bskBalance,
    isLoading,
    isSpinning,
    lastResult,
    performSpin,
    calculateCosts,
    refreshData: loadSpinData
  }
}