import React from "react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";
import { 
  Gift, 
  Coins, 
  Copy, 
  TrendingUp, 
  MoreHorizontal,
  Sparkles,
  Target,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  action: () => void;
  gradient?: string;
}

interface QuickActionGridProps {
  onRewards: () => void;
  onEarn: () => void;
  onCopyAddress: () => void;
  onMarkets: () => void;
  onMore: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const QuickActionGrid: React.FC<QuickActionGridProps> = ({
  onRewards,
  onEarn,
  onCopyAddress,
  onMarkets,
  onMore,
  className,
  style
}) => {
  const actions: QuickAction[] = [
    {
      id: "rewards",
      label: "Rewards",
      icon: Gift,
      color: "text-pink-400",
      gradient: "from-pink-500/20 to-purple-500/20",
      action: onRewards
    },
    {
      id: "earn",
      label: "Earn",
      icon: Coins,
      color: "text-yellow-400", 
      gradient: "from-yellow-500/20 to-orange-500/20",
      action: onEarn
    },
    {
      id: "copy-address",
      label: "Copy Address",
      icon: Copy,
      color: "text-blue-400",
      gradient: "from-blue-500/20 to-cyan-500/20", 
      action: onCopyAddress
    },
    {
      id: "markets",
      label: "Markets",
      icon: TrendingUp,
      color: "text-green-400",
      gradient: "from-green-500/20 to-emerald-500/20",
      action: onMarkets
    },
    {
      id: "more",
      label: "More",
      icon: MoreHorizontal,
      color: "text-violet-400",
      gradient: "from-violet-500/20 to-indigo-500/20",
      action: onMore
    }
  ];

  return (
    <div className={cn("grid grid-cols-5 gap-3", className)} style={style}>
      {actions.map((action, index) => {
        const Icon = action.icon;
        
        return (
          <GlassCard
            key={action.id}
            className={cn(
              "p-0 border-border/30 cursor-pointer",
              action.gradient && `bg-gradient-to-br ${action.gradient}`
            )}
            style={{ 
              animationDelay: `${index * 80}ms`,
              animationFillMode: 'both'
            }}
            onClick={action.action}
          >
            <GlassCardContent className="p-4 flex flex-col items-center gap-2">
              <div className={cn(
                "ripple rounded-full p-3 bg-background/20 border border-border/30"
              )}>
                <Icon className={cn("h-5 w-5", action.color)} />
              </div>
              <span className="text-xs font-medium text-center text-foreground/80 leading-tight">
                {action.label}
              </span>
            </GlassCardContent>
          </GlassCard>
        );
      })}
    </div>
  );
};

export default QuickActionGrid;