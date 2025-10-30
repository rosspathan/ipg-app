import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { EnhancedMemberCard } from "./EnhancedMemberCard";
import { TeamFilters } from "./TeamFilters";
import type { DownlineMember } from "@/hooks/useDownlineTree";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SmartListViewProps {
  members: DownlineMember[];
  maxLevel: number;
  onMemberClick: (member: DownlineMember) => void;
}

export function SmartListView({ members, maxLevel, onMemberClick }: SmartListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [badgeFilter, setBadgeFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([1, 2]));

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesSearch = 
          member.display_name?.toLowerCase().includes(search) ||
          member.username?.toLowerCase().includes(search) ||
          member.email?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Badge filter
      if (badgeFilter !== "all") {
        const badge = member.current_badge?.toUpperCase() || '';
        if (badgeFilter === "vip") {
          if (!badge.includes('VIP') && !badge.includes('SMART')) return false;
        } else if (badgeFilter === "with-badge") {
          if (!member.current_badge) return false;
        } else if (badgeFilter === "no-badge") {
          if (member.current_badge) return false;
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        const isActive = member.total_generated > 0;
        if (statusFilter === "active" && !isActive) return false;
        if (statusFilter === "inactive" && isActive) return false;
      }

      // Level filter
      if (levelFilter !== "all") {
        if (levelFilter === "6-10") {
          if (member.level < 6 || member.level > 10) return false;
        } else if (levelFilter === "11+") {
          if (member.level < 11) return false;
        } else {
          if (member.level !== parseInt(levelFilter)) return false;
        }
      }

      return true;
    });
  }, [members, searchQuery, badgeFilter, levelFilter, statusFilter]);

  // Group by level
  const membersByLevel = useMemo(() => {
    const groups = new Map<number, DownlineMember[]>();
    filteredMembers.forEach(member => {
      if (!groups.has(member.level)) {
        groups.set(member.level, []);
      }
      groups.get(member.level)!.push(member);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, members]) => ({
        level,
        members: members.sort((a, b) => {
          // Sort by badge status first (VIP, then other badges, then no badge)
          const aIsVIP = a.current_badge?.toUpperCase().includes('VIP') || a.current_badge?.toUpperCase().includes('SMART');
          const bIsVIP = b.current_badge?.toUpperCase().includes('VIP') || b.current_badge?.toUpperCase().includes('SMART');
          if (aIsVIP && !bIsVIP) return -1;
          if (!aIsVIP && bIsVIP) return 1;
          
          const aHasBadge = !!a.current_badge;
          const bHasBadge = !!b.current_badge;
          if (aHasBadge && !bHasBadge) return -1;
          if (!aHasBadge && bHasBadge) return 1;
          
          // Then by earned amount
          return b.total_generated - a.total_generated;
        })
      }));
  }, [filteredMembers]);

  const toggleLevel = (level: number) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedLevels(new Set(membersByLevel.map(g => g.level)));
  };

  const collapseAll = () => {
    setExpandedLevels(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <TeamFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            badgeFilter={badgeFilter}
            onBadgeFilterChange={setBadgeFilter}
            levelFilter={levelFilter}
            onLevelFilterChange={setLevelFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalResults={filteredMembers.length}
            maxLevel={maxLevel}
          />
        </CardContent>
      </Card>

      {/* Expand/Collapse All */}
      {membersByLevel.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Grouped into {membersByLevel.length} level{membersByLevel.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>
      )}

      {/* Members by Level */}
      {membersByLevel.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No members found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {membersByLevel.map(({ level, members: levelMembers }) => {
            const isExpanded = expandedLevels.has(level);
            const vipCount = levelMembers.filter(m => 
              m.current_badge?.toUpperCase().includes('VIP') || 
              m.current_badge?.toUpperCase().includes('SMART')
            ).length;
            const badgeCount = levelMembers.filter(m => m.current_badge).length;
            const noBadgeCount = levelMembers.filter(m => !m.current_badge).length;

            return (
              <Collapsible key={level} open={isExpanded} onOpenChange={() => toggleLevel(level)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                            <CardTitle className="text-lg">
                              Level {level} {level === 1 && "- Direct Referrals"}
                            </CardTitle>
                          </div>
                          <Badge variant="secondary">
                            {levelMembers.length} {levelMembers.length === 1 ? 'member' : 'members'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {vipCount > 0 && (
                            <Badge variant="default" className="text-xs">
                              {vipCount} VIP
                            </Badge>
                          )}
                          {badgeCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {badgeCount} Active
                            </Badge>
                          )}
                          {noBadgeCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {noBadgeCount} No Badge
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {levelMembers.map(member => (
                          <EnhancedMemberCard
                            key={member.user_id}
                            member={member}
                            onClick={() => onMemberClick(member)}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
