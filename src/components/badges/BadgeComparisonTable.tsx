import { Check, X, Shield, Star, Crown, Gem, Sparkles } from "lucide-react";
import { badgeTokens, getTierTokens } from "@/design-system/badge-tokens";
import { cn } from "@/lib/utils";

interface ComparisonFeature {
  name: string;
  values: Record<string, string | number | boolean>;
}

interface BadgeComparisonTableProps {
  tiers: string[];
  features: ComparisonFeature[];
  currentBadge: string;
  className?: string;
}

const getBadgeIcon = (badgeName: string) => {
  switch (badgeName.toUpperCase()) {
    case 'SILVER': return Shield;
    case 'GOLD': return Star;
    case 'PLATINUM': return Gem;
    case 'DIAMOND': return Sparkles;
    case 'VIP': return Crown;
    default: return Shield;
  }
};

const getTierKey = (badge: string): keyof typeof badgeTokens.tiers => {
  const key = badge.toLowerCase() as keyof typeof badgeTokens.tiers;
  return badgeTokens.tiers[key] ? key : 'none';
};

export function BadgeComparisonTable({ tiers, features, currentBadge, className }: BadgeComparisonTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse">
        {/* Header */}
        <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <tr>
            <th className="p-4 text-left border-b-2 border-border">
              <span className="text-sm font-semibold text-muted-foreground">Features</span>
            </th>
            {tiers.map((tier) => {
              const tierKey = getTierKey(tier);
              const tokens = getTierTokens(tierKey);
              const Icon = getBadgeIcon(tier);
              const isCurrent = tier.toUpperCase() === currentBadge.toUpperCase();

              return (
                <th
                  key={tier}
                  className={cn(
                    "p-4 text-center border-b-2 min-w-[140px]",
                    isCurrent && "bg-card"
                  )}
                  style={{
                    borderColor: isCurrent ? `hsl(${tokens.primary})` : 'hsl(var(--border))',
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ 
                        background: badgeTokens.gradients[tierKey].card,
                        boxShadow: isCurrent ? `0 0 16px hsl(${tokens.glow})` : 'none'
                      }}
                    >
                      <Icon 
                        className="w-6 h-6"
                        style={{ color: `hsl(${tokens.primary})` }}
                      />
                    </div>
                    <span 
                      className="font-bold text-sm"
                      style={{ color: `hsl(${tokens.primary})` }}
                    >
                      {tier}
                    </span>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Current
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {features.map((feature, index) => (
            <tr
              key={feature.name}
              className={cn(
                "border-b border-border transition-colors hover:bg-muted/30",
                index % 2 === 0 ? "bg-background" : "bg-muted/10"
              )}
            >
              <td className="p-4 font-medium text-sm">
                {feature.name}
              </td>
              {tiers.map((tier) => {
                const value = feature.values[tier.toUpperCase()];
                const isCurrent = tier.toUpperCase() === currentBadge.toUpperCase();
                const tierKey = getTierKey(tier);
                const tokens = getTierTokens(tierKey);

                return (
                  <td
                    key={tier}
                    className={cn(
                      "p-4 text-center",
                      isCurrent && "bg-card/50"
                    )}
                  >
                    {typeof value === 'boolean' ? (
                      value ? (
                        <Check 
                          className="w-5 h-5 mx-auto"
                          style={{ color: `hsl(${tokens.primary})` }}
                        />
                      ) : (
                        <X className="w-5 h-5 mx-auto text-muted-foreground/50" />
                      )
                    ) : (
                      <span 
                        className="font-semibold"
                        style={{ color: `hsl(${tokens.primary})` }}
                      >
                        {value}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
