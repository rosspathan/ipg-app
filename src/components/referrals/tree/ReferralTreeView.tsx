import { useState } from 'react';
import { useHierarchicalReferralTree } from '@/hooks/useHierarchicalReferralTree';
import { TreeNode } from './TreeNode';
import { TreeStats } from './TreeStats';
import { TreeFilters } from './TreeFilters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DownlineMemberProfile } from '@/components/referrals/DownlineMemberProfile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Network } from 'lucide-react';
import { TreeNode as TreeNodeType } from '@/hooks/useHierarchicalReferralTree';

export function ReferralTreeView() {
  const {
    data: treeData,
    rawData,
    isLoading,
    toggleNode,
    expandAll,
    collapseAll,
    expandToLevel,
    searchQuery,
    setSearchQuery,
    filterVIPOnly,
    setFilterVIPOnly,
    filterActiveOnly,
    setFilterActiveOnly,
  } = useHierarchicalReferralTree();

  const [selectedMember, setSelectedMember] = useState<TreeNodeType | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!treeData) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No team members yet. Share your referral code to start building your network!
        </AlertDescription>
      </Alert>
    );
  }

  const handleNodeClick = (node: TreeNodeType) => {
    setSelectedMember(node);
  };

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      <TreeStats data={rawData} />

      {/* Main Tree Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <CardTitle>Referral Network Tree</CardTitle>
          </div>
          <CardDescription>
            Visualize your entire team structure with expandable branches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <TreeFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterVIPOnly={filterVIPOnly}
            onVIPFilterChange={setFilterVIPOnly}
            filterActiveOnly={filterActiveOnly}
            onActiveFilterChange={setFilterActiveOnly}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onExpandToLevel={expandToLevel}
          />

          {/* Tree */}
          <div className="relative overflow-x-auto pb-4">
            <div className="min-w-max">
              <TreeNode
                node={treeData}
                onToggle={toggleNode}
                onNodeClick={handleNodeClick}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Active (Generating BSK)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-purple-500 rounded" />
              <span>VIP Member</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-yellow-500 rounded" />
              <span>Gold Badge</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Profile Dialog */}
      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DownlineMemberProfile
              member={{
                user_id: selectedMember.userId,
                display_name: selectedMember.displayName,
                username: selectedMember.username,
                email: '',
                current_badge: selectedMember.badgeName,
                badge_date: null,
                level: selectedMember.level,
                total_generated: selectedMember.generatedAmount,
                join_date: selectedMember.joinedAt,
                direct_sponsor_id: null,
              }}
              open={!!selectedMember}
              onClose={() => setSelectedMember(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
