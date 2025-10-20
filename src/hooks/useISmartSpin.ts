import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useUserBSKBalance } from './useUserBSKBalance'

interface SpinConfig {
  id: string
  min_bet_bsk: number
  max_bet_bsk: number
  post_free_spin_fee_bsk: number
  winner_profit_fee_percent: number
  free_spins_per_user: number
  is_active: boolean
}

interface SpinSegment {
  id: string
  label: string
  multiplier: number
  weight: number
  color_hex: string
  is_active: boolean
}

interface UserLimits {
  id: string
  user_id: string
  free_spins_remaining: number
  total_spins: number
  total_bet_bsk: number
  total_won_bsk: number
}

interface SpinResult {
  success: boolean
  segment: SpinSegment
  multiplier: number
  payout_bsk: number
  profit_fee_bsk: number
  net_payout_bsk: number
  net_change_bsk: number
  server_seed: string
  result_value: number
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
  const { balance } = useUserBSKBalance()

  // Load spin configuration and user data
  const loadSpinData = async () => {
    try {
      setIsLoading(true)

      // Get active config
      const { data: configData, error: configError } = await supabase
        .from('spin_config')
        .select('*')
        .eq('is_active', true)
        .single()

      if (configError) {
        console.error('Config error:', configError)
        setConfig(null)
        setIsLoading(false)
        return
      }

      setConfig(configData)

      // Get active segments
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('spin_segments')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (segmentsError) {
        console.error('Segments error:', segmentsError)
      }

      // Use database segments (admin-configurable)
      const normalizedSegments = (segmentsData || []).map((s: any) => ({
        id: s.id,
        label: s.label,
        multiplier: s.multiplier,
        weight: s.weight,
        color_hex: s.color_hex,
        is_active: s.is_active
      }))
      
      setSegments(normalizedSegments)
      
      // Get user limits
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        let { data: limitsData, error: limitsError } = await supabase
          .from('spin_user_limits')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!limitsData && !limitsError) {
          // Create initial limits
          const { data: newLimits, error: insertError } = await supabase
            .from('spin_user_limits')
            .insert({
              user_id: user.id,
              free_spins_remaining: configData.free_spins_per_user
            })
            .select()
            .single()

          if (!insertError) {
            limitsData = newLimits
          }
        }

        setUserLimits(limitsData || null)
      }

    } catch (error) {
      console.error('Load spin data error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Perform spin
  const performSpin = async (betBsk: number): Promise<SpinResult | null> => {
    if (!config || isSpinning) return null

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to spin",
        variant: "destructive"
      })
      return null
    }

    try {
      setIsSpinning(true)

      // Step 1: Commit
      const { data: commitData, error: commitError } = await supabase.functions.invoke(
        'spin-commit',
        {
          body: { betBsk }
        }
      )

      if (commitError || !commitData?.success) {
        throw new Error(commitData?.error || 'Failed to commit spin')
      }

      const { serverSeedHash, clientSeed, nonce, spinFee, isFree } = commitData

      // Step 2: Reveal (process the spin)
      const { data: revealData, error: revealError } = await supabase.functions.invoke(
        'spin-reveal',
        {
          body: {
            serverSeedHash,
            clientSeed,
            nonce,
            betBsk,
            spinFee,
            isFree
          }
        }
      )

      if (revealError || !revealData?.success) {
        throw new Error(revealData?.error || 'Failed to reveal spin result')
      }

      const result: SpinResult = revealData
      setLastResult(result)

      // Update local state
      await loadSpinData()

      // Show result toast
      if (result.multiplier > 0) {
        toast({
          title: "🎉 You Won!",
          description: `${result.segment.label} - Won ${Number(result.net_payout_bsk ?? 0).toFixed(2)} BSK`,
          variant: "default"
        })
      } else {
        toast({
          title: "Better luck next time!",
          description: `${result.segment.label}`,
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
  const calculateCosts = (betBsk: number) => {
    if (!config) return null

    const isFree = userLimits ? userLimits.free_spins_remaining > 0 : false
    const feeBsk = isFree ? 0 : config.post_free_spin_fee_bsk
    const totalCost = betBsk + feeBsk

    return {
      betBsk,
      feeBsk,
      totalCost,
      isFree,
      canAfford: bskBalance >= totalCost
    }
  }

  useEffect(() => {
    loadSpinData()
  }, [])

  // Update BSK balance from useUserBSKBalance hook
  useEffect(() => {
    setBskBalance(balance.withdrawable)
  }, [balance.withdrawable])

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