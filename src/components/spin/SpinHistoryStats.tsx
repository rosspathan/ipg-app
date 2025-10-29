import React from 'react'
import { TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface SpinHistoryStatsProps {
  totalSpins: number
  totalWagered: number
  netProfit: number
  winRate: number
}

export function SpinHistoryStats({ 
  totalSpins, 
  totalWagered, 
  netProfit,
  winRate 
}: SpinHistoryStatsProps) {
  const isProfit = netProfit > 0

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {/* Total Spins */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 overflow-hidden relative">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Spins
            </p>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {totalSpins}
          </p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/5 rounded-full blur-2xl" />
        </CardContent>
      </Card>

      {/* Total Wagered */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 overflow-hidden relative">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Wagered
            </p>
          </div>
          <p className="text-xl font-bold text-foreground">
            {totalWagered.toFixed(0)}
          </p>
          <p className="text-[9px] text-muted-foreground">BSK</p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl" />
        </CardContent>
      </Card>

      {/* Net Profit/Loss */}
      <Card className={`bg-gradient-to-br overflow-hidden relative ${
        isProfit 
          ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' 
          : 'from-red-500/10 to-red-500/5 border-red-500/20'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {isProfit ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Net P/L
            </p>
          </div>
          <p className={`text-xl font-bold ${
            isProfit ? 'text-emerald-500' : 'text-red-500'
          }`}>
            {netProfit > 0 ? '+' : ''}{netProfit.toFixed(0)}
          </p>
          <p className="text-[9px] text-muted-foreground">BSK</p>
          <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl ${
            isProfit ? 'bg-emerald-500/5' : 'bg-red-500/5'
          }`} />
        </CardContent>
      </Card>
    </div>
  )
}
