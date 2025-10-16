import { motion } from "framer-motion";
import { X, Users, Percent, Coins, Shield, Zap, Crown, Gift, TrendingUp } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { badgeTokens, getTierTokens, getTierKey } from "@/design-system/badge-tokens";
import { cn } from "@/lib/utils";

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

const benefits = [
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
    icon: Coins,
    title: "Bonus BSK Holding",
    getDescription: (levels: number, bonus: number) => `Receive ${bonus} BSK as bonus holding balance when you upgrade`
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
  const tierKey = getTierKey(badge.name);
  const tokens = getTierTokens(tierKey);
  const isVip = badge.name.toUpperCase() === 'VIP';
  const allBenefits = isVip ? [...benefits, ...vipBenefits] : benefits;

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
            onClick={onPurchase}
            size="lg"
            style={{
              background: badgeTokens.gradients[tierKey].card,
              color: 'white'
            }}
            className="hover:opacity-90 transition-opacity"
          >
            Upgrade Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
