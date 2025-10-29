import { useState, useEffect } from 'react';
import { useHierarchicalReferralTree } from '@/hooks/useHierarchicalReferralTree';
import { TreeNode } from './TreeNode';
import { TreeStats } from './TreeStats';
import { TreeFilters } from './TreeFilters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DownlineMemberProfile } from '@/components/referrals/DownlineMemberProfile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Info, Network, RefreshCw, AlertTriangle } from 'lucide-react';
import { TreeNode as TreeNodeType } from '@/hooks/useHierarchicalReferralTree';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
    orphanCount,
  } = useHierarchicalReferralTree();

  const [selectedMember, setSelectedMember] = useState<TreeNodeType | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const { user } = useAuthUser();
  const queryClient = useQueryClient();

  // Auto-expand to Level 2 on mount
  useEffect(() => {
    if (treeData && !isLoading) {
      expandToLevel(2);
    }
  }, []);

  const handleRebuildTree = async () => {
    if (!user?.id) return;
    
    setIsRebuilding(true);
    try {
      const { error } = await supabase.functions.invoke('build-referral-tree', {
        body: { user_id: user.id }
      });
      
      if (error) throw error;
      
      // Refetch the downline tree data
      await queryClient.invalidateQueries({ queryKey: ['downline-tree', user.id] });
      
      toast.success('Tree rebuilt successfully!');
    } catch (error) {
      console.error('Error rebuilding tree:', error);
      toast.error('Failed to rebuild tree. Please try again.');
    } finally {
      setIsRebuilding(false);
    }
  };

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

      {/* Orphan Warning Banner */}
      {orphanCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Found {orphanCount} unlinked member{orphanCount > 1 ? 's' : ''} in your tree. 
              These members' direct sponsors are missing from the dataset.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRebuildTree}
              disabled={isRebuilding}
            >
              {isRebuilding ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Rebuilding...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Rebuild My Tree
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
                sponsor_username: null,
                package_cost: null,
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
