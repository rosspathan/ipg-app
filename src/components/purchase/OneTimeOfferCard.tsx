import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from './CountdownTimer';
import { useBSKExchangeRate, formatBSKtoINR } from '@/hooks/useBSKExchangeRate';
import { PurchaseOffer } from '@/hooks/usePurchaseOffers';
import { Sparkles, TrendingUp, Lock } from 'lucide-react';

interface OneTimeOfferCardProps {
  offer: PurchaseOffer;
  isUserClaimed: boolean;
  userBalance: number;
  onPurchase: () => void;
}

export const OneTimeOfferCard = ({ offer, isUserClaimed, userBalance, onPurchase }: OneTimeOfferCardProps) => {
  const { data: bskRate, isLoading: rateLoading } = useBSKExchangeRate();
  
  const withdrawableBonus = (offer.purchase_amount_bsk * offer.withdrawable_bonus_percent) / 100;
  const holdingBonus = (offer.purchase_amount_bsk * offer.holding_bonus_percent) / 100;
  const totalReceived = withdrawableBonus + holdingBonus;
  
  const hasInsufficientBalance = userBalance < offer.purchase_amount_bsk;
  const isDisabled = isUserClaimed || hasInsufficientBalance;

  return (
    <Card className={`relative overflow-hidden ${offer.is_featured ? 'border-primary shadow-lg' : ''}`}>
      {offer.is_featured && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
          Featured
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{offer.campaign_name}</CardTitle>
            {offer.description && (
              <CardDescription className="text-sm">{offer.description}</CardDescription>
            )}
          </div>
        </div>
        <CountdownTimer endDate={offer.end_at} className="mt-2" />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Purchase Amount */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="text-sm text-muted-foreground mb-1">Purchase Amount</div>
          <div className="text-2xl font-bold">{offer.purchase_amount_bsk.toLocaleString()} BSK</div>
          {!rateLoading && bskRate && (
            <div className="text-sm text-muted-foreground">
              ≈ {formatBSKtoINR(offer.purchase_amount_bsk, bskRate)}
            </div>
          )}
        </div>

        {/* Bonus Breakdown */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">You will receive:</div>
          
          {offer.withdrawable_bonus_percent > 0 && (
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Withdrawable Bonus</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-success">+{withdrawableBonus.toLocaleString()} BSK</div>
                <div className="text-xs text-muted-foreground">{offer.withdrawable_bonus_percent}%</div>
              </div>
            </div>
          )}

          {offer.holding_bonus_percent > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Holding Bonus</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-primary">+{holdingBonus.toLocaleString()} BSK</div>
                <div className="text-xs text-muted-foreground">{offer.holding_bonus_percent}%</div>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between p-3 bg-accent rounded-lg border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
              <span className="font-medium">Total Bonus</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">+{totalReceived.toLocaleString()} BSK</div>
              {!rateLoading && bskRate && (
                <div className="text-xs text-muted-foreground">
                  ≈ {formatBSKtoINR(totalReceived, bskRate)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {isUserClaimed && (
            <Badge variant="secondary">Already Claimed</Badge>
          )}
          {hasInsufficientBalance && !isUserClaimed && (
            <Badge variant="destructive">Insufficient Balance</Badge>
          )}
        </div>

        {/* Purchase Button */}
        <Button 
          onClick={onPurchase}
          disabled={isDisabled}
          className="w-full"
          size="lg"
        >
          {isUserClaimed ? 'Already Claimed' : hasInsufficientBalance ? 'Insufficient Balance' : 'Purchase Now'}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          This offer can only be claimed once per user
        </p>
      </CardContent>
    </Card>
  );
};
