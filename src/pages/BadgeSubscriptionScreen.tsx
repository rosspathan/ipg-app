import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigation } from "@/hooks/useNavigation";
import { useAuthUser } from '@/hooks/useAuthUser';
import { useTeamReferrals } from '@/hooks/useTeamReferrals';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';
import { useDisplayName } from "@/hooks/useDisplayName";
import { BadgeHero } from "@/components/badges/BadgeHero";
import { TierTimeline } from "@/components/badges/TierTimeline";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { BadgeComparisonTable } from "@/components/badges/BadgeComparisonTable";
import { BadgeBenefits, generateTierBenefits } from "@/components/badges/BadgeBenefits";
import { BadgeSocialProof } from "@/components/badges/BadgeSocialProof";
import { InsufficientBalanceBanner } from "@/components/badges/InsufficientBalanceBanner";
import { BuyBSKDialog } from "@/components/badges/BuyBSKDialog";
import type { BadgeGridItem } from "@/components/badges/BadgeGrid";

const BadgeSubscriptionScreen = () => {
  const { goBack } = useNavigation();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const { badgeThresholds, loading } = useTeamReferrals();
  const displayName = useDisplayName();
  const queryClient = useQueryClient();
  
  const [currentBadge, setCurrentBadge] = useState<string>('NONE');
  const [bskBalance, setBskBalance] = useState<number>(0);
  const [purchasingBadge, setPurchasingBadge] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<{
    name: string;
    price: number;
    isUpgrade: boolean;
    upgradeCost: number;
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showBuyBSKDialog, setShowBuyBSKDialog] = useState(false);

  const badgeOrder = ['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'VIP'];

  // Load current badge and BSK balance
  useEffect(() => {
    if (!user?.id) return;
    
    const loadUserData = async () => {
      try {
        const { data: badgeData } = await supabase
          .from('user_badge_holdings')
          .select('current_badge')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (badgeData) {
          setCurrentBadge(badgeData.current_badge);
        }

        const { data: balanceData } = await supabase
          .from('user_bsk_balances')
          .select('withdrawable_balance, holding_balance')
          .eq('user_id', user.id)
          .single();
        
        if (balanceData) {
          // Only use withdrawable balance for badge purchases
          // Holding balance is locked and cannot be used for purchases
          setBskBalance(Number(balanceData.withdrawable_balance));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [user?.id]);

  const handleBadgePurchase = (badge: BadgeGridItem) => {
    setSelectedBadge({
      name: badge.name,
      price: badge.fullPrice,
      isUpgrade: badge.isUpgrade,
      upgradeCost: badge.upgradeCost || badge.fullPrice
    });
  };

  const confirmPurchase = async () => {
    if (!selectedBadge || !user?.id) return;

    const costToPay = selectedBadge.isUpgrade ? selectedBadge.upgradeCost : selectedBadge.price;
    
    setPurchasingBadge(selectedBadge.name);
    
    try {
      // Step 1: Pre-purchase validation
      console.log('Running pre-purchase validation...');
      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        'validate-badge-purchase',
        {
          body: {
            userId: user.id,
            badgeName: selectedBadge.name,
            requiredAmount: costToPay,
          },
        }
      );

      if (validationError) {
        console.error('Validation error:', validationError);
        console.log('Validation error details:', { 
          status: (validationError as any)?.status, 
          message: (validationError as any)?.message 
        });
        
        // Fallback: perform local checks and potentially proceed
        const alreadyOwned = selectedBadge.name.toUpperCase() === currentBadge.toUpperCase();
        const insufficient = bskBalance < costToPay;
        
        if (insufficient) {
          toast({
            title: "💰 Insufficient Balance",
            description: (
              <div className="space-y-3">
                <p>You need {(costToPay - bskBalance).toLocaleString()} more BSK</p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setSelectedBadge(null);
                    setShowBuyBSKDialog(true);
                  }}
                  className="w-full"
                >
                  Buy BSK Now
                </Button>
              </div>
            ),
            variant: "destructive",
          });
          setSelectedBadge(null);
          return;
        }
        
        if (alreadyOwned) {
          toast({
            title: "Already Owned",
            description: "You already own this badge",
            variant: "destructive",
          });
          setSelectedBadge(null);
          return;
        }
        
        // Otherwise, proceed to purchase - server will validate
        console.log('Validation service unavailable, proceeding with purchase (server will validate)');
      } else {
        // Only access validation object when no error occurred
        const validation = validationData as {
          valid: boolean;
          errors: string[];
          warnings: string[];
          userBalance: number;
          shortfall: number;
          alreadyOwned: boolean;
          kycCompleted: boolean;
        };

        console.log('Validation result:', validation);

        // Handle validation errors with specific CTAs
        if (!validation.valid) {
          if (validation.errors.some(e => e.includes('Insufficient balance'))) {
            toast({
              title: "💰 Insufficient Balance",
              description: (
                <div className="space-y-3">
                  <p>You need {validation.shortfall.toLocaleString()} more BSK</p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setSelectedBadge(null);
                      setShowBuyBSKDialog(true);
                    }}
                    className="w-full"
                  >
                    Buy BSK Now
                  </Button>
                </div>
              ),
              variant: "destructive",
            });
            setSelectedBadge(null);
            return;
          }

          if (validation.alreadyOwned) {
            toast({
              title: "Already Owned",
              description: "You already own this badge",
              variant: "destructive",
            });
            setSelectedBadge(null);
            return;
          }

          // KYC check removed - badge purchase no longer requires KYC

          // Generic validation error
          toast({
            title: "Validation Failed",
            description: validation.errors.join('. '),
            variant: "destructive",
          });
          setSelectedBadge(null);
          return;
        }
      }

      // Step 2: Process purchase
      console.log('Validation passed, processing purchase...');
      const { data, error } = await supabase.functions.invoke('badge-commission-processor', {
        body: {
          userId: user.id,
          toBadge: selectedBadge.name,
          fromBadge: currentBadge === 'NONE' ? undefined : currentBadge,
          paidAmountBSK: costToPay,
          paymentRef: `badge_${Date.now()}`,
          paymentMethod: 'BSK'
        }
      });

      if (error) {
        throw error;
      }

      // Show celebration
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);

      toast({
        title: "🎉 Success!",
        description: (
          <div className="space-y-2">
            <p>{selectedBadge.isUpgrade ? 'Upgraded to' : 'Purchased'} {selectedBadge.name} badge!</p>
            <p className="text-sm text-muted-foreground">
              Your referrer earned {(costToPay * 0.1).toFixed(2)} BSK (10% commission)
            </p>
          </div>
        )
      });

      // Invalidate all balance and badge related queries
      console.log('🔄 Invalidating cache after badge purchase...');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bsk-balance'] }),
        queryClient.invalidateQueries({ queryKey: ['user-bsk-balances'] }),
        queryClient.invalidateQueries({ queryKey: ['home-page-data'] }),
        queryClient.invalidateQueries({ queryKey: ['user-badge'] }),
        queryClient.invalidateQueries({ queryKey: ['badge-thresholds'] }),
      ]);

      // Refresh data
      const { data: badgeData } = await supabase
        .from('user_badge_holdings')
        .select('current_badge')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (badgeData) {
        setCurrentBadge(badgeData.current_badge);
      } else {
        setCurrentBadge(selectedBadge.name);
      }

      const { data: balanceData } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance, holding_balance')
        .eq('user_id', user.id)
        .single();
      
      if (balanceData) {
        setBskBalance(Number(balanceData.withdrawable_balance));
      } else {
        setBskBalance(prev => prev - costToPay);
      }
      
      setSelectedBadge(null);
      
      console.log('✅ Badge purchase complete and cache invalidated');
      
    } catch (error: any) {
      console.error('Badge purchase error:', error);
      
      // Parse error message for specific cases
      const errorMessage = error?.message || '';
      
      if (errorMessage.includes('INSUFFICIENT_BALANCE')) {
        const match = errorMessage.match(/Required ([\d.]+), Available ([\d.]+)/);
        const shortfall = match ? parseFloat(match[1]) - parseFloat(match[2]) : costToPay - bskBalance;
        
        toast({
          title: '💰 Insufficient Balance',
          description: (
            <div className="space-y-3">
              <p>You need {shortfall.toFixed(2)} more BSK</p>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setSelectedBadge(null);
                  setShowBuyBSKDialog(true);
                }}
                className="w-full"
              >
                Buy BSK Now
              </Button>
            </div>
          ),
          variant: 'destructive',
        });
      } else if (errorMessage.includes('DUPLICATE_BADGE')) {
        toast({
          title: 'Already Owned',
          description: 'You already own this badge',
          variant: 'destructive',
        });
      } else {
        // Generic error with retry option
        toast({
          title: 'Purchase Failed',
          description: (
            <div className="space-y-3">
              <p>{errorMessage || 'An unexpected error occurred. Please try again.'}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Retry purchase
                  confirmPurchase();
                }}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          ),
          variant: 'destructive',
        });
      }
      
      setSelectedBadge(null);
    } finally {
      setPurchasingBadge(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeBadges = badgeThresholds
    .filter(b => b.is_active && b.bsk_threshold > 0 && !(b.description || '').toLowerCase().includes('default badge'))
    .sort((a, b) => {
      return badgeOrder.indexOf(a.badge_name.toUpperCase()) - badgeOrder.indexOf(b.badge_name.toUpperCase());
    });

  const currentBadgeIndex = badgeOrder.indexOf(currentBadge.toUpperCase());
  const nextTier = activeBadges.find((b) => {
    const badgeIndex = badgeOrder.indexOf(b.badge_name.toUpperCase());
    return badgeIndex > currentBadgeIndex;
  });

  // Transform badges for BadgeGrid
  const gridBadges: BadgeGridItem[] = activeBadges.map((badge) => {
    const badgeIndex = badgeOrder.indexOf(badge.badge_name.toUpperCase());
    const isCurrentBadge = badge.badge_name.toUpperCase() === currentBadge.toUpperCase();
    const canPurchase = currentBadgeIndex < 0 || badgeIndex > currentBadgeIndex;
    const isLowerTier = currentBadgeIndex >= 0 && badgeIndex <= currentBadgeIndex;
    
    let displayCost = badge.bsk_threshold;
    let isUpgrade = false;
    
    if (currentBadgeIndex >= 0 && badgeIndex > currentBadgeIndex) {
      const currentBadgeData = badgeThresholds.find(b => b.badge_name.toUpperCase() === currentBadge.toUpperCase());
      if (currentBadgeData) {
        displayCost = badge.bsk_threshold - currentBadgeData.bsk_threshold;
        isUpgrade = true;
      }
    }

    return {
      id: badge.id,
      name: badge.badge_name,
      description: badge.description || '',
      fullPrice: badge.bsk_threshold,
      upgradeCost: displayCost,
      unlockLevels: badge.unlock_levels,
      bonusBSK: badge.bonus_bsk_holding,
      isCurrent: isCurrentBadge,
      isUpgrade,
      isLowerTier,
      canPurchase: canPurchase && !isCurrentBadge,
    };
  });

  // Timeline tiers
  const timelineTiers = activeBadges.map(b => ({
    name: b.badge_name,
    unlockLevels: b.unlock_levels,
    cost: b.bsk_threshold,
  }));

  // Comparison features
  const hasBonuses = activeBadges.some(b => b.bonus_bsk_holding > 0);
  
  const comparisonFeatures = [
    {
      name: 'Referral Levels',
      values: Object.fromEntries(
        activeBadges.map(b => [b.badge_name.toUpperCase(), b.unlock_levels])
      )
    },
    ...(hasBonuses ? [{
      name: 'Bonus BSK',
      values: Object.fromEntries(
        activeBadges.map(b => [
          b.badge_name.toUpperCase(), 
          b.bonus_bsk_holding > 0 ? `${b.bonus_bsk_holding.toLocaleString()} BSK` : '—'
        ])
      )
    }] : []),
    {
      name: 'Commission Rate',
      values: {
        SILVER: '5%',
        GOLD: '7%',
        PLATINUM: '10%',
        DIAMOND: '12%',
        VIP: '15%'
      }
    },
    {
      name: 'Priority Support',
      values: {
        SILVER: false,
        GOLD: true,
        PLATINUM: true,
        DIAMOND: true,
        VIP: true
      }
    },
    {
      name: 'Early Access',
      values: {
        SILVER: false,
        GOLD: false,
        PLATINUM: true,
        DIAMOND: true,
        VIP: true
      }
    },
    {
      name: 'VIP Physical Card',
      values: {
        SILVER: false,
        GOLD: false,
        PLATINUM: false,
        DIAMOND: false,
        VIP: true
      }
    }
  ];

  const tierBenefits = generateTierBenefits(activeBadges);

  return (
    <div className="min-h-screen bg-background">
      {/* Celebration Confetti */}
      {showCelebration && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      {/* Success Animation */}
      {showCelebration && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ duration: 0.5, repeat: 2 }}
            className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white rounded-full p-12 shadow-2xl"
          >
            <div className="text-8xl">🎉</div>
          </motion.div>
        </motion.div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-4 px-6 py-4 max-w-7xl mx-auto">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{displayName}'s Badge Upgrade</h1>
            <p className="text-sm text-muted-foreground">Unlock more benefits and higher earnings</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {/* Insufficient Balance Banner */}
        {activeBadges.length > 0 && bskBalance < Math.min(...activeBadges.map(b => b.bsk_threshold)) && (
          <InsufficientBalanceBanner
            currentBalance={bskBalance}
            minimumRequired={Math.min(...activeBadges.map(b => b.bsk_threshold))}
            onBuyBSK={() => setShowBuyBSKDialog(true)}
          />
        )}

        {/* Hero Section */}
        <BadgeHero
          currentBadge={currentBadge}
          bskBalance={bskBalance}
          nextTierCost={nextTier?.bsk_threshold}
          nextTierName={nextTier?.badge_name}
        />

        {/* Social Proof */}
        <BadgeSocialProof />

        {/* Tier Timeline */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Your Badge Journey</h2>
            <p className="text-muted-foreground mt-2">Track your progress through the tiers</p>
          </div>
          <TierTimeline currentBadge={currentBadge} tiers={timelineTiers} />
        </div>

        {/* Badge Grid */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Available Badges</h2>
            <p className="text-muted-foreground mt-2">Choose the perfect tier for your goals</p>
          </div>
          <BadgeGrid
            badges={gridBadges}
            onPurchase={handleBadgePurchase}
            isProcessing={purchasingBadge !== null}
          />
        </div>

        {/* Comparison Table */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Compare All Tiers</h2>
            <p className="text-muted-foreground mt-2">See what each badge offers</p>
          </div>
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            <BadgeComparisonTable
              tiers={activeBadges.map(b => b.badge_name)}
              features={comparisonFeatures}
              currentBadge={currentBadge}
            />
          </div>
        </div>

        {/* Benefits Showcase */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Exclusive Benefits</h2>
            <p className="text-muted-foreground mt-2">Explore what you'll unlock at each tier</p>
          </div>
          <BadgeBenefits tierBenefits={tierBenefits} currentBadge={currentBadge} />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={selectedBadge !== null} onOpenChange={() => setSelectedBadge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedBadge?.isUpgrade ? 'Confirm Badge Upgrade' : 'Confirm Badge Purchase'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to {selectedBadge?.isUpgrade ? 'upgrade to' : 'purchase'} the <strong>{selectedBadge?.name}</strong> badge.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-semibold">{selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price} BSK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="font-semibold">{bskBalance.toFixed(2)} BSK</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Balance After Purchase:</span>
                  <span className={`font-bold text-lg ${
                    bskBalance >= (selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price || 0)
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-destructive'
                  }`}>
                    {(bskBalance - (selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price || 0)).toFixed(2)} BSK
                    {bskBalance >= (selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price || 0)
                      ? ' ✓'
                      : ' ✗'}
                  </span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referrer Earns:</span>
                  <span className="font-semibold text-accent">
                    {((selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price || 0) * 0.1).toFixed(2)} BSK (10%)
                  </span>
                </div>
              </div>
              {bskBalance < (selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price || 0) && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    ⚠️ Insufficient Balance
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You need {((selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price || 0) - bskBalance).toFixed(2)} more BSK
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBadge(null);
                      setShowBuyBSKDialog(true);
                    }}
                    className="w-full"
                  >
                    Buy BSK Now
                  </Button>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purchasingBadge !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPurchase} 
              disabled={
                purchasingBadge !== null || 
                bskBalance < (selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price || 0)
              }
            >
              {purchasingBadge ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚙️</span>
                  Processing...
                </span>
              ) : (
                'Confirm Purchase'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Buy BSK Dialog */}
      <BuyBSKDialog
        open={showBuyBSKDialog}
        onOpenChange={setShowBuyBSKDialog}
        requiredAmount={selectedBadge ? (selectedBadge.isUpgrade ? selectedBadge.upgradeCost : selectedBadge.price) : undefined}
        currentBalance={bskBalance}
      />
    </div>
  );
};

export default BadgeSubscriptionScreen;
