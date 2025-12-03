import { useState } from 'react';
import { SpinHistoryItem as SpinHistoryItemType } from '@/hooks/useSpinHistory';
import { SpinHistoryItem } from './SpinHistoryItem';
import { SpinDetailSheet } from './SpinDetailSheet';
import { Card } from '@/components/ui/card';
import { isToday, isYesterday, isThisWeek, format } from 'date-fns';

interface SpinHistoryListProps {
  history: SpinHistoryItemType[];
  isLoading?: boolean;
}

interface GroupedSpins {
  [key: string]: SpinHistoryItemType[];
}

function groupSpinsByDate(spins: SpinHistoryItemType[]): GroupedSpins {
  const groups: GroupedSpins = {};

  spins.forEach((spin) => {
    const date = new Date(spin.created_at);
    let key: string;

    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else if (isThisWeek(date)) {
      key = 'This Week';
    } else {
      key = format(date, 'MMMM yyyy');
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(spin);
  });

  return groups;
}

export function SpinHistoryList({ history, isLoading }: SpinHistoryListProps) {
  const [selectedSpin, setSelectedSpin] = useState<SpinHistoryItemType | null>(null);

  if (isLoading) {
    return (
      <Card className="divide-y divide-border">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <span className="text-3xl">🎰</span>
          </div>
          <h3 className="text-lg font-medium mb-2">No Spins Yet</h3>
          <p className="text-muted-foreground text-sm">
            Your spin history will appear here after you play
          </p>
        </div>
      </Card>
    );
  }

  const groupedSpins = groupSpinsByDate(history);
  const groupOrder = ['Today', 'Yesterday', 'This Week'];

  // Sort groups: Today, Yesterday, This Week, then older months
  const sortedGroups = Object.keys(groupedSpins).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return b.localeCompare(a); // Older months sorted newest first
  });

  return (
    <>
      <div className="space-y-4">
        {sortedGroups.map((groupName) => (
          <div key={groupName}>
            {/* Date Group Header */}
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {groupName}
              </span>
            </div>

            {/* Group Items */}
            <Card className="overflow-hidden divide-y divide-border">
              {groupedSpins[groupName].map((spin) => (
                <SpinHistoryItem
                  key={spin.id}
                  spin={spin}
                  onClick={() => setSelectedSpin(spin)}
                />
              ))}
            </Card>
          </div>
        ))}
      </div>

      {/* Detail Sheet */}
      <SpinDetailSheet
        spin={selectedSpin}
        open={!!selectedSpin}
        onOpenChange={(open) => !open && setSelectedSpin(null)}
      />
    </>
  );
}
