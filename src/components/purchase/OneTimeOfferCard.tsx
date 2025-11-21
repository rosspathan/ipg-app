import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountdownTimer } from './CountdownTimer';
import { useBSKExchangeRate, formatBSKtoINR } from '@/hooks/useBSKExchangeRate';
import { PurchaseOffer } from '@/hooks/usePurchaseOffers';
import { Sparkles, TrendingUp, Lock } from 'lucide-react';

interface OneTimeOfferCardProps {
  offer: PurchaseOffer;
  isUserClaimed: boolean;
  userBalance: number;
  onPurchase: (amount: number) => void;
}

export const OneTimeOfferCard = ({ offer, isUserClaimed, userBalance, onPurchase }: OneTimeOfferCardProps) => {
  const { data: bskRate } = useBSKExchangeRate();
  const [selectedAmount, setSelectedAmount] = useState(offer.min_purchase_amount_bsk);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const withdrawableBonus = (selectedAmount * offer.withdrawable_bonus_percent) / 100;
  const holdingBonus = (selectedAmount * offer.holding_bonus_percent) / 100;
  
  const hasInsufficientBalance = userBalance < selectedAmount;
  const isDisabled = isUserClaimed || isProcessing;

  const handlePurchaseClick = () => {
    // Set processing immediately for visual feedback
    setIsProcessing(true);
    
    console.log('[OneTimeOfferCard] Purchase button clicked', {
      offerId: offer.id,
      selectedAmount,
      userBalance,
      isUserClaimed,
      hasInsufficientBalance,
      isDisabled
    });
    
    if (isDisabled) {
      console.warn('[OneTimeOfferCard] Button click blocked - disabled state', {
        isUserClaimed,
        isProcessing
      });
      setIsProcessing(false);
      return;
    }

    console.log('[OneTimeOfferCard] Calling onPurchase callback');
    onPurchase(selectedAmount);
    
    // Reset processing state after a delay (will be reset by parent component anyway)
    setTimeout(() => setIsProcessing(false), 3000);
  };

  return (
    <Card className={offer.is_featured ? 'border-primary shadow-lg' : ''}>
      {offer.is_featured && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
          Featured
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="text-xl">{offer.campaign_name}</CardTitle>
        {offer.description && <CardDescription>{offer.description}</CardDescription>}
        <CountdownTimer endDate={offer.end_at} className="mt-2" />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label htmlFor="amount">Choose Amount ({offer.min_purchase_amount_bsk.toLocaleString()} - {offer.max_purchase_amount_bsk.toLocaleString()} BSK)</Label>
          <Input
            id="amount"
            type="number"
            min={offer.min_purchase_amount_bsk}
            max={offer.max_purchase_amount_bsk}
            value={selectedAmount}
            onChange={(e) => setSelectedAmount(Number(e.target.value))}
            disabled={isDisabled}
          />
          {bskRate && <p className="text-sm text-muted-foreground">≈ {formatBSKtoINR(selectedAmount, bskRate)}</p>}
        </div>

        <div className="space-y-2">
          {offer.withdrawable_bonus_percent > 0 && (
            <div className="flex justify-between p-3 bg-success/10 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm">Withdrawable ({offer.withdrawable_bonus_percent}%)</span>
              </div>
              <span className="font-semibold text-success">+{withdrawableBonus.toLocaleString()} BSK</span>
            </div>
          )}
          {offer.holding_bonus_percent > 0 && (
            <div className="flex justify-between p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-sm">Holding ({offer.holding_bonus_percent}%)</span>
              </div>
              <span className="font-semibold text-primary">+{holdingBonus.toLocaleString()} BSK</span>
            </div>
          )}
        </div>

        <Button className="w-full" size="lg" onClick={handlePurchaseClick} disabled={isDisabled}>
          {isProcessing 
            ? 'Opening...' 
            : isUserClaimed 
            ? 'Already Claimed' 
            : hasInsufficientBalance 
            ? 'Insufficient Balance' 
            : `Purchase ${selectedAmount.toLocaleString()} BSK`}
        </Button>
      </CardContent>
    </Card>
  );
};
