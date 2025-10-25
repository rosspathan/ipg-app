import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { normalizeBadgeName } from "@/lib/badgeUtils";
import { Users, TrendingUp } from "lucide-react";
import { TreeNode } from "@/hooks/useHierarchicalReferralTree";

interface TreeNodeCardProps {
  node: TreeNode;
  onClick: () => void;
  isHighlighted?: boolean;
}

export function TreeNodeCard({ node, onClick, isHighlighted }: TreeNodeCardProps) {
  const badgeTier = normalizeBadgeName(node.badgeName);
  const isVIP = badgeTier === 'VIP';

  const getBorderColor = () => {
    if (isHighlighted) return 'border-primary';
    switch (badgeTier) {
      case 'VIP': return 'border-purple-500/50';
      case 'Diamond': return 'border-blue-500/50';
      case 'Platinum': return 'border-gray-400/50';
      case 'Gold': return 'border-yellow-500/50';
      case 'Silver': return 'border-gray-300/50';
      default: return 'border-border/50';
    }
  };

  const getBackgroundGradient = () => {
    switch (badgeTier) {
      case 'VIP': return 'bg-gradient-to-br from-purple-500/5 to-pink-500/5';
      case 'Diamond': return 'bg-gradient-to-br from-blue-500/5 to-cyan-500/5';
      case 'Platinum': return 'bg-gradient-to-br from-gray-400/5 to-gray-500/5';
      case 'Gold': return 'bg-gradient-to-br from-yellow-500/5 to-orange-500/5';
      case 'Silver': return 'bg-gradient-to-br from-gray-300/5 to-gray-400/5';
      default: return 'bg-card/50';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative p-3 rounded-lg border-2 cursor-pointer
        transition-all duration-300 hover:scale-105 hover:shadow-lg
        ${getBorderColor()} ${getBackgroundGradient()}
        ${isHighlighted ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      {/* Active indicator */}
      {node.isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 border-2 border-background">
          <AvatarFallback className={`text-xs font-bold ${isVIP ? 'bg-purple-500 text-white' : 'bg-primary/10'}`}>
            {node.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate">{node.displayName}</span>
            {node.badgeName && (
              <Badge variant="secondary" className="text-xs">
                {node.badgeName}
              </Badge>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground truncate">
            @{node.username}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">{node.generatedAmount.toFixed(0)} BSK</span>
            </div>
            {node.directReferralsCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                <span className="font-medium">{node.directReferralsCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Level badge */}
      {node.id !== 'virtual-root' && (
        <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          L{node.level}
        </div>
      )}
    </div>
  );
}
