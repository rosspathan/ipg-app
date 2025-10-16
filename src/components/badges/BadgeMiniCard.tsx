import { Shield, Star, Crown, Gem, Sparkles, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { badgeTokens, getTierTokens, getTierKey } from "@/design-system/badge-tokens";

interface BadgeMiniCardProps {
  badge: string;
  onClick?: () => void;
  className?: string;
}

const getBadgeIcon = (tier: string) => {
  const tierUpper = tier.toUpperCase();
  switch (tierUpper) {
    case 'SILVER': return Shield;
    case 'GOLD': return Star;
    case 'PLATINUM': return Gem;
    case 'DIAMOND': return Sparkles;
    case 'VIP': return Crown;
    default: return Award;
  }
};

export function BadgeMiniCard({ badge, onClick, className }: BadgeMiniCardProps) {
  const tierKey = getTierKey(badge);
  const tokens = getTierTokens(tierKey);
  const Icon = getBadgeIcon(badge);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl p-4 border-2 backdrop-blur-sm transition-all",
        onClick && "cursor-pointer hover:scale-105",
        className
      )}
      style={{
        background: badgeTokens.gradients[tierKey].card,
        borderColor: `hsl(${tokens.primary} / 0.3)`,
        boxShadow: `0 0 16px hsl(${tokens.glow} / 0.2)`
      }}
    >
      <div className="relative z-10 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm border"
          style={{
            background: `hsl(${tokens.primary} / 0.1)`,
            borderColor: `hsl(${tokens.primary} / 0.2)`
          }}
        >
          <Icon className="w-5 h-5" style={{ color: `hsl(${tokens.primary})` }} />
        </div>
        <div>
          <h4 className="font-semibold text-sm" style={{ color: `hsl(${tokens.primary})` }}>
            {badge === "None" ? "Member" : badge}
          </h4>
          <p className="text-xs text-muted-foreground">Badge Tier</p>
        </div>
      </div>
    </div>
  );
}
