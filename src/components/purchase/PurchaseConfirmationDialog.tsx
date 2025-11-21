import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PurchaseOffer } from '@/hooks/usePurchaseOffers';
import { useBSKExchangeRate, formatBSKtoINR } from '@/hooks/useBSKExchangeRate';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Lock, AlertTriangle, Gift } from 'lucide-react';

interface PurchaseConfirmationDialogProps {
  offer: PurchaseOffer | null;
  selectedAmount: number;
  userBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const PurchaseConfirmationDialog = ({
  offer,
  selectedAmount,
  userBalance,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: PurchaseConfirmationDialogProps) => {
  const { data: bskRate } = useBSKExchangeRate();

  if (!offer) return null;

  const withdrawableBonus = (selectedAmount * offer.withdrawable_bonus_percent) / 100;
  const holdingBonus = (selectedAmount * offer.holding_bonus_percent) / 100;
  const totalBonus = withdrawableBonus + holdingBonus;
  // Net effect: debit + refund = 0, so new balance = current + withdrawable bonus only
  const newWithdrawableBalance = userBalance + withdrawableBonus;
  const hasInsufficientBalance = userBalance < selectedAmount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
          <AlertDialogDescription>
            Review your purchase details before confirming
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* FREE PROMOTIONAL OFFER Badge */}
          <div className="bg-success/10 border border-success/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-success" />
              <div>
                <div className="font-semibold text-success">FREE PROMOTIONAL OFFER</div>
                <div className="text-sm text-muted-foreground">
                  Your {selectedAmount.toLocaleString()} BSK will be refunded + you'll receive bonus BSK
                </div>
              </div>
            </div>
          </div>

          {/* Offer Details */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">{offer.campaign_name}</h4>
            {offer.description && (
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            )}
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">You Pay</span>
              <span className="font-semibold">
                {selectedAmount.toLocaleString()} BSK
                {bskRate && (
                  <span className="text-muted-foreground ml-1">
                    ({formatBSKtoINR(selectedAmount, bskRate)})
                  </span>
                )}
              </span>
            </div>

            <Separator />

            {offer.withdrawable_bonus_percent > 0 && (
              <div className="flex justify-between text-sm items-center">
                <div className="flex items-center gap-1.5 text-success">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Withdrawable Bonus ({offer.withdrawable_bonus_percent}%)</span>
                </div>
                <span className="font-semibold text-success">
                  +{withdrawableBonus.toLocaleString()} BSK
                </span>
              </div>
            )}

            {offer.holding_bonus_percent > 0 && (
              <div className="flex justify-between text-sm items-center">
                <div className="flex items-center gap-1.5 text-primary">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Holding Bonus ({offer.holding_bonus_percent}%)</span>
                </div>
                <span className="font-semibold text-primary">
                  +{holdingBonus.toLocaleString()} BSK
                </span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between text-sm text-success">
              <span>Amount Refunded</span>
              <span className="font-semibold">
                +{selectedAmount.toLocaleString()} BSK
              </span>
            </div>

            <Separator />

            <div className="flex justify-between text-sm font-semibold">
              <span>Total Bonus</span>
              <span className="text-accent-foreground">
                +{totalBonus.toLocaleString()} BSK
              </span>
            </div>
          </div>

          {/* Balance Info */}
          <div className="p-3 bg-accent/10 rounded-lg space-y-1.5 text-sm border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Withdrawable Balance</span>
              <span className="font-medium">{userBalance.toLocaleString()} BSK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New Withdrawable Balance</span>
              <span className="font-medium text-success">
                {newWithdrawableBalance.toLocaleString()} BSK
              </span>
            </div>
            {holdingBonus > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Holding Balance Gain</span>
                <span className="font-medium text-primary">
                  +{holdingBonus.toLocaleString()} BSK
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-success">
              <span>Net Cost</span>
              <span>₹0 (FREE!)</span>
            </div>
          </div>

          {/* Warning */}
          {hasInsufficientBalance && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">
                Insufficient balance. Please add more BSK to your account.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm text-warning">
              This offer can only be claimed once. Make sure you want to proceed.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              console.log('[PurchaseConfirmationDialog] Confirm button clicked', {
                selectedAmount,
                userBalance,
                hasInsufficientBalance,
                isLoading
              });
              onConfirm();
            }}
            disabled={hasInsufficientBalance || isLoading}
          >
            {isLoading ? 'Processing...' : 'Confirm Purchase'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
