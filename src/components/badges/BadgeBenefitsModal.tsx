import { motion } from "framer-motion";
import { X, Users, Percent, Coins, Shield, Zap, Crown, Gift, TrendingUp } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { badgeTokens, getTierTokens, getTierKey } from "@/design-system/badge-tokens";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { toast } from "sonner";

interface BadgeBenefitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: {
    name: string;
    unlockLevels: number;
    bonusBsk: number;
    cost: number;
  };
  onPurchase?: () => void;
}

const vipBenefits = [
  {
    icon: Crown,
    title: "VIP Physical Card",
    getDescription: () => "Receive an exclusive physical VIP membership card"
  },
  {
    icon: Gift,
    title: "Exclusive Rewards",
    getDescription: () => "Access VIP-only airdrops, contests, and special events"
  },
  {
    icon: TrendingUp,
    title: "Maximum Earnings",
    getDescription: () => "Unlock the highest commission rates and deepest referral network"
  }
];

export function BadgeBenefitsModal({ isOpen, onClose, badge, onPurchase }: BadgeBenefitsModalProps) {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const tierKey = getTierKey(badge.name);
  const tokens = getTierTokens(tierKey);
  const isVip = badge.name.toUpperCase() === 'VIP';
  
  // Build benefits list based on badge properties
  const baseBenefits = [
    {
      icon: Users,
      title: "Deep Referral Network",
      getDescription: (levels: number) => `Earn commissions from ${levels} levels deep in your referral network`
    },
    {
      icon: Percent,
      title: "Progressive Commissions",
      getDescription: () => "Earn higher commission rates on all trading activities in your network"
    },
    {
      icon: Shield,
      title: "Priority Support",
      getDescription: () => "Get faster response times and dedicated assistance from our support team"
    },
    {
      icon: Zap,
      title: "Early Access",
      getDescription: () => "Be the first to access new features and exclusive platform updates"
    }
  ];

  // Only add bonus benefit if badge actually has a bonus
  const benefits = badge.bonusBsk > 0 
    ? [
        baseBenefits[0],
        baseBenefits[1],
        {
          icon: Coins,
          title: "Bonus BSK Holding",
          getDescription: (levels: number, bonus: number) => `Receive ${bonus.toLocaleString()} BSK as bonus holding balance when you upgrade`
        },
        ...baseBenefits.slice(2)
      ]
    : baseBenefits;

  const allBenefits = isVip ? [...benefits, ...vipBenefits] : benefits;

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please login to purchase badges');
      return;
    }

    try {
      setLoading(true);
      console.log('🎖️ [BadgeBenefitsModal] Initiating badge purchase:', { 
        userId: user.id, 
        badge: badge.name, 
        cost: badge.cost 
      });
      
      // Call verification edge function
      const { data, error } = await supabase.functions.invoke(
        'verify-badge-purchase',
        {
          body: {
            user_id: user.id,
            badge_name: badge.name,
            cost: badge.cost
          }
        }
      );

      if (error) {
        console.error('❌ Purchase error:', error);
        toast.error(error.message || 'Failed to purchase badge');
        return;
      }

      if (!data?.purchased) {
        console.error('❌ Purchase failed:', data);
        toast.error(data?.error || 'Failed to purchase badge');
        return;
      }

      console.log('✅ Badge purchased successfully:', data);
      toast.success(`${badge.name} badge purchased successfully! 🎉`);
      onPurchase?.();
      onClose();
    } catch (err) {
      console.error('❌ Critical purchase error:', err);
      toast.error('Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Hero Section */}
        <div
          className="relative p-8 text-white overflow-hidden"
          style={{ background: badgeTokens.gradients[tierKey].card }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 backdrop-blur-sm border"
              style={{
                background: `hsl(${tokens.primary} / 0.2)`,
                borderColor: `hsl(${tokens.primary} / 0.3)`
              }}
            >
              <span className="text-sm font-bold">{badge.name} Badge</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Unlock Premium Benefits</h2>
            <p className="text-white/80">
              Upgrade to {badge.name} tier and enjoy exclusive privileges
            </p>
          </div>

          {/* Decorative elements */}
          <div
            className="absolute top-0 right-0 w-64 h-64 opacity-20 rounded-full blur-3xl"
            style={{ background: `hsl(${tokens.glow})` }}
          />
        </div>

        {/* Benefits List */}
        <div className="p-8 space-y-4">
          <h3 className="text-lg font-semibold mb-4">What You'll Get</h3>
          {allBenefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `hsl(${tokens.primary} / 0.1)` }}
                >
                  <Icon className="w-6 h-6" style={{ color: `hsl(${tokens.primary})` }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{benefit.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {benefit.getDescription(badge.unlockLevels, badge.bonusBsk)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-8 pt-0 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Investment</p>
            <p className="text-2xl font-bold">{badge.cost.toLocaleString()} BSK</p>
          </div>
          <Button
            onClick={handlePurchase}
            disabled={loading}
            size="lg"
            style={{
              background: badgeTokens.gradients[tierKey].card,
              color: 'white'
            }}
            className="hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Upgrade Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
