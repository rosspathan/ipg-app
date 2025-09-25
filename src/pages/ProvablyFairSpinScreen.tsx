import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Gift, Shield, Clock, ArrowLeft, Eye } from 'lucide-react'
import BonusBalanceCard from '@/components/BonusBalanceCard'
import { ProvablyFairWheel } from '@/components/gamification/ProvablyFairWheel'

interface WheelSegment {
  id: number
  label: string
  weight: number
  min_payout: number
  max_payout: number
  payout_token: string
  color_hex: string
  is_active: boolean
}

interface WheelConfig {
  min_bet_usdt: number
  max_bet_usdt: number
  fee_percentage: number
  house_edge_percentage: number
}

interface SpinState {
  status: 'idle' | 'committing' | 'revealing' | 'spinning' | 'result'
  commit_id?: string
  server_seed_hash?: string
  client_seed?: string
}

interface SpinResult {
  winning_segment_label: string
  payout_amount: number
  payout_token: string
  balance_delta: number
  server_seed: string
  client_seed: string
  nonce: number
  result_hash: string
  random_number: number
  is_free_spin: boolean
  fee_amount: number
  free_spins_remaining: number
}

export default function ProvablyFairSpinScreen() {
  const navigate = useNavigate()
  const [segments, setSegments] = useState<WheelSegment[]>([])
  const [config, setConfig] = useState<WheelConfig | null>(null)
  const [spinState, setSpinState] = useState<SpinState>({ status: 'idle' })
  const [result, setResult] = useState<SpinResult | null>(null)
  const [betAmount, setBetAmount] = useState(1)
  const [clientSeed, setClientSeed] = useState('')
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(5)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSpinData()
    generateRandomClientSeed()
  }, [])

  const generateRandomClientSeed = () => {
    const seed = Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
    setClientSeed(seed)
  }

  const loadSpinData = async () => {
    try {
      setLoading(true)
      
      // Load wheel configuration
      const { data: configData, error: configError } = await supabase
        .from('spin_wheel_config')
        .select('*')
        .eq('is_active', true)
        .single()

      if (configError) throw configError
      setConfig(configData)

      // Load wheel segments
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('spin_wheel_segments')
        .select('*')
        .eq('is_active', true)
        .order('id')

      if (segmentsError) throw segmentsError
      setSegments(segmentsData || [])

      // Load user free spins
      const { data: freeSpinsData, error: freeSpinsError } = await supabase
        .from('user_free_spins')
        .select('free_spins_remaining')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle()

      if (!freeSpinsError && freeSpinsData) {
        setFreeSpinsRemaining(freeSpinsData.free_spins_remaining)
      }

    } catch (error) {
      console.error('Failed to load spin data:', error)
      toast.error('Failed to load spin wheel data')
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    if (!config) return

    try {
      setSpinState({ status: 'committing' })
      
      const { data, error } = await supabase.functions.invoke('spin-commit', {
        body: {
          bet_amount: betAmount,
          bet_token: 'USDT'
        }
      })

      if (error) throw error

      setSpinState({
        status: 'revealing',
        commit_id: data.commit_id,
        server_seed_hash: data.server_seed_hash
      })

      setFreeSpinsRemaining(data.free_spins_remaining)
      
      toast.success('Spin committed! Now provide your client seed to reveal result.')
      
    } catch (error: any) {
      console.error('Commit failed:', error)
      toast.error(error.message || 'Failed to commit spin')
      setSpinState({ status: 'idle' })
    }
  }

  const handleReveal = async () => {
    if (!spinState.commit_id || !clientSeed) return

    try {
      setSpinState(prev => ({ ...prev, status: 'spinning', client_seed: clientSeed }))

      const { data, error } = await supabase.functions.invoke('spin-reveal', {
        body: {
          commit_id: spinState.commit_id,
          client_seed: clientSeed
        }
      })

      if (error) throw error

      // Show spinning animation
      setTimeout(() => {
        setResult(data.result)
        setSpinState({ status: 'result' })
        setFreeSpinsRemaining(data.result.free_spins_remaining)
        
        const isWin = data.result.balance_delta > 0
        toast.success(
          isWin 
            ? `🎉 You won ${data.result.payout_amount} ${data.result.payout_token}!`
            : `Spin complete. Better luck next time!`
        )
      }, 3000) // 3 second spin animation

    } catch (error: any) {
      console.error('Reveal failed:', error)
      toast.error(error.message || 'Failed to reveal spin result')
      setSpinState({ status: 'idle' })
    }
  }

  const resetSpin = () => {
    setSpinState({ status: 'idle' })
    setResult(null)
    generateRandomClientSeed()
  }

  const navigateToVerify = () => {
    if (result) {
      navigate('/app/spin-verify', {
        state: {
          server_seed: result.server_seed,
          client_seed: result.client_seed,
          nonce: result.nonce,
          result_hash: result.result_hash,
          random_number: result.random_number
        }
      })
    }
  }

  const isSpinDisabled = () => {
    if (!config) return true
    if (betAmount < config.min_bet_usdt || betAmount > config.max_bet_usdt) return true
    if (spinState.status === 'committing' || spinState.status === 'spinning') return true
    return false
  }

  const getSpinButtonText = () => {
    switch (spinState.status) {
      case 'committing': return 'Committing...'
      case 'revealing': return 'Reveal Result'
      case 'spinning': return 'Spinning...'
      case 'result': return 'Spin Again'
      default: return 'Commit Spin'
    }
  }

  const isFreeSpinAvailable = freeSpinsRemaining > 0
  const spinFee = isFreeSpinAvailable ? 0 : betAmount * (config?.fee_percentage || 5) / 100

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/home')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Provably Fair Spin Wheel</h1>
          <p className="text-muted-foreground">Verifiable random outcomes with cryptographic proofs</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{freeSpinsRemaining}</div>
            <div className="text-sm text-muted-foreground">Free Spins Left</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">100%</div>
            <div className="text-sm text-muted-foreground">Provably Fair</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">${spinFee.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Spin Fee</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Spin Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Wheel */}
        <Card>
          <CardHeader>
            <CardTitle>Spin Wheel</CardTitle>
          </CardHeader>
          <CardContent>
            <ProvablyFairWheel
              segments={segments}
              isSpinning={spinState.status === 'spinning'}
              winningSegment={result ? segments.find(s => s.label === result.winning_segment_label) : undefined}
            />
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Spin Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bet Amount */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Bet Amount (USDT)
              </label>
              <Input
                type="number"
                min={config?.min_bet_usdt || 1}
                max={config?.max_bet_usdt || 100}
                step="0.01"
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                disabled={spinState.status !== 'idle' && spinState.status !== 'result'}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Range: ${config?.min_bet_usdt} - ${config?.max_bet_usdt}
              </div>
            </div>

            {/* Client Seed */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Client Seed (Your Random Input)
              </label>
              <div className="flex gap-2">
                <Input
                  value={clientSeed}
                  onChange={(e) => setClientSeed(e.target.value)}
                  disabled={spinState.status !== 'idle' && spinState.status !== 'result'}
                  placeholder="Enter your random seed..."
                />
                <Button
                  variant="outline"
                  onClick={generateRandomClientSeed}
                  disabled={spinState.status !== 'idle' && spinState.status !== 'result'}
                >
                  Random
                </Button>
              </div>
            </div>

            {/* Server Seed Hash */}
            {spinState.server_seed_hash && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Server Seed Hash (Committed)
                </label>
                <div className="p-2 bg-muted rounded font-mono text-xs break-all">
                  {spinState.server_seed_hash}
                </div>
              </div>
            )}

            {/* Spin Button */}
            <Button
              onClick={spinState.status === 'revealing' ? handleReveal : (spinState.status === 'result' ? resetSpin : handleCommit)}
              disabled={isSpinDisabled()}
              className="w-full"
              size="lg"
            >
              {spinState.status === 'committing' || spinState.status === 'spinning' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {getSpinButtonText()}
            </Button>

            {/* Spin Type Badge */}
            <div className="text-center">
              {isFreeSpinAvailable ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  🎁 FREE SPIN
                </Badge>
              ) : (
                <Badge variant="outline">
                  💰 Fee: {spinFee.toFixed(2)} BSK
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result Display */}
      {result && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Spin Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div><strong>Winning Segment:</strong> {result.winning_segment_label}</div>
                <div><strong>Payout:</strong> {result.payout_amount} {result.payout_token}</div>
                <div><strong>Balance Change:</strong> 
                  <span className={result.balance_delta >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {result.balance_delta >= 0 ? '+' : ''}{result.balance_delta.toFixed(2)} BSK
                  </span>
                </div>
                <div><strong>Free Spin:</strong> {result.is_free_spin ? 'Yes' : 'No'}</div>
              </div>
              <div className="space-y-2">
                <div><strong>Random Number:</strong> {result.random_number.toFixed(10)}</div>
                <div><strong>Result Hash:</strong> 
                  <div className="font-mono text-xs break-all bg-muted p-2 rounded">
                    {result.result_hash}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={navigateToVerify}
                  className="w-full mt-2"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Verify Result
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Card */}
      <BonusBalanceCard />
    </div>
  )
}