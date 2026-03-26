import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Loader2, RefreshCw, Copy, ExternalLink, Clock, CheckCircle2, XCircle, AlertTriangle, Radio, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useInternalTransferHistory, getTransferDisplayStatus, type InternalTransfer } from '@/hooks/useInternalTransferHistory';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const colorMap: Record<string, { badge: string; icon: string; iconColor: string }> = {
  emerald: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
  },
  amber: {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
  },
  rose: {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    icon: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
  },
  blue: {
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
  },
  purple: {
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    icon: 'bg-purple-500/15',
    iconColor: 'text-purple-400',
  },
  orange: {
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: 'bg-orange-500/15',
    iconColor: 'text-orange-400',
  },
};

function StatusIcon({ status, color }: { status: string; color: string }) {
  const iconClass = 'h-3.5 w-3.5';
  if (status === 'success') return <CheckCircle2 className={cn(iconClass, 'text-emerald-400')} />;
  if (status === 'failed') return <XCircle className={cn(iconClass, 'text-rose-400')} />;
  if (color === 'blue') return <Radio className={cn(iconClass, 'text-blue-400 animate-pulse')} />;
  if (color === 'purple') return <AlertTriangle className={cn(iconClass, 'text-purple-400')} />;
  if (color === 'orange') return <ShieldAlert className={cn(iconClass, 'text-orange-400')} />;
  return <Clock className={cn(iconClass, 'text-amber-400 animate-pulse')} />;
}

/** Build a timeline of steps for a transfer based on direction, status, and status_detail */
function getTimelineSteps(tx: InternalTransfer): { label: string; done: boolean; active: boolean }[] {
  const isDeposit = tx.direction === 'to_trading';
  const detail = (tx.status_detail || '').toLowerCase();

  if (isDeposit) {
    const steps = [
      { label: 'Deposit detected', done: true, active: false },
      { label: 'Confirming on-chain', done: false, active: false },
      { label: 'Credited to trading', done: false, active: false },
    ];
    if (tx.status === 'success') {
      steps[1].done = true;
      steps[2].done = true;
    } else if (tx.status === 'pending') {
      steps[1].active = true;
    }
    if (tx.status === 'failed') {
      steps[1].done = true;
      steps[2] = { label: 'Failed', done: false, active: false };
    }
    return steps;
  }

  // Withdrawal
  const steps = [
    { label: 'Request created', done: true, active: false },
    { label: 'Queued', done: false, active: false },
    { label: 'Broadcasting', done: false, active: false },
    { label: 'Confirming', done: false, active: false },
    { label: 'Completed', done: false, active: false },
  ];

  if (tx.status === 'success') {
    steps.forEach(s => s.done = true);
    return steps;
  }

  if (tx.status === 'failed') {
    steps[1].done = true;
    const failLabel = detail.includes('refund') ? 'Refunded' : 'Failed';
    steps[2] = { label: failLabel, done: false, active: false };
    return steps.slice(0, 3);
  }

  // Pending — determine which step is active
  if (detail.includes('liquidity') || detail.includes('solvency') || detail.includes('blocked')) {
    steps[1] = { label: 'Awaiting liquidity', done: false, active: true };
    return steps;
  }
  if (detail.includes('broadcast') || detail.includes('processing')) {
    steps[1].done = true;
    steps[2].active = true;
    return steps;
  }
  if (detail.includes('confirm')) {
    steps[1].done = true;
    steps[2].done = true;
    steps[3].active = true;
    return steps;
  }
  if (detail.includes('review')) {
    steps[1] = { label: 'Needs review', done: false, active: true };
    return steps;
  }

  // Default: queued
  steps[1].active = true;
  return steps;
}

function Timeline({ steps }: { steps: { label: string; done: boolean; active: boolean }[] }) {
  return (
    <div className="flex items-center gap-0 py-2 overflow-x-auto">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          {i > 0 && (
            <div className={cn(
              'w-4 h-0.5 shrink-0',
              step.done ? 'bg-emerald-500/60' : 'bg-border/40'
            )} />
          )}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className={cn(
              'w-2.5 h-2.5 rounded-full border-2 shrink-0',
              step.done ? 'bg-emerald-500 border-emerald-500' :
              step.active ? 'bg-transparent border-amber-400 animate-pulse' :
              'bg-transparent border-border/40'
            )} />
            <span className={cn(
              'text-[9px] leading-tight text-center whitespace-nowrap',
              step.done ? 'text-emerald-400' :
              step.active ? 'text-amber-400' :
              'text-muted-foreground/50'
            )}>
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransferCard({ tx }: { tx: InternalTransfer }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const isDeposit = tx.direction === 'to_trading';
  const display = getTransferDisplayStatus(tx);
  const colors = colorMap[display.color] || colorMap.amber;
  const timelineSteps = getTimelineSteps(tx);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  return (
    <div className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden transition-all">
      {/* Main row */}
      <button
        className="w-full p-3.5 flex items-center gap-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn('p-2 rounded-full shrink-0', isDeposit ? 'bg-emerald-500/15' : 'bg-blue-500/15')}>
          {isDeposit
            ? <ArrowDownToLine className="h-4 w-4 text-emerald-400" />
            : <ArrowUpFromLine className="h-4 w-4 text-blue-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">
              {isDeposit ? 'On-Chain → Trading' : 'Trading → On-Chain'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-muted-foreground">{tx.asset_symbol}</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(tx.created_at), 'MMM d, HH:mm')}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-mono text-sm font-semibold">
            {isDeposit ? '+' : '-'}{Number(tx.amount).toFixed(4)}
          </div>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 mt-0.5 gap-1', colors.badge)}>
            <StatusIcon status={tx.status} color={display.color} />
            {display.label}
          </Badge>
        </div>
      </button>

      {/* Progress message */}
      <div className="px-3.5 pb-2 -mt-1">
        <p className="text-[11px] text-muted-foreground italic">{display.message}</p>
      </div>

      {/* Timeline */}
      <div className="px-3.5 pb-1">
        <Timeline steps={timelineSteps} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-border/30 space-y-2">
          <DetailRow label="Amount" value={`${Number(tx.amount).toFixed(6)} ${tx.asset_symbol}`} />
          {tx.fee > 0 && <DetailRow label="Fee" value={`${Number(tx.fee).toFixed(6)} ${tx.asset_symbol}`} />}
          {tx.balance_after != null && (
            <DetailRow label="Balance After" value={`${Number(tx.balance_after).toFixed(6)} ${tx.asset_symbol}`} />
          )}

          {tx.tx_hash && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">TX Hash</span>
              <div className="flex items-center gap-1.5">
                <a
                  href={`https://bscscan.com/tx/${tx.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  {tx.tx_hash.slice(0, 8)}...{tx.tx_hash.slice(-6)}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <button onClick={() => copyToClipboard(tx.tx_hash!, 'TX Hash')} className="p-0.5 hover:bg-muted rounded">
                  <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {tx.reference_id && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ref ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-muted-foreground">{tx.reference_id}</span>
                <button onClick={() => copyToClipboard(tx.reference_id!, 'Ref ID')} className="p-0.5 hover:bg-muted rounded">
                  <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          <DetailRow label="Created" value={format(new Date(tx.created_at), 'MMM d, yyyy HH:mm:ss')} />
          {tx.updated_at && tx.updated_at !== tx.created_at && (
            <DetailRow label="Last Updated" value={format(new Date(tx.updated_at), 'MMM d, yyyy HH:mm:ss')} />
          )}

          {tx.status_detail && (
            <DetailRow label="Status Detail" value={tx.status_detail} />
          )}

          <div className="flex items-center justify-between pt-1 border-t border-border/20">
            <span className="text-[10px] text-muted-foreground">ID</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">{tx.id.slice(0, 12)}...</span>
              <button onClick={() => copyToClipboard(tx.id, 'Transfer ID')} className="p-0.5 hover:bg-muted rounded">
                <Copy className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

export default function InternalTransferHistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: transfers, isLoading } = useInternalTransferHistory();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-semibold flex-1">Transfer History</h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['internal-transfer-history'] })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <p className="px-4 pb-2 text-xs text-muted-foreground">
          On-Chain ↔ Trading balance transfers • Tap for details
        </p>
      </div>

      <div className="p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !transfers?.length ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-sm text-muted-foreground">No transfers yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/wallet/transfer')}
              className="text-xs"
            >
              Make a Transfer
            </Button>
          </div>
        ) : (
          transfers.map((tx) => <TransferCard key={tx.id} tx={tx} />)
        )}
      </div>
    </div>
  );
}
