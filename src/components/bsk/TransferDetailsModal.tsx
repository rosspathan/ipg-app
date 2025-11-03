import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { TransferReceiptButton } from '@/components/user/TransferReceiptButton';

interface TransferDetailsModalProps {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferDetailsModal({ transaction, open, onOpenChange }: TransferDetailsModalProps) {
  const { toast } = useToast();

  if (!transaction) return null;

  const isSent = transaction.transaction_type === 'transfer_out';
  const isReceived = transaction.transaction_type === 'transfer_in';

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction.reference_id);
    toast({ title: 'Copied!', description: 'Transaction ID copied to clipboard' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transfer Details
            <Badge variant={isSent ? 'destructive' : 'default'}>
              {isSent ? 'Sent' : 'Received'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Section */}
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Amount</p>
            <p className={`text-4xl font-bold ${isSent ? 'text-destructive' : 'text-success'}`}>
              {isSent ? '-' : '+'}{Math.abs(transaction.amount).toLocaleString()} BSK
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(transaction.created_at), 'PPpp')}
            </p>
          </div>

          {/* Transaction Info */}
          <div className="space-y-4">
            <div className="flex justify-between items-start pb-3 border-b">
              <span className="text-sm text-muted-foreground">Transaction ID</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{transaction.reference_id.slice(0, 16)}...</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyId}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-start pb-3 border-b">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-semibold capitalize">
                {transaction.transaction_type.replace(/_/g, ' ')}
              </span>
            </div>

            {isSent && (
              <>
                <div className="flex justify-between items-start pb-3 border-b">
                  <span className="text-sm text-muted-foreground">Recipient</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {transaction.metadata?.recipient_display_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.metadata?.recipient_email}
                    </p>
                  </div>
                </div>
              </>
            )}

            {isReceived && (
              <>
                <div className="flex justify-between items-start pb-3 border-b">
                  <span className="text-sm text-muted-foreground">Sender</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {transaction.metadata?.sender_display_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.metadata?.sender_email}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between items-start pb-3 border-b">
              <span className="text-sm text-muted-foreground">Balance Type</span>
              <Badge variant="outline" className="capitalize">
                {transaction.balance_type}
              </Badge>
            </div>

            {transaction.metadata?.memo && (
              <div className="flex justify-between items-start pb-3 border-b">
                <span className="text-sm text-muted-foreground">Memo</span>
                <span className="text-sm italic max-w-xs text-right">
                  "{transaction.metadata.memo}"
                </span>
              </div>
            )}

            <div className="flex justify-between items-start pb-3 border-b">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                Completed
              </Badge>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Fee</span>
              <span className="text-sm font-semibold text-success">Free</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <TransferReceiptButton 
              transaction={transaction}
              variant="default"
              size="default"
            />
            <Button
              variant="outline"
              onClick={() => window.open('/app/wallet/history', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View in History
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
