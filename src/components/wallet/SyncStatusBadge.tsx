import React from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SyncStatus = 'synced' | 'needs_sync' | 'pending';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  className?: string;
  showTooltip?: boolean;
}

const statusConfig: Record<SyncStatus, {
  icon: React.ElementType;
  label: string;
  description: string;
  className: string;
}> = {
  synced: {
    icon: CheckCircle2,
    label: 'Synced',
    description: 'Your on-chain balance is fully available for trading',
    className: 'text-emerald-500 bg-emerald-500/10',
  },
  needs_sync: {
    icon: AlertCircle,
    label: 'Sync Available',
    description: 'New deposits detected. Sync to make funds available for trading.',
    className: 'text-amber-500 bg-amber-500/10',
  },
  pending: {
    icon: RefreshCw,
    label: 'Syncing...',
    description: 'Transfer in progress',
    className: 'text-blue-500 bg-blue-500/10',
  },
};

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  className,
  showTooltip = true,
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'pending' && 'animate-spin')} />
      <span>{config.label}</span>
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface BalanceExplainerProps {
  className?: string;
}

export const BalanceExplainer: React.FC<BalanceExplainerProps> = ({ className }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className={cn('text-muted-foreground hover:text-foreground transition-colors', className)}>
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs font-medium mb-1">How balances work</p>
          <p className="text-xs text-muted-foreground">
            Your crypto is stored on-chain. When synced, these same funds become available for trading — 
            they're not separate balances, just the same funds ready for orders.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
