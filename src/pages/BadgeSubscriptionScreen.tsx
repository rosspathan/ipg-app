import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Shield, Star, Crown, Gem, Sparkles, ArrowUp } from "lucide-react";
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
import { useDisplayName } from "@/hooks/useDisplayName"

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

  // Load current badge and BSK balance
  useEffect(() => {
    if (!user?.id) return;
    
    const loadUserData = async () => {
      try {
        // Get current badge from user_badge_holdings
        const { data: badgeData } = await supabase
          .from('user_badge_holdings')
          .select('current_badge')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (badgeData) {
          setCurrentBadge(badgeData.current_badge);
        }

        // Get BSK balance
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

  const getBadgeIcon = (badgeName: string) => {
    switch (badgeName.toUpperCase()) {
      case 'SILVER': return <Shield className="w-6 h-6" />;
      case 'GOLD': return <Star className="w-6 h-6" />;
      case 'PLATINUM': return <Gem className="w-6 h-6" />;
      case 'DIAMOND': return <Sparkles className="w-6 h-6" />;
      case 'VIP': return <Crown className="w-6 h-6" />;
      default: return <Shield className="w-6 h-6" />;
    }
  };

  const getBadgeColor = (badgeName: string) => {
    switch (badgeName.toUpperCase()) {
      case 'SILVER': return 'text-gray-400';
      case 'GOLD': return 'text-yellow-500';
      case 'PLATINUM': return 'text-cyan-400';
      case 'DIAMOND': return 'text-blue-400';
      case 'VIP': return 'text-purple-500';
      default: return 'text-gray-400';
    }
  };

  const badgeOrder = ['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'VIP'];
  const currentBadgeIndex = badgeOrder.indexOf(currentBadge.toUpperCase());

  const handleBadgePurchase = (badge: typeof badgeThresholds[0]) => {
    const badgeIndex = badgeOrder.indexOf(badge.badge_name.toUpperCase());
    const isUpgrade = currentBadgeIndex >= 0 && badgeIndex > currentBadgeIndex;
    
    let upgradeCost = badge.bsk_threshold;
    if (isUpgrade) {
      const currentBadgeData = badgeThresholds.find(b => b.badge_name.toUpperCase() === currentBadge.toUpperCase());
      if (currentBadgeData) {
        upgradeCost = badge.bsk_threshold - currentBadgeData.bsk_threshold;
      }
    }

    setSelectedBadge({
      name: badge.badge_name,
      price: badge.bsk_threshold,
      isUpgrade,
      upgradeCost
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
      // Call edge function to process badge purchase
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

      toast({
        title: "Success!",
        description: `${selectedBadge.isUpgrade ? 'Upgraded to' : 'Purchased'} ${selectedBadge.name} badge. Your referrer earned 10% commission.`
      });

      // Refresh data from server
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-4 px-6 py-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{displayName}'s Badges</h1>
            <p className="text-sm text-muted-foreground">Subscribe or upgrade to unlock more benefits</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle>Your Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Badge</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={getBadgeColor(currentBadge)}>{getBadgeIcon(currentBadge)}</span>
                  <span className="text-lg font-bold">{currentBadge}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">BSK Balance</p>
                <p className="text-lg font-bold">{bskBalance.toFixed(2)} BSK</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Badges */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Badges</h2>
          
          {activeBadges.map((badge) => {
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

            return (
              <Card key={badge.id} className={isCurrentBadge ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className={getBadgeColor(badge.badge_name)}>
                        {getBadgeIcon(badge.badge_name)}
                      </span>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {badge.badge_name}
                          {isCurrentBadge && (
                            <Badge variant="secondary">Current</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{badge.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Full Price</p>
                        <p className="font-bold">{badge.bsk_threshold} BSK</p>
                      </div>
                      {isUpgrade && displayCost !== badge.bsk_threshold && (
                        <div className="bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                          <p className="text-muted-foreground text-xs">Upgrade Cost (You Save {badge.bsk_threshold - displayCost} BSK)</p>
                          <p className="font-bold text-green-500 text-lg">{displayCost} BSK</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Unlocks Levels</p>
                        <p className="font-bold">{badge.unlock_levels}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Bonus BSK (Holding)</p>
                        <p className="font-bold">{badge.bonus_bsk_holding} BSK</p>
                      </div>
                    </div>

                    {isCurrentBadge ? (
                      <Button disabled className="w-full">
                        Current Badge
                      </Button>
                    ) : isLowerTier ? (
                      <Button disabled variant="outline" className="w-full">
                        Lower Tier
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleBadgePurchase(badge)}
                        disabled={purchasingBadge !== null}
                        className="w-full"
                      >
                        {isUpgrade && <ArrowUp className="w-4 h-4 mr-2" />}
                        {isUpgrade ? `Upgrade for ${displayCost} BSK` : `Purchase for ${displayCost} BSK`}
                      </Button>
                    )}
                    
                    {displayCost > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        ✨ Your referrer earns 10% commission on this purchase
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={selectedBadge !== null} onOpenChange={() => setSelectedBadge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedBadge?.isUpgrade ? 'Confirm Badge Upgrade' : 'Confirm Badge Purchase'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {selectedBadge?.isUpgrade ? 'upgrade to' : 'purchase'} the <strong>{selectedBadge?.name}</strong> badge.
              <br /><br />
              <strong>Cost:</strong> {selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price} BSK
              <br />
              <strong>Your Balance:</strong> {bskBalance.toFixed(2)} BSK
              <br /><br />
              Your referrer will automatically receive 10% commission ({((selectedBadge?.isUpgrade ? selectedBadge.upgradeCost : selectedBadge?.price || 0) * 0.1).toFixed(2)} BSK).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purchasingBadge !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPurchase} disabled={purchasingBadge !== null}>
              {purchasingBadge ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BadgeSubscriptionScreen;
