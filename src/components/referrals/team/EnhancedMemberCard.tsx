import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Award, Calendar, TrendingUp, Users, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import type { DownlineMember } from "@/hooks/useDownlineTree";
import { normalizeBadgeName, getBadgeDisplayName } from "@/lib/badgeUtils";

interface EnhancedMemberCardProps {
  member: DownlineMember;
  onClick: () => void;
}

export function EnhancedMemberCard({ member, onClick }: EnhancedMemberCardProps) {
  const normalizedBadge = normalizeBadgeName(member.current_badge);
  const hasNoBadge = normalizedBadge === 'None';
  const isActive = member.total_generated > 0;
  const isVIP = normalizedBadge === 'VIP';
  
  // Get initials from display name or username
  const displayText = member.display_name || member.username || 'NA';
  const initials = displayText
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Badge color based on status
  const getBadgeVariant = () => {
    if (hasNoBadge) return "outline";
    if (isVIP) return "default";
    return "secondary";
  };

  // Status indicator color
  const getStatusColor = () => {
    if (hasNoBadge) return "text-muted-foreground";
    if (isActive) return "text-green-600 dark:text-green-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const getStatusIcon = () => {
    if (hasNoBadge) return <XCircle className="h-4 w-4" />;
    if (isActive) return <CheckCircle2 className="h-4 w-4" />;
    return <Award className="h-4 w-4" />;
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group border-l-4"
      style={{
        borderLeftColor: hasNoBadge 
          ? 'hsl(var(--muted-foreground))' 
          : isVIP 
          ? 'hsl(var(--primary))' 
          : 'hsl(var(--secondary))'
      }}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 border-2" style={{
            borderColor: hasNoBadge 
              ? 'hsl(var(--muted))' 
              : isVIP 
              ? 'hsl(var(--primary))' 
              : 'hsl(var(--secondary))'
          }}>
            <AvatarFallback className={hasNoBadge ? "bg-muted" : isVIP ? "bg-primary/10" : "bg-secondary/10"}>
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Member Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                  {member.display_name || member.username || 'Unknown'}
                </h3>
                {member.username && member.display_name !== member.username && (
                  <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
                )}
              </div>
              
              {/* Status Badge */}
              <div className={`flex items-center gap-1 ${getStatusColor()}`}>
                {getStatusIcon()}
              </div>
            </div>

            {/* Badge & Level */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant={getBadgeVariant()} className="text-xs">
                {hasNoBadge ? (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    No Badge
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {getBadgeDisplayName(normalizedBadge)}
                  </span>
                )}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Level {member.level}
              </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {member.join_date ? format(new Date(member.join_date), 'MMM d, yyyy') : '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">{member.total_generated.toFixed(0)} BSK</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
