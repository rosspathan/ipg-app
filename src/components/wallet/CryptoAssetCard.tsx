import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useErc20OnchainBalance } from '@/hooks/useErc20OnchainBalance'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import AssetLogo from '@/components/AssetLogo'

interface CryptoAssetCardProps {
  symbol: string
  name: string
  balance: number
  available: number
  locked: number
  logoUrl?: string
  network: string
  onSync?: () => void
}

export function CryptoAssetCard({
  symbol,
  name,
  balance,
  available,
  locked,
  logoUrl,
  network,
  onSync
}: CryptoAssetCardProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [syncing, setSyncing] = useState(false)

  // Fetch real on-chain balance for supported assets
  const shouldFetchOnchain = ['USDT', 'BNB'].includes(symbol) && network === 'bsc'
  const { balance: onchainBalance, isLoading: onchainLoading, refetch } = useErc20OnchainBalance(
    shouldFetchOnchain ? symbol : '',
    'bsc'
  )

  const onchainAmount = parseFloat(onchainBalance || '0')
  const needsSync = shouldFetchOnchain && onchainAmount > available + 0.000001

  const handleWithdraw = () => {
    navigate(`/app/wallet/withdraw?asset=${symbol}`)
  }

  const handleSync = async () => {
    if (!onSync) return
    
    setSyncing(true)
    try {
      const { data, error } = await supabase.functions.invoke('discover-deposits', {
        body: { symbol, network: 'bsc', lookbackHours: 168 }
      })

      if (error) throw error

      if (data?.created > 0) {
        toast({
          title: "Sync Complete",
          description: `Found ${data.created} new ${symbol} deposit(s)`,
        })
        onSync()
        refetch()
      } else {
        toast({
          title: "No New Deposits",
          description: `No new ${symbol} deposits found`,
        })
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        title: "Sync Failed",
        description: "Failed to sync from blockchain",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
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

        {/* Balance Details */}
        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Total Balance</span>
            <span className="font-mono text-lg font-semibold tabular-nums">
              {balance.toFixed(6)} <span className="text-sm text-muted-foreground">{symbol}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-success">
              Available: {available.toFixed(6)}
            </span>
            {locked > 0 && (
              <span className="text-warning">
                Locked: {locked.toFixed(6)}
              </span>
            )}
          </div>

          {/* On-chain Balance */}
          {shouldFetchOnchain && !onchainLoading && (
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">On-chain Balance</span>
                <span className="font-mono tabular-nums">
                  {onchainAmount.toFixed(6)} {symbol}
                </span>
              </div>
            </div>
          )}

          {/* Sync Alert */}
          {needsSync && (
            <div className="pt-2">
              <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                <div className="flex-1 text-xs text-warning-foreground">
                  On-chain balance higher than credited balance
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  className="h-7 text-xs border-warning/40 text-warning hover:bg-warning/20"
                >
                  {syncing ? 'Syncing...' : 'Sync'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
