import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Copy, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SpinHistoryItem } from '@/hooks/useSpinHistory';

interface SpinDetailSheetProps {
  spin: SpinHistoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpinDetailSheet({ spin, open, onOpenChange }: SpinDetailSheetProps) {
  if (!spin) return null;

  const isWin = (spin.payout_bsk || 0) > 0;
  const netChange = spin.net_change_bsk || 0;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const truncateId = (id: string) => {
    if (id.length <= 24) return id;
    return `${id.slice(0, 20)}...`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] bg-[hsl(220_13%_8%)] border-t border-[hsl(220_13%_18%)] rounded-t-3xl p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[hsl(220_13%_15%)]">
          <button 
            onClick={() => onOpenChange(false)}
            className="p-2 -ml-2 text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center flex-1">
            <h2 className="text-base font-semibold text-foreground">Transaction Details</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isWin ? 'Spin Win' : 'Spin Loss'}
            </p>
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto h-[calc(90vh-65px)] pb-8">
          {/* Amount Display */}
          <div className="text-center py-8 px-4">
            <p className="text-sm text-muted-foreground mb-2">Amount</p>
            <p className={`text-4xl font-bold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
              {netChange >= 0 ? '+' : ''}{netChange.toFixed(2)}
            </p>
            <p className="text-muted-foreground text-sm mt-1">BSK</p>
            
            {/* Balance Type Badges */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Badge 
                variant="outline" 
                className="bg-primary/10 border-primary/30 text-primary px-3 py-1"
              >
                Withdrawable
              </Badge>
              <Badge 
                variant="outline" 
                className="bg-muted/30 border-muted-foreground/20 text-muted-foreground px-3 py-1"
              >
                Credit
              </Badge>
            </div>
          </div>

          {/* TRANSACTION INFORMATION Section */}
          <div className="px-4 mt-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Transaction Information
            </h3>
            
            <div className="bg-[hsl(220_13%_11%)] rounded-xl divide-y divide-[hsl(220_13%_18%)]">
              <DetailRow 
                label="Date & Time" 
                value={format(new Date(spin.created_at), 'MMM d, yyyy, h:mm:ss a')} 
              />
              <DetailRow 
                label="Transaction Subtype" 
                value={isWin ? 'spin_win' : 'spin_loss'}
              />
              <DetailRow 
                label="Notes" 
                value={isWin 
                  ? `Spin win: ${spin.multiplier}x multiplier, payout ${Number(spin.payout_bsk).toFixed(0)} BSK`
                  : `Spin loss: Bet ${Number(spin.bet_bsk).toFixed(0)} BSK`
                } 
              />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Transaction ID</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-foreground">
                    {truncateId(spin.id)}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(spin.id, 'Transaction ID')}
                    className="p-1.5 text-primary hover:text-primary/80"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ADDITIONAL DETAILS Section */}
          <div className="px-4 mt-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Additional Details
            </h3>
            
            <div className="bg-[hsl(220_13%_11%)] rounded-xl divide-y divide-[hsl(220_13%_18%)]">
              <DetailRow 
                label="Nonce" 
                value={String(spin.nonce)} 
              />
              <DetailRow 
                label="Bet Bsk" 
                value={Number(spin.bet_bsk).toFixed(2)} 
              />
              <DetailRow 
                label="Multiplier" 
                value={String(spin.multiplier)} 
              />
              <DetailRow 
                label="Payout Bsk" 
                value={Number(spin.payout_bsk).toFixed(2)} 
              />
              {spin.was_free_spin && (
                <DetailRow 
                  label="Free Spin" 
                  value="Yes" 
                />
              )}
              {(spin.profit_fee_bsk || 0) > 0 && (
                <DetailRow 
                  label="Winner Fee" 
                  value={`${Number(spin.profit_fee_bsk).toFixed(2)} BSK`} 
                />
              )}
              <DetailRow 
                label="Spin Fee" 
                value={spin.was_free_spin ? '0.00' : Number(spin.spin_fee_bsk || 0).toFixed(2)} 
              />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Segment Id</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-foreground">
                    {truncateId(spin.segment_id || '')}
                  </span>
                  {spin.segment_id && (
                    <button 
                      onClick={() => copyToClipboard(spin.segment_id!, 'Segment ID')}
                      className="p-1.5 text-primary hover:text-primary/80"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <DetailRow 
                label="Segment Label" 
                value={spin.segment?.label || (isWin ? `WIN ${spin.multiplier}x` : 'LOSE')} 
              />
              <DetailRow 
                label="Net Payout Bsk" 
                value={netChange.toFixed(2)}
                highlight={isWin}
              />
            </div>
          </div>

          {/* Server Seed Section */}
          <div className="px-4 mt-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Provably Fair
            </h3>
            
            <div className="bg-[hsl(220_13%_11%)] rounded-xl divide-y divide-[hsl(220_13%_18%)]">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Server Seed Hash</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-foreground">
                    {truncateId(spin.server_seed_hash || '')}
                  </span>
                  {spin.server_seed_hash && (
                    <button 
                      onClick={() => copyToClipboard(spin.server_seed_hash, 'Server Seed Hash')}
                      className="p-1.5 text-primary hover:text-primary/80"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <DetailRow 
                label="Client Seed" 
                value={spin.client_seed || 'N/A'} 
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ 
  label, 
  value, 
  highlight
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${highlight ? 'text-emerald-400 font-semibold' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
