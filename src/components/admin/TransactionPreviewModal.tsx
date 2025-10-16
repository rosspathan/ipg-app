import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ExternalLink, User, Calendar, Hash, FileText, CheckCircle, XCircle } from "lucide-react";

interface TransactionPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
  type: "deposit" | "withdrawal";
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
}

export function TransactionPreviewModal({
  open,
  onOpenChange,
  transaction,
  type,
  onApprove,
  onReject,
  isProcessing = false,
}: TransactionPreviewModalProps) {
  if (!transaction) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
      completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      processing: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    return colors[status] || "bg-muted";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "deposit" ? "Deposit" : "Withdrawal"} Preview
            <Badge className={getStatusColor(transaction.status)}>
              {transaction.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Information */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              User Information
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{transaction.user_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm">{transaction.profiles?.email || "N/A"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transaction Details
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-lg font-bold">
                  {transaction.amount} {transaction.method || transaction.assets?.symbol || "INR"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fee</p>
                <p className="text-sm">{transaction.fee || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Amount</p>
                <p className="text-sm font-semibold">
                  {transaction.net_credit || transaction.net_amount || transaction.amount}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Method</p>
                <p className="text-sm">{transaction.method || transaction.network || "N/A"}</p>
              </div>
              {transaction.reference && (
                <div>
                  <p className="text-sm text-muted-foreground">Reference</p>
                  <p className="text-sm font-mono">{transaction.reference}</p>
                </div>
              )}
              {transaction.to_address && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">To Address</p>
                  <p className="text-sm font-mono break-all">{transaction.to_address}</p>
                </div>
              )}
              {transaction.tx_hash && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Transaction Hash</p>
                  <a
                    href={`https://bscscan.com/tx/${transaction.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-primary hover:underline flex items-center gap-1"
                  >
                    {transaction.tx_hash}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">
                  {format(new Date(transaction.created_at), "PPp")}
                </p>
              </div>
              {transaction.decided_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Decided</p>
                  <p className="text-sm">
                    {format(new Date(transaction.decided_at), "PPp")}
                  </p>
                </div>
              )}
              {transaction.approved_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-sm">
                    {format(new Date(transaction.approved_at), "PPp")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Proof URL */}
          {transaction.proof_url && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Payment Proof</h3>
                <a
                  href={transaction.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={transaction.proof_url}
                    alt="Payment proof"
                    className="w-full rounded-lg border"
                  />
                </a>
              </div>
            </>
          )}

          {/* Admin Notes */}
          {transaction.admin_notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Admin Notes</h3>
                <p className="text-sm p-4 bg-muted/50 rounded-lg">
                  {transaction.admin_notes}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        {transaction.status === "pending" && onApprove && onReject && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              disabled={isProcessing}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={onApprove}
              disabled={isProcessing}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
