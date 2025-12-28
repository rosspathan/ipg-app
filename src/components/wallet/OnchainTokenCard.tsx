import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface OnchainTokenCardProps {
  symbol: string
  name: string
  logoUrl?: string
  onchainBalance: number
  appBalance: number
  isLoading?: boolean
  onRefresh?: () => void
}

export function OnchainTokenCard({
  symbol,
  name,
  logoUrl,
  onchainBalance,
  appBalance,
  isLoading,
  onRefresh
}: OnchainTokenCardProps) {
  const syncNeeded = onchainBalance > appBalance + 0.01

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={symbol}
              className="w-10 h-10 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg'
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-bold">{symbol.slice(0, 2)}</span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-foreground">{symbol} (BEP20)</h3>
            <p className="text-xs text-muted-foreground">{name}</p>
          </div>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">On-chain</p>
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <p className="text-xl font-bold text-foreground">
              {onchainBalance.toFixed(4)}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">App Balance</p>
          <p className="text-xl font-bold text-success">
            {appBalance.toFixed(4)}
          </p>
        </div>
      </div>

      {syncNeeded && (
        <div className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          +{(onchainBalance - appBalance).toFixed(4)} {symbol} pending sync
        </div>
      )}
    </div>
  )
}

export function OnchainTokenCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-7 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>
    </div>
  )
}
