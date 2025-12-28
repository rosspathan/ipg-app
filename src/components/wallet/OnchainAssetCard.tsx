import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import AssetLogo from '@/components/AssetLogo'

interface OnchainAssetCardProps {
  symbol: string
  name: string
  balance: number
  logoUrl?: string
  network: string
}

export function OnchainAssetCard({
  symbol,
  name,
  balance,
  logoUrl,
  network
}: OnchainAssetCardProps) {
  const navigate = useNavigate()

  const handleWithdraw = () => {
    navigate(`/app/wallet/withdraw?asset=${symbol}`)
  }

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/40 hover:border-primary/40 transition-all duration-220 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Asset Info */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
              <AssetLogo symbol={symbol} logoUrl={logoUrl} size="md" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-base">{symbol}</h3>
                {network && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                    {network.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{name}</p>
            </div>
          </div>

          {/* Withdraw Button */}
          <Button
            onClick={handleWithdraw}
            size="sm"
            variant="outline"
            className="shrink-0 hover:bg-primary/10 hover:border-primary/60 hover:text-primary transition-colors"
          >
            <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
            Withdraw
          </Button>
        </div>

        {/* On-chain Balance */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">On-chain Balance</span>
            <span className="font-mono text-lg font-semibold tabular-nums">
              {balance.toFixed(6)} <span className="text-sm text-muted-foreground">{symbol}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
