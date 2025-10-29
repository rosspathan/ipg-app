import React, { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SpinHistoryStats } from './SpinHistoryStats'
import { SpinHistoryCard } from './SpinHistoryCard'
import { SpinHistoryFilters, FilterType } from './SpinHistoryFilters'

interface SpinResult {
  id: string
  created_at: string
  bet_bsk: number
  payout_bsk: number
  net_change_bsk: number
  multiplier: number
  segment_label: string
  server_seed_hash: string
}

interface HistorySheetProps {
  isOpen: boolean
  onClose: () => void
  history: SpinResult[]
  onViewAll?: () => void
  onRefresh?: () => void
}

export function HistorySheet({
  isOpen,
  onClose,
  history,
  onViewAll,
  onRefresh
}: HistorySheetProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSpins = history.length
    const totalWagered = history.reduce((sum, spin) => sum + (spin.bet_bsk ?? 0), 0)
    const netProfit = history.reduce((sum, spin) => sum + (spin.net_change_bsk ?? 0), 0)
    const wins = history.filter(spin => spin.multiplier > 0).length
    const winRate = totalSpins > 0 ? (wins / totalSpins) * 100 : 0

    return { totalSpins, totalWagered, netProfit, winRate }
  }, [history])

  // Filter counts
  const filterCounts = useMemo(() => ({
    all: history.length,
    wins: history.filter(spin => spin.multiplier > 0).length,
    losses: history.filter(spin => spin.multiplier === 0).length,
    free: history.filter(spin => spin.bet_bsk === 0).length,
  }), [history])

  // Filtered history
  const filteredHistory = useMemo(() => {
    switch (activeFilter) {
      case 'wins':
        return history.filter(spin => spin.multiplier > 0)
      case 'losses':
        return history.filter(spin => spin.multiplier === 0)
      case 'free':
        return history.filter(spin => spin.bet_bsk === 0)
      default:
        return history
    }
  }, [history, activeFilter])

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-3xl bg-gradient-to-b from-background via-background to-background/95 backdrop-blur-xl border-t-2"
        data-testid="spin-history"
      >
        {/* Pull handle indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-muted-foreground/30" />

        {/* Header */}
        <SheetHeader className="pb-4 pt-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Spin History
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Track your performance
              </p>
            </div>
            <SheetClose asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 rounded-full hover:bg-muted/50 transition-all"
              >
                <X className="w-4 h-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Stats Cards */}
        <SpinHistoryStats
          totalSpins={stats.totalSpins}
          totalWagered={stats.totalWagered}
          netProfit={stats.netProfit}
          winRate={stats.winRate}
        />

        {/* Filters */}
        <SpinHistoryFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={filterCounts}
        />

        {/* History List */}
        <ScrollArea className="h-[calc(85vh-280px)] mt-4">
          <div className="space-y-3 pr-4 pb-4">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <div className="text-3xl">🎰</div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {activeFilter === 'all' ? 'No spins yet' : `No ${activeFilter} found`}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {activeFilter === 'all' 
                    ? 'Your spin history will appear here' 
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              filteredHistory.map((spin, index) => (
                <SpinHistoryCard 
                  key={spin.id} 
                  spin={spin}
                  isFirst={index === 0 && activeFilter === 'all'}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer with View All button */}
        {onViewAll && history.length > 0 && (
          <div className="pt-4 border-t border-border/40 sticky bottom-0 bg-background/80 backdrop-blur-md">
            <Button
              variant="outline"
              className="w-full h-11 font-medium hover:bg-primary/5 transition-all"
              onClick={onViewAll}
            >
              View Complete History
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
