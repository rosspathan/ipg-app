import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Coins, 
  ArrowRight,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LoanForeclosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: {
    id: string;
    loan_number: string;
    outstanding_bsk: number;
    principal_bsk: number;
    paid_bsk?: number;
  };
  userBalance: number;
  onSuccess: () => void;
}

export function LoanForeclosureDialog({
  open,
  onOpenChange,
  loan,
  userBalance,
  onSuccess,
}: LoanForeclosureDialogProps) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  
  // Track if we've already initiated a request for this loan to prevent double-clicks
  const [processedLoanId, setProcessedLoanId] = useState<string | null>(null);

  const outstanding = Number(loan.outstanding_bsk) || 0;
  const settlementAmount = outstanding;
  const hasEnoughBalance = userBalance >= settlementAmount;
  const paidSoFar = Number(loan.paid_bsk) || 0;
  const progressPercent = loan.principal_bsk > 0 
    ? Math.round((paidSoFar / loan.principal_bsk) * 100) 
    : 0;

  const handleForeclose = async () => {
    // Two-step confirmation: first click shows warning, second confirms
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    // CRITICAL: Prevent duplicate submissions
    if (loading || isProcessed || processedLoanId === loan.id) {
      console.log("[FORECLOSE UI] Blocked duplicate submission");
      return;
    }

    setLoading(true);
    setProcessedLoanId(loan.id);
    
    try {
      const { data, error } = await supabase.functions.invoke("bsk-loan-foreclose", {
        body: { loan_id: loan.id }
      });

      if (error) throw error;
      
      // Handle already processed case (409 from backend)
      if (data?.already_processed) {
        toast.info("This loan has already been settled. Refreshing...");
        setIsProcessed(true);
        onSuccess();
        onOpenChange(false);
        return;
      }
      
      if (!data?.success) throw new Error(data?.error || "Foreclosure failed");

      setIsProcessed(true);
      toast.success(
        `Loan settled successfully!`,
        { duration: 5000 }
      );
      onSuccess();
      onOpenChange(false);
      setConfirmed(false);
    } catch (error: any) {
      console.error("Foreclosure error:", error);
      // Check if it's an "already processed" error
      if (error.message?.includes("already")) {
        toast.info(error.message);
        setIsProcessed(true);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(error.message || "Failed to settle loan");
        setConfirmed(false);
        setProcessedLoanId(null); // Allow retry on actual errors
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Settle Loan Early
          </DialogTitle>
          <DialogDescription>
            Pay off your entire loan balance and close it immediately
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loan Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Loan</span>
              <span className="font-mono text-sm">#{loan.loan_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {progressPercent}% paid
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Settlement Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Settlement Amount
            </h4>
            
            <div className="p-4 bg-card border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Amount to Pay</span>
                <span className="text-xl font-bold text-primary">
                  {settlementAmount.toFixed(2)} BSK
                </span>
              </div>
            </div>

            {/* Balance Check */}
            <div className={`p-3 rounded-lg border ${hasEnoughBalance ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
              <div className="flex items-center justify-between text-sm">
                <span className={hasEnoughBalance ? 'text-success' : 'text-destructive'}>
                  Your Balance
                </span>
                <span className={`font-medium ${hasEnoughBalance ? 'text-success' : 'text-destructive'}`}>
                  {userBalance.toFixed(2)} BSK
                </span>
              </div>
            </div>
          </div>

          {/* Confirmation Step */}
          {confirmed && hasEnoughBalance && (
            <Alert className="bg-warning/10 border-warning/30">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <AlertDescription className="text-warning">
                <strong>Confirm Settlement</strong>
                <br />
                <span className="text-sm">
                  This will deduct {settlementAmount.toFixed(2)} BSK from your balance and close the loan permanently.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Benefits */}
          {!confirmed && (
            <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <strong className="text-success">Benefits of Early Settlement:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Loan closed immediately</li>
                    <li>• No more weekly EMI deductions</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              {confirmed ? "Go Back" : "Cancel"}
            </Button>
            <Button
              onClick={handleForeclose}
              className={`flex-1 gap-2 ${confirmed ? 'bg-warning hover:bg-warning/90' : ''}`}
              disabled={loading || !hasEnoughBalance || isProcessed || processedLoanId === loan.id}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : confirmed ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Settle
                </>
              ) : (
                <>
                  Settle Now
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {!hasEnoughBalance && (
            <p className="text-xs text-destructive text-center">
              Insufficient balance. You need {(settlementAmount - userBalance).toFixed(2)} BSK more.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
