import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Gift, Shield, Clock, ArrowLeft, Eye, RefreshCw } from 'lucide-react'
import BonusBalanceCard from '@/components/BonusBalanceCard'
import { ProvablyFairWheel } from '@/components/ProvablyFairWheel'
import { useAuthUser } from '@/hooks/useAuthUser'

interface WheelConfig {
  id: string
  name: string
  min_bet_usdt: number
  max_bet_usdt: number
  fee_percentage: number
  free_spins_per_user: number
  house_edge_percentage: number
  target_rtp_percentage: number
}

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

interface SpinState {
  status: 'idle' | 'committing' | 'revealing' | 'spinning' | 'result'
  commit_id?: string
  server_seed_hash?: string
  client_seed?: string
}

interface SpinResult {
  winning_segment: WheelSegment
  winning_segment_index: number
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
  calculation_steps: string[]
}

export default function EnhancedProvablyFairSpinScreen() {
  const navigate = useNavigate()
  const { user } = useAuthUser()
  
  const [config, setConfig] = useState<WheelConfig | null>(null)
  const [segments, setSegments] = useState<WheelSegment[]>([])
  const [spinState, setSpinState] = useState<SpinState>({ status: 'idle' })
  const [result, setResult] = useState<SpinResult | null>(null)
  const [betAmount, setBetAmount] = useState(1)
  const [clientSeed, setClientSeed] = useState('')
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(5)
  const [loading, setLoading] = useState(true)
  const [balanceKey, setBalanceKey] = useState(0)

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
      if (user) {
        const { data: freeSpinsData, error: freeSpinsError } = await supabase
          .from('user_free_spins')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (freeSpinsError) {
          console.warn('Error loading free spins:', freeSpinsError)
        } else if (freeSpinsData) {
          setFreeSpinsRemaining(freeSpinsData.free_spins_remaining)
        } else if (configData) {
          setFreeSpinsRemaining(configData.free_spins_per_user)
        }
      }

    } catch (error: any) {
      console.error('Failed to load spin data:', error)
      toast.error('Failed to load spin wheel data')
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    if (!config || spinState.status !== 'idle') return

    try {
      setSpinState({ status: 'committing' })

      const { data, error } = await supabase.functions.invoke('provably-fair-commit', {
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
      toast.success('Server seed committed! Now provide your client seed to reveal the result.')

    } catch (error: any) {
      console.error('Commit failed:', error)
      toast.error(error.message || 'Failed to commit spin')
      setSpinState({ status: 'idle' })
    }
  }

  const handleReveal = async () => {
    if (!spinState.commit_id || !clientSeed || spinState.status !== 'revealing') return

    try {
      setSpinState({ ...spinState, status: 'spinning' })

      // Add 3-second spinning animation
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('provably-fair-reveal', {
            body: {
              commit_id: spinState.commit_id,
              client_seed: clientSeed
            }
          })

          if (error) throw error

          setResult(data.result)
          setSpinState({ status: 'result' })
          setBalanceKey(prev => prev + 1) // Force balance refresh
          
          const outcome = data.result.payout_amount >= 0 ? 'win' : 'loss'
          toast.success(`Spin complete! You ${outcome === 'win' ? 'won' : 'lost'} ${Math.abs(data.result.payout_amount)} ${data.result.payout_token}`)

        } catch (error: any) {
          console.error('Reveal failed:', error)
          toast.error(error.message || 'Failed to reveal spin result')
          setSpinState({ status: 'idle' })
        }
      }, 3000)

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
      navigate('/app/programs/spin/verify', {
        state: {
          server_seed: result.server_seed,
          client_seed: result.client_seed,
          nonce: result.nonce,
          result_hash: result.result_hash
        }
      })
    }
  }

  const isSpinDisabled = () => {
    return !config || !segments.length || spinState.status !== 'idle' || 
           betAmount < config.min_bet_usdt || betAmount > config.max_bet_usdt
  }

  const getSpinButtonText = () => {
    switch (spinState.status) {
      case 'committing': return 'Committing...'
      case 'revealing': return 'Reveal Result'
      case 'spinning': return 'Spinning...'
      case 'result': return 'Spin Again'
      default: return freeSpinsRemaining > 0 ? 'FREE SPIN' : `SPIN ($${(betAmount * (config?.fee_percentage || 0) / 100).toFixed(2)} fee)`
    }
  }

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
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-green-500" />
            Provably Fair Spin Wheel
          </h1>
          <p className="text-muted-foreground">Transparent and verifiable gaming</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Gift className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{freeSpinsRemaining}</div>
            <div className="text-sm text-muted-foreground">Free Spins Left</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <Shield className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-sm font-bold text-green-500">PROVABLY FAIR</div>
            <div className="text-xs text-muted-foreground">Verifiable Results</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <Clock className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{config?.fee_percentage}%</div>
            <div className="text-sm text-muted-foreground">Spin Fee</div>
          </CardContent>
        </Card>
      </div>

      {/* Spin Wheel */}
      {segments.length > 0 && (
        <div className="mb-6">
          <ProvablyFairWheel
            segments={segments}
            isSpinning={spinState.status === 'spinning'}
            winningSegmentIndex={result?.winning_segment_index}
            disabled={isSpinDisabled()}
          />
        </div>
      )}

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Spin Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bet_amount">Bet Amount (USDT)</Label>
            <Input
              id="bet_amount"
              type="number"
              min={config?.min_bet_usdt}
              max={config?.max_bet_usdt}
              step="0.01"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value))}
              disabled={spinState.status !== 'idle'}
            />
            <div className="text-xs text-muted-foreground mt-1">
              Range: ${config?.min_bet_usdt} - ${config?.max_bet_usdt}
            </div>
          </div>

          <div>
            <Label htmlFor="client_seed">Your Client Seed</Label>
            <div className="flex gap-2">
              <Input
                id="client_seed"
                value={clientSeed}
                onChange={(e) => setClientSeed(e.target.value)}
                disabled={spinState.status === 'spinning' || spinState.status === 'result'}
                placeholder="Enter your random seed"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={generateRandomClientSeed}
                disabled={spinState.status === 'spinning' || spinState.status === 'result'}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              This seed ensures the game is fair and verifiable
            </div>
          </div>

          <Button
            onClick={spinState.status === 'idle' ? handleCommit : 
                    spinState.status === 'revealing' ? handleReveal : resetSpin}
            disabled={isSpinDisabled() && spinState.status === 'idle'}
            className="w-full h-12 text-lg font-bold"
            variant={freeSpinsRemaining > 0 ? "default" : "secondary"}
          >
            {spinState.status === 'spinning' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getSpinButtonText()}
          </Button>

          {spinState.status !== 'idle' && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium">Spin Progress:</div>
              <div className="flex items-center gap-2">
                <Badge variant={spinState.status === 'committing' ? 'default' : 'outline'}>
                  1. Server Commit
                </Badge>
                <Badge variant={spinState.status === 'revealing' || spinState.status === 'spinning' ? 'default' : 'outline'}>
                  2. Client Reveal
                </Badge>
                <Badge variant={spinState.status === 'result' ? 'default' : 'outline'}>
                  3. Result
                </Badge>
              </div>
              
              {spinState.server_seed_hash && (
                <div className="text-xs">
                  <span className="font-medium">Server Seed Hash:</span>
                  <code className="ml-2 text-xs bg-background px-2 py-1 rounded">
                    {spinState.server_seed_hash.substring(0, 16)}...
                  </code>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Spin Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {result.winning_segment.label}
              </div>
              <div className="text-xl font-semibold mb-4">
                <span className={result.payout_amount >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {result.payout_amount >= 0 ? '+' : ''}{result.payout_amount} {result.payout_token}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Balance Change</div>
                  <div className={`font-medium ${result.balance_delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {result.balance_delta >= 0 ? '+' : ''}{result.balance_delta} BSK
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Fee Paid</div>
                  <div className="font-medium">{result.fee_amount} BSK</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Random Number</div>
                  <div className="font-mono text-xs">{result.random_number.toFixed(8)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Free Spin</div>
                  <Badge variant={result.is_free_spin ? 'default' : 'outline'}>
                    {result.is_free_spin ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-sm font-medium mb-2">Verification Data:</div>
              <div className="space-y-1 text-xs font-mono bg-muted p-3 rounded-lg">
                <div><strong>Server Seed:</strong> {result.server_seed.substring(0, 32)}...</div>
                <div><strong>Client Seed:</strong> {result.client_seed}</div>
                <div><strong>Nonce:</strong> {result.nonce}</div>
                <div><strong>Result Hash:</strong> {result.result_hash.substring(0, 32)}...</div>
              </div>
            </div>

            <Button
              onClick={navigateToVerify}
              variant="outline"
              className="w-full"
            >
              <Eye className="mr-2 h-4 w-4" />
              Verify This Result
            </Button>
          </CardContent>
        </Card>
      )}

      <BonusBalanceCard key={balanceKey} />
    </div>
  )
}