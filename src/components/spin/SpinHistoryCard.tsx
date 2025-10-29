import React from 'react'
import { TrendingUp, TrendingDown, ExternalLink, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface SpinHistoryCardProps {
  spin: {
    id: string
    created_at: string
    bet_bsk: number
    payout_bsk: number
    net_change_bsk: number
    multiplier: number
    segment_label: string
    server_seed_hash: string
  }
  isFirst?: boolean
}

export function SpinHistoryCard({ spin, isFirst }: SpinHistoryCardProps) {
  const isWin = spin.multiplier > 0
  const isBigWin = spin.multiplier >= 1.5

  return (
    <div
      className={`group relative rounded-xl border-2 transition-all duration-300 overflow-hidden ${
        isWin 
          ? 'bg-gradient-to-br from-emerald-500/5 via-emerald-400/3 to-transparent border-emerald-500/30 hover:border-emerald-500/50' 
          : 'bg-gradient-to-br from-red-500/5 via-red-400/3 to-transparent border-red-500/30 hover:border-red-500/50'
      } ${isFirst ? 'animate-scale-in shadow-lg' : 'hover:shadow-md hover:scale-[1.01]'}`}
      style={{ 
        animation: isFirst ? 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : undefined 
      }}
    >
      {/* Accent stripe */}
      <div 
        className={`absolute left-0 top-0 bottom-0 w-1 ${
          isWin ? 'bg-gradient-to-b from-emerald-500 to-emerald-600' : 'bg-gradient-to-b from-red-500 to-red-600'
        }`} 
      />

      {/* Glow effect on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        isWin ? 'shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'shadow-[0_0_30px_rgba(239,68,68,0.15)]'
      }`} />

      <div className="relative flex items-center gap-4 p-4 pl-5">
        {/* Multiplier Badge */}
        <div
          className={`relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg transition-transform group-hover:scale-105 ${
            isWin 
              ? 'bg-gradient-to-br from-emerald-500/30 via-emerald-500/20 to-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-500/20' 
              : 'bg-gradient-to-br from-red-500/30 via-red-500/20 to-red-500/10 text-red-500 shadow-lg shadow-red-500/20'
          }`}
        >
          {spin.multiplier}x
          {isBigWin && (
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 animate-pulse" />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top row: segment label + time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={isWin ? "default" : "secondary"}
                className={`text-[10px] font-semibold px-2 py-0.5 ${
                  isWin 
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                }`}
              >
                {isWin ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {spin.segment_label}
              </Badge>
              {isFirst && (
                <span className="text-xs animate-pulse">✨</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {spin.created_at && !isNaN(new Date(spin.created_at).getTime())
                ? formatDistanceToNow(new Date(spin.created_at), { addSuffix: true })
                : 'Just now'}
            </span>
          </div>

          {/* Middle row: bet info */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Bet:</span>
              <span className="font-medium text-foreground">{(spin.bet_bsk ?? 0).toFixed(2)} BSK</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Payout:</span>
              <span className="font-medium text-foreground">{(spin.payout_bsk ?? 0).toFixed(2)} BSK</span>
            </div>
          </div>

          {/* Bottom row: net change (prominent) */}
          <div className="flex items-center justify-between">
            <div className={`text-base font-bold ${
              (spin.net_change_bsk ?? 0) > 0 ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {(spin.net_change_bsk ?? 0) > 0 ? '+' : ''}
              {(spin.net_change_bsk ?? 0).toFixed(2)} BSK
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => window.open(`/app/spin/verify?hash=${spin.server_seed_hash}`, '_blank')}
              aria-label="View proof"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
