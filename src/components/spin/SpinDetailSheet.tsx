import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Target, X, Gift } from 'lucide-react';
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

  const openVerifyPage = () => {
    window.open(`/app/spin/verify?hash=${spin.server_seed_hash}`, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${isWin ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
              {isWin ? (
                <Target className={`h-5 w-5 text-emerald-500`} />
              ) : (
                <X className={`h-5 w-5 text-red-500`} />
              )}
            </div>
            Spin Details
          </SheetTitle>
          <SheetDescription>
            {format(new Date(spin.created_at), 'PPpp')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Result & Amount Section */}
          <div className="text-center py-8 border rounded-lg bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant={isWin ? 'default' : 'destructive'} className="text-base px-4 py-1">
                {isWin ? `WIN ${spin.multiplier}x` : 'LOSE'}
              </Badge>
              {spin.was_free_spin && (
                <Badge variant="secondary" className="gap-1">
                  <Gift className="h-3 w-3" />
                  Free Spin
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">Net Change</p>
            <p className={`text-5xl font-bold ${netChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {netChange >= 0 ? '+' : ''}{netChange.toFixed(2)}
            </p>
            <p className="text-muted-foreground text-sm mt-1">BSK</p>
          </div>

          <Separator />

          {/* Breakdown Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Breakdown
            </h3>
            
            <DetailRow label="Bet Amount" value={`${Number(spin.bet_bsk).toFixed(2)} BSK`} />
            <DetailRow 
              label="Spin Fee" 
              value={spin.was_free_spin ? 'Free' : `${Number(spin.spin_fee_bsk || 0).toFixed(2)} BSK`} 
            />
            <DetailRow 
              label="Payout" 
              value={`${Number(spin.payout_bsk).toFixed(2)} BSK`}
              valueColor={isWin ? 'text-emerald-500' : undefined}
            />
            {(spin.profit_fee_bsk || 0) > 0 && (
              <DetailRow 
                label="Winner Fee (10%)" 
                value={`-${Number(spin.profit_fee_bsk).toFixed(2)} BSK`}
                valueColor="text-orange-500"
              />
            )}
            
            <Separator />
            
            <DetailRow 
              label="Net Change" 
              value={`${netChange >= 0 ? '+' : ''}${netChange.toFixed(2)} BSK`}
              valueColor={netChange >= 0 ? 'text-emerald-500' : 'text-red-500'}
              bold
            />
          </div>

          <Separator />

          {/* Provably Fair Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Provably Fair
            </h3>
            
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Server Seed Hash</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-background/50 px-2 py-1 rounded truncate">
                    {spin.server_seed_hash}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => copyToClipboard(spin.server_seed_hash, 'Seed hash')}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Client Seed</p>
                  <code className="text-xs font-mono bg-background/50 px-2 py-1 rounded block truncate">
                    {spin.client_seed}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nonce</p>
                  <code className="text-xs font-mono bg-background/50 px-2 py-1 rounded block">
                    {spin.nonce}
                  </code>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={openVerifyPage}
              >
                <ExternalLink className="h-4 w-4" />
                Verify Fairness
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => copyToClipboard(spin.id, 'Spin ID')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy ID
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ 
  label, 
  value, 
  valueColor,
  bold 
}: { 
  label: string; 
  value: string; 
  valueColor?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${valueColor || ''}`}>
        {value}
      </span>
    </div>
  );
}
