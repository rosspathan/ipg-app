import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PrepaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: {
    id: string;
    loan_number: string;
    outstanding_bsk: number;
    loan_amount_bsk: number;
  };
  onSuccess: () => void;
}

export const PrepaymentDialog = ({
  open,
  onOpenChange,
  loan,
  onSuccess,
}: PrepaymentDialogProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const effectivePayment = amount ? Number(amount) : 0;

  const handlePrepay = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (Number(amount) > loan.outstanding_bsk) {
      toast.error("Amount exceeds outstanding balance");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bsk-loan-prepay", {
        body: {
          loan_id: loan.id,
          prepayment_amount_bsk: Number(amount),
        },
      });

      if (error) throw error;

      toast.success(`Successfully prepaid ${amount} BSK`);
      onSuccess();
      onOpenChange(false);
      setAmount("");
    } catch (error: any) {
      toast.error(error.message || "Failed to process prepayment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Prepay Loan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Loan Number</span>
              <span className="font-medium">#{loan.loan_number}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Outstanding Balance</span>
              <span className="font-bold">{loan.outstanding_bsk.toFixed(2)} BSK</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Prepayment Amount (BSK)</label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={loan.outstanding_bsk}
              step="0.01"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAmount(loan.outstanding_bsk.toString())}
              className="w-full"
            >
              Pay Full Amount
            </Button>
          </div>


          <div className="p-4 bg-primary/5 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount to Pay</span>
              <span className="font-bold text-primary">{amount || "0.00"} BSK</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Remaining Balance</span>
              <span className="font-medium">
                {(loan.outstanding_bsk - (Number(amount) || 0)).toFixed(2)} BSK
              </span>
            </div>
          </div>

          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              The payment will be deducted from your holding balance. Prepayment clears
              installments in order of due date.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePrepay}
              className="flex-1"
              disabled={loading || !amount || Number(amount) <= 0}
            >
              {loading ? "Processing..." : "Confirm Prepayment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
