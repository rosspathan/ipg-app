import React, { useState } from 'react'
import { Shield, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'

export function ProvablyFairPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const navigate = useNavigate()

  return (
    <Card data-testid="provably-fair" className="mx-4 mb-4">
      <CardHeader className="pb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
          aria-expanded={isExpanded}
          aria-controls="provably-fair-content"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <CardTitle className="text-sm">Provably Fair — Verifiable Randomness</CardTitle>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      <div
        id="provably-fair-content"
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Each spin uses a commit–reveal seed pair to ensure fairness. The result is determined
            before you spin, but kept secret until revealed. You can verify every spin independently.
          </p>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/spin/verify')}
              className="w-full justify-between text-xs"
            >
              <span>View Proof & Seeds</span>
              <ExternalLink className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://docs.example.com/provably-fair', '_blank')}
              className="w-full justify-between text-xs"
            >
              <span>Learn How It Works</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>

          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground">
              <strong>How it works:</strong>
              <br />
              1. Server generates a random seed (hashed)
              <br />
              2. You provide a client seed
              <br />
              3. Combined seeds determine the result
              <br />
              4. After spin, server reveals original seed for verification
            </p>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
