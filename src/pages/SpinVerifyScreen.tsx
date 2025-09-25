import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { ArrowLeft, Shield, CheckCircle, XCircle, Calculator } from 'lucide-react'

interface VerificationResult {
  server_seed: string
  client_seed: string
  nonce: number
  result_hash: string
  random_number: number
  server_seed_verification?: {
    provided_hash: string
    computed_hash: string
    valid: boolean
  }
  calculation_steps: string[]
}

export default function SpinVerifyScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [serverSeed, setServerSeed] = useState('')
  const [clientSeed, setClientSeed] = useState('')
  const [nonce, setNonce] = useState(0)
  const [expectedHash, setExpectedHash] = useState('')
  const [verification, setVerification] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Pre-fill from navigation state if available
    if (location.state) {
      const { server_seed, client_seed, nonce: stateNonce, result_hash } = location.state
      if (server_seed) setServerSeed(server_seed)
      if (client_seed) setClientSeed(client_seed)
      if (stateNonce !== undefined) setNonce(stateNonce)
      if (result_hash) setExpectedHash(result_hash)
    }
  }, [location.state])

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed || nonce === undefined) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      
      const { data, error } = await supabase.functions.invoke('spin-verify', {
        body: {
          server_seed: serverSeed,
          client_seed: clientSeed,
          nonce: nonce,
          expected_result_hash: expectedHash
        }
      })

      if (error) throw error

      setVerification(data.verification)
      toast.success('Verification complete!')
      
    } catch (error: any) {
      console.error('Verification failed:', error)
      toast.error(error.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
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
            Spin Verification
          </h1>
          <p className="text-muted-foreground">Verify the fairness of any spin result</p>
        </div>
      </div>

      {/* Verification Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enter Spin Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Server Seed
            </label>
            <div className="flex gap-2">
              <Input
                value={serverSeed}
                onChange={(e) => setServerSeed(e.target.value)}
                placeholder="Enter server seed (revealed after spin)..."
                className="font-mono"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(serverSeed)}
                disabled={!serverSeed}
              >
                Copy
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Client Seed
            </label>
            <div className="flex gap-2">
              <Input
                value={clientSeed}
                onChange={(e) => setClientSeed(e.target.value)}
                placeholder="Enter your client seed..."
                className="font-mono"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(clientSeed)}
                disabled={!clientSeed}
              >
                Copy
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Nonce
            </label>
            <Input
              type="number"
              value={nonce}
              onChange={(e) => setNonce(Number(e.target.value))}
              placeholder="Enter nonce (usually 0)..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Expected Result Hash (Optional)
            </label>
            <Input
              value={expectedHash}
              onChange={(e) => setExpectedHash(e.target.value)}
              placeholder="Enter expected result hash for verification..."
              className="font-mono"
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={loading || !serverSeed || !clientSeed}
            className="w-full"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {loading ? 'Verifying...' : 'Verify Spin'}
          </Button>
        </CardContent>
      </Card>

      {/* Verification Results */}
      {verification && (
        <div className="space-y-6">
          {/* Server Seed Verification */}
          {verification.server_seed_verification && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {verification.server_seed_verification.valid ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Server Seed Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <strong>Provided Hash:</strong>
                    <div className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                      {verification.server_seed_verification.provided_hash}
                    </div>
                  </div>
                  <div>
                    <strong>Computed Hash:</strong>
                    <div className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                      {verification.server_seed_verification.computed_hash}
                    </div>
                  </div>
                  <Badge 
                    variant={verification.server_seed_verification.valid ? "default" : "destructive"}
                    className="mt-2"
                  >
                    {verification.server_seed_verification.valid ? "✅ Valid" : "❌ Invalid"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result Calculation */}
          <Card>
            <CardHeader>
              <CardTitle>Result Calculation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <strong>Final Result:</strong>
                  <div className="text-2xl font-mono mt-1 p-2 bg-primary/10 rounded text-center">
                    {verification.random_number.toFixed(10)}
                  </div>
                  <div className="text-sm text-muted-foreground text-center mt-1">
                    Random number between 0 and 1
                  </div>
                </div>

                <div>
                  <strong>Result Hash:</strong>
                  <div className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                    {verification.result_hash}
                  </div>
                </div>

                <div>
                  <strong>Calculation Steps:</strong>
                  <div className="space-y-2 mt-2">
                    {verification.calculation_steps.map((step, index) => (
                      <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Input Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Inputs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Server Seed:</strong>
                  <div className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                    {verification.server_seed}
                  </div>
                </div>
                <div>
                  <strong>Client Seed:</strong>
                  <div className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                    {verification.client_seed}
                  </div>
                </div>
                <div>
                  <strong>Nonce:</strong>
                  <div className="font-mono text-sm bg-muted p-2 rounded mt-1">
                    {verification.nonce}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>How Provably Fair Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>1. Commitment Phase:</strong> Server generates a random seed and commits to its SHA-256 hash before you play.</p>
                <p><strong>2. Client Input:</strong> You provide your own random client seed (or let the system generate one).</p>
                <p><strong>3. Result Generation:</strong> The final result is calculated using: SHA-256(server_seed:client_seed:nonce)</p>
                <p><strong>4. Verification:</strong> After the spin, the server reveals the original seed, allowing you to verify the result was not manipulated.</p>
                <p><strong>5. Fairness Guarantee:</strong> Since the server committed to its seed before knowing your input, the result cannot be rigged in the house's favor.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}