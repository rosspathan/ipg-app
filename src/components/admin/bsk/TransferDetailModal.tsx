import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TransferDetailModalProps {
  transfer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferDetailModal({ transfer, open, onOpenChange }: TransferDetailModalProps) {
  const { toast } = useToast();

  if (!transfer) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transfer_in':
        return 'bg-success/10 text-success border-success/20';
      case 'transfer_out':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'admin_credit':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'admin_debit':
        return 'bg-danger/10 text-danger border-danger/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Transfer Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Type Badge */}
          <div className="flex items-center justify-between">
            <Badge className={getTypeColor(transfer.transaction_type)}>
              {transfer.transaction_type?.replace('_', ' ').toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(transfer.created_at).toLocaleString()}
            </span>
          </div>

          {/* Amount Display */}
          <div className="text-center py-6 bg-muted/20 rounded-lg border border-border">
            <div className="text-4xl font-bold text-primary">
              {Number(transfer.amount).toLocaleString()} BSK
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Balance Type: {transfer.balance_type || 'N/A'}
            </div>
          </div>

          {/* User Info */}
          {transfer.sender && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">User Information</h3>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border">
                <Avatar>
                  <AvatarImage src={transfer.sender.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {transfer.sender.display_name?.[0] || transfer.sender.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {transfer.sender.display_name || 'Unknown User'}
                  </div>
                  <div className="text-sm text-muted-foreground">{transfer.sender.email}</div>
                  {transfer.sender.username && (
                    <div className="text-xs text-muted-foreground">@{transfer.sender.username}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transaction Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Transaction Details</h3>
            <div className="grid gap-2">
              <DetailRow
                label="Transaction ID"
                value={transfer.id}
                onCopy={() => copyToClipboard(transfer.id, 'Transaction ID')}
              />
              {transfer.reference && (
                <DetailRow
                  label="Reference"
                  value={transfer.reference}
                  onCopy={() => copyToClipboard(transfer.reference, 'Reference')}
                />
              )}
              <DetailRow label="Status" value={transfer.status || 'Completed'} />
              {transfer.notes && <DetailRow label="Notes" value={transfer.notes} />}
            </div>
          </div>

          {/* Balance Changes */}
          {(transfer.balance_before !== undefined || transfer.balance_after !== undefined) && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Balance Changes</h3>
              <div className="grid grid-cols-2 gap-3">
                {transfer.balance_before !== undefined && (
                  <div className="p-3 bg-muted/20 rounded-lg border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Before</div>
                    <div className="text-lg font-semibold text-foreground">
                      {Number(transfer.balance_before).toLocaleString()} BSK
                    </div>
                  </div>
                )}
                {transfer.balance_after !== undefined && (
                  <div className="p-3 bg-muted/20 rounded-lg border border-border">
                    <div className="text-xs text-muted-foreground mb-1">After</div>
                    <div className="text-lg font-semibold text-foreground">
                      {Number(transfer.balance_after).toLocaleString()} BSK
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(transfer.id, 'Transaction ID')}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy ID
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-muted/10 rounded border border-border">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{value}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
