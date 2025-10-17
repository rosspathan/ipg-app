import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigation } from "@/hooks/useNavigation";
import { useAuthUser } from '@/hooks/useAuthUser';
import { useTeamReferrals } from '@/hooks/useTeamReferrals';
import { supabase } from '@/integrations/supabase/client';
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
import type { BadgeGridItem } from "@/components/badges/BadgeGrid";

const BadgeSubscriptionScreen = () => {
  const { goBack } = useNavigation();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const { badgeThresholds, loading } = useTeamReferrals();
  const displayName = useDisplayName();
  
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
          setBskBalance(Number(balanceData.withdrawable_balance) + Number(balanceData.holding_balance));
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
    
    if (bskBalance < costToPay) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${costToPay} BSK but only have ${bskBalance.toFixed(2)} BSK`,
        variant: "destructive"
      });
      setSelectedBadge(null);
      return;
    }

    setPurchasingBadge(selectedBadge.name);
    
    try {
      const { data, error } = await supabase.functions.invoke('badge-purchase', {
        body: {
          user_id: user.id,
          badge_name: selectedBadge.name,
          previous_badge: currentBadge === 'NONE' ? null : currentBadge,
          bsk_amount: costToPay,
          is_upgrade: selectedBadge.isUpgrade
        }
      });

      if (error) throw error;

      // Show celebration
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);

      toast({
        title: "🎉 Success!",
        description: `${selectedBadge.isUpgrade ? 'Upgraded to' : 'Purchased'} ${selectedBadge.name} badge! Your referrer earned 10% commission.`
      });

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
        setBskBalance(Number(balanceData.withdrawable_balance) + Number(balanceData.holding_balance));
      } else {
        setBskBalance(prev => prev - costToPay);
      }
      
      setSelectedBadge(null);
      
    } catch (error: any) {
      console.error('Badge purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to process badge purchase",
        variant: "destructive"
      });
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
  const comparisonFeatures = [
    {
      name: 'Referral Levels',
      values: Object.fromEntries(
        activeBadges.map(b => [b.badge_name.toUpperCase(), b.unlock_levels])
      )
    },
    {
      name: 'Bonus BSK',
      values: Object.fromEntries(
        activeBadges.map(b => [b.badge_name.toUpperCase(), `${b.bonus_bsk_holding} BSK`])
      )
    },
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
                  <span className="text-muted-foreground">Your Balance:</span>
                  <span className="font-semibold">{bskBalance.toFixed(2)} BSK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referrer Commission:</span>
                  <span className="font-semibold text-accent">
                    {((selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price || 0) * 0.1).toFixed(2)} BSK (10%)
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purchasingBadge !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPurchase} disabled={purchasingBadge !== null}>
              {purchasingBadge ? 'Processing...' : 'Confirm Purchase'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BadgeSubscriptionScreen;
