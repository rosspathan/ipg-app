import React from 'react'
import { Gift } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FreeSpinsCardProps {
  freeSpinsRemaining: number
  totalFreeSpins: number
  postFreeSpinFee: number
  onTap?: () => void
}

export function FreeSpinsCard({
  freeSpinsRemaining,
  totalFreeSpins,
  postFreeSpinFee,
  onTap
}: FreeSpinsCardProps) {
  return (
    <div
      data-testid="free-spins"
      onClick={onTap}
      className="mx-4 mb-3 flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 cursor-pointer hover:from-green-500/20 hover:to-emerald-500/20 transition-all"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
        <Gift className="w-5 h-5 text-green-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
          Free Spins ({freeSpinsRemaining} of {totalFreeSpins} remaining)
        </p>
        <p className="text-[10px] text-muted-foreground">
          Then {postFreeSpinFee} BSK per spin
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] bg-green-500/10 border-green-500/30">
        Active
      </Badge>
    </div>
  )
}
