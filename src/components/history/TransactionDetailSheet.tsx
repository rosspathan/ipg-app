import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Copy, Download, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TrustWalletTransaction } from "./TrustWalletHistoryItem";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TransactionDetailSheetProps {
  transaction: TrustWalletTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailSheet({ transaction, open, onOpenChange }: TransactionDetailSheetProps) {
  if (!transaction) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const isCredit = transaction.amount > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Transaction Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Amount Section */}
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">Amount</p>
            <p className={`text-4xl font-bold ${isCredit ? 'text-green-500' : 'text-red-500'}`}>
              {isCredit ? '+' : ''}{transaction.amount.toFixed(2)} BSK
            </p>
          </div>

          <Separator />

          {/* Recipient/Sender Info for Transfers */}
          {transaction.transaction_type === 'transfer_out' && transaction.metadata?.recipient_email && (
            <>
              <div className="space-y-3">
                <p className="text-sm font-medium">Sent to</p>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {transaction.metadata.recipient_display_name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {transaction.metadata.recipient_email}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {transaction.transaction_type === 'transfer_in' && transaction.metadata?.sender_email && (
            <>
              <div className="space-y-3">
                <p className="text-sm font-medium">Received from</p>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {transaction.metadata.sender_display_name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {transaction.metadata.sender_email}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Transaction Details */}
          <div className="space-y-4">
            <DetailRow label="Type" value={transaction.transaction_type.replace(/_/g, ' ').toUpperCase()} />
            <DetailRow label="Balance Type" value={transaction.balance_type.toUpperCase()} />
            <DetailRow 
              label="Date" 
              value={format(new Date(transaction.created_at), 'PPpp')} 
            />
            {transaction.balance_after !== undefined && (
              <DetailRow label="Balance After" value={`${transaction.balance_after.toFixed(2)} BSK`} />
            )}
            <DetailRow 
              label="Description" 
              value={transaction.description || 'N/A'} 
            />
          </div>

          <Separator />

          {/* Transaction ID */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Transaction ID</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded truncate">
                {transaction.id}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(transaction.id, 'Transaction ID')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Metadata */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (() => {
            // Filter out internal IDs and email/name fields we're already showing
            const filteredMetadata = Object.entries(transaction.metadata).filter(([key]) => 
              !['recipient_id', 'sender_id', 'transfer_id', 'recipient_email', 'recipient_display_name', 'sender_email', 'sender_display_name'].includes(key) &&
              transaction.metadata![key] != null &&
              transaction.metadata![key] !== ''
            );
            
            return filteredMetadata.length > 0 ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Additional Information</p>
                  <div className="space-y-2">
                    {filteredMetadata.map(([key, value]) => (
                      <DetailRow 
                        key={key} 
                        label={key.replace(/_/g, ' ').toUpperCase()} 
                        value={typeof value === 'object' ? JSON.stringify(value) : String(value)} 
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null;
          })()}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => copyToClipboard(transaction.id, 'Transaction ID')}>
              <Copy className="w-4 h-4 mr-2" />
              Copy ID
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Receipt
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
