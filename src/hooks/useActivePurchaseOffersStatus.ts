import { useActivePurchaseOffers } from './usePurchaseOffers';

export interface ActiveOfferStatus {
  hasActiveOffers: boolean;
  bestOffer: any | null;
  offerCount: number;
  timeRemaining: number | null;
  isEndingSoon: boolean;
  isLoading: boolean;
}

/**
 * Lightweight hook to check if there are active purchase offers
 * Returns the best offer (highest bonus %) and time remaining
 */
export function useActivePurchaseOffersStatus(): ActiveOfferStatus {
  const { data: offers, isLoading } = useActivePurchaseOffers();
  
  // Find best offer (highest total bonus percentage)
  const bestOffer = offers?.reduce((best, current) => {
    if (!best) return current;
    
    const currentBonus = (current.withdrawable_bonus_percent || 0) + (current.holding_bonus_percent || 0);
    const bestBonus = (best.withdrawable_bonus_percent || 0) + (best.holding_bonus_percent || 0);
    
    return currentBonus > bestBonus ? current : best;
  }, null as any);
  
  // Calculate time remaining until best offer expires
  const timeRemaining = bestOffer && bestOffer.end_at
    ? new Date(bestOffer.end_at).getTime() - Date.now()
    : null;
  
  // Check if ending soon (less than 24 hours)
  const isEndingSoon = timeRemaining !== null && timeRemaining > 0 && timeRemaining < 24 * 60 * 60 * 1000;
  
  return {
    hasActiveOffers: (offers?.length ?? 0) > 0,
    bestOffer,
    offerCount: offers?.length ?? 0,
    timeRemaining: timeRemaining && timeRemaining > 0 ? timeRemaining : null,
    isEndingSoon,
    isLoading
  };
}
