import { useState } from 'react';
import { useActivePurchaseOffers, useUserPurchaseClaims, usePurchaseOffer } from '@/hooks/usePurchaseOffers';
import { useUserBSKBalance } from '@/hooks/useUserBSKBalance';
import { OneTimeOfferCard } from '@/components/purchase/OneTimeOfferCard';
import { PurchaseConfirmationDialog } from '@/components/purchase/PurchaseConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, History } from 'lucide-react';
import Confetti from 'react-confetti';

export default function OneTimePurchasePage() {
  const navigate = useNavigate();
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [selectedOffer, setSelectedOffer] = useState<{offer: any; amount: number} | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: offers, isLoading: offersLoading } = useActivePurchaseOffers();
  const { data: claims, isLoading: claimsLoading } = useUserPurchaseClaims();
  const { balance, loading: balanceLoading } = useUserBSKBalance();
  const purchaseMutation = usePurchaseOffer();

  const userBalance = balance?.withdrawable || 0;
  const claimedOfferIds = new Set(claims?.map((c) => c.bonus_id) || []);

  const handlePurchaseClick = (offer: any, amount: number) => {
    console.log('[OneTimePurchasePage] handlePurchaseClick called', { 
      offerId: offer.id, 
      offerName: offer.campaign_name,
      amount,
      userBalance 
    });
    setSelectedOffer({ offer, amount });
    console.log('[OneTimePurchasePage] Confirmation dialog opened');
  };

  const handleConfirmPurchase = () => {
    console.log('[OneTimePurchasePage] handleConfirmPurchase called', { selectedOffer });
    if (!selectedOffer) {
      console.warn('[OneTimePurchasePage] No offer selected');
      return;
    }

    console.log('[OneTimePurchasePage] Starting purchase mutation');
    purchaseMutation.mutate(
      { offerId: selectedOffer.offer.id, purchaseAmount: selectedOffer.amount },
      {
        onSuccess: (data) => {
          console.log('[OneTimePurchasePage] Purchase successful:', data);
          setSelectedOffer(null);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        },
        onError: (error) => {
          console.error('[OneTimePurchasePage] Purchase failed:', error);
        }
      }
    );
  };

  if (offersLoading || claimsLoading || balanceLoading) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/programs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Gift className="h-8 w-8 text-primary" />
              One-Time Purchase Offers
            </h1>
            <p className="text-muted-foreground mt-1">
              Exclusive limited-time offers with bonus BSK rewards
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={() => navigate('/app/programs/bsk-purchase-history')}>
          <History className="h-4 w-4 mr-2" />
          Purchase History
        </Button>
      </div>

      {/* Balance Display */}
      <div className="p-4 bg-accent/10 rounded-lg border flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Your Withdrawable Balance</p>
          <p className="text-2xl font-bold">{userBalance.toLocaleString()} BSK</p>
        </div>
      </div>

      {/* Offers Grid */}
      {!offers || offers.length === 0 ? (
        <div className="text-center py-16">
          <Gift className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Active Offers</h3>
          <p className="text-muted-foreground">
            Check back later for new exclusive purchase offers
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {offers.map((offer) => (
            <OneTimeOfferCard
              key={offer.id}
              offer={offer}
              isUserClaimed={claimedOfferIds.has(offer.id)}
              userBalance={userBalance}
              onPurchase={(amount: number) => handlePurchaseClick(offer, amount)}
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <PurchaseConfirmationDialog
        offer={selectedOffer?.offer || null}
        selectedAmount={selectedOffer?.amount || 0}
        userBalance={userBalance}
        open={!!selectedOffer}
        onOpenChange={(open) => !open && setSelectedOffer(null)}
        onConfirm={handleConfirmPurchase}
        isLoading={purchaseMutation.isPending}
      />
    </div>
  );
}
