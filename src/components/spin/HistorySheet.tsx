import React from 'react'
import { X, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'

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
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[80vh] rounded-t-3xl"
        data-testid="spin-history"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Recent Spins</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(80vh-120px)]">
          <div className="space-y-2 pr-4">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No spins yet</p>
                <p className="text-xs text-muted-foreground mt-1">Your spin history will appear here</p>
              </div>
            ) : (
              history.map((spin) => (
                <div
                  key={spin.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      spin.multiplier > 0 ? 'bg-green-500/20' : 'bg-rose-500/20'
                    }`}
                  >
                    {spin.multiplier > 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-rose-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={spin.multiplier > 0 ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {spin.segment_label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(spin.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs">Bet: {spin.bet_bsk.toFixed(2)} BSK</span>
                      <span className="text-xs">•</span>
                      <span
                        className={`text-xs font-medium ${
                          spin.net_change_bsk > 0 ? 'text-green-500' : 'text-rose-500'
                        }`}
                      >
                        {spin.net_change_bsk > 0 ? '+' : ''}
                        {spin.net_change_bsk.toFixed(2)} BSK
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => window.open(`/app/spin/verify?hash=${spin.server_seed_hash}`, '_blank')}
                    aria-label="View proof"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {onViewAll && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={onViewAll}
            >
              View All Spins
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
