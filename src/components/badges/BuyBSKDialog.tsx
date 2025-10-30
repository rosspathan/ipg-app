import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Clock, 
  Shield, 
  Zap,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BuyBSKDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredAmount?: number;
  currentBalance?: number;
}

export function BuyBSKDialog({ 
  open, 
  onOpenChange,
  requiredAmount,
  currentBalance = 0
}: BuyBSKDialogProps) {
  const navigate = useNavigate();

  const handleManualPurchase = () => {
    onOpenChange(false);
    navigate('/app/programs/bsk-purchase-manual');
  };

  const handleDepositCrypto = () => {
    onOpenChange(false);
    navigate('/app/wallet/deposit');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">💰 Purchase BSK</DialogTitle>
          <DialogDescription>
            Choose your preferred method to add BSK to your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          {requiredAmount && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-mono font-semibold">{currentBalance.toLocaleString()} BSK</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Required Amount:</span>
                <span className="font-mono font-semibold text-primary">{requiredAmount.toLocaleString()} BSK</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You Need:</span>
                <span className="font-mono font-bold text-destructive">{(requiredAmount - currentBalance).toLocaleString()} BSK</span>
              </div>
            </div>
          )}

          {/* Purchase Methods */}
          <div className="space-y-3">
            {/* Method 1: Manual BSK Purchase (IPG) */}
            <div 
              className="group border-2 border-border hover:border-primary rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg bg-card"
              onClick={handleManualPurchase}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">Manual Purchase (IPG)</h3>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Transfer via BEP20 and submit proof for verification
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~2-24 hours
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-green-500" />
                      +50% Bonus
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Method 2: Crypto Deposit */}
            <div 
              className="group border-2 border-border hover:border-primary rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg bg-card"
              onClick={handleDepositCrypto}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">Deposit Crypto</h3>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deposit crypto and convert to BSK instantly
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Instant
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>
                All purchases are secure and verified. BSK can be used for badge upgrades, program access, and more.
              </span>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleManualPurchase}>
            Learn More
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
