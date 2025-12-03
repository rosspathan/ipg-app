import { Target, X, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SpinHistoryItem as SpinHistoryItemType } from '@/hooks/useSpinHistory';
import { format } from 'date-fns';

interface SpinHistoryItemProps {
  spin: SpinHistoryItemType;
  onClick: () => void;
}

export function SpinHistoryItem({ spin, onClick }: SpinHistoryItemProps) {
  const isWin = (spin.payout_bsk || 0) > 0;
  const netChange = spin.net_change_bsk || 0;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted/70 cursor-pointer transition-colors"
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isWin
            ? 'bg-emerald-500/15 text-emerald-500'
            : 'bg-red-500/15 text-red-500'
        }`}
      >
        {isWin ? <Target className="h-5 w-5" /> : <X className="h-5 w-5" />}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isWin ? 'text-emerald-500' : 'text-red-500'}`}>
            {isWin ? `WIN ${spin.multiplier}x` : 'LOSE'}
          </span>
          {spin.was_free_spin && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5">
              <Gift className="h-3 w-3" />
              Free
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Bet: {Number(spin.bet_bsk).toFixed(0)} BSK</span>
          <span>•</span>
          <span>{format(new Date(spin.created_at), 'h:mm a')}</span>
        </div>
      </div>

      {/* Net Change */}
      <div className="text-right flex-shrink-0">
        <div className={`text-sm font-bold ${netChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {netChange >= 0 ? '+' : ''}{netChange.toFixed(0)} BSK
        </div>
      </div>
    </div>
  );
}
