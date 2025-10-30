import { useState } from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { LevelSelector } from "@/components/referrals/LevelSelector"
import { MemberCard } from "@/components/referrals/MemberCard"
import { useDownlineTree } from "@/hooks/useDownlineTree"
import { LevelUnlockVisualizer } from "@/components/referrals/LevelUnlockVisualizer"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Users, Network, RefreshCw, List } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DownlineMemberProfile } from "@/components/referrals/DownlineMemberProfile"
import { ReferralTreeView } from "@/components/referrals/tree/ReferralTreeView"
import { DownlineTableView } from "@/components/referrals/DownlineTableView"
import { TeamOverviewDashboard, SmartListView } from "@/components/referrals/team"
import type { DownlineMember } from "@/hooks/useDownlineTree"
import { supabase } from "@/integrations/supabase/client"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useQuery } from "@tanstack/react-query"
import { ReferralCodeUsageTracker } from "@/components/referrals/ReferralCodeUsageTracker"
import { ReferralHelpDialog } from "@/components/referrals/ReferralHelpDialog"
import { VIPMilestoneExplainer } from "@/components/referrals/VIPMilestoneExplainer"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

export default function TeamTreeView() {
  const { user } = useAuthUser()
  const { data, isLoading } = useDownlineTree()
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [selectedMember, setSelectedMember] = useState<DownlineMember | null>(null)
  const [showUsageTracker, setShowUsageTracker] = useState(false)
  const [isRebuilding, setIsRebuilding] = useState(false)
  const queryClient = useQueryClient()

  // Fetch user's badge and unlock levels
  const { data: userBadgeData } = useQuery({
    queryKey: ['user-badge-unlock', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: badge } = await supabase
        .from('user_badge_holdings')
        .select('current_badge')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!badge) return null;

      const { data: threshold } = await supabase
        .from('badge_thresholds')
        .select('badge_name, unlock_levels')
        .ilike('badge_name', badge.current_badge)
        .eq('is_active', true)
        .maybeSingle();

      return {
        badge_name: badge.current_badge,
        unlock_levels: threshold?.unlock_levels || 1
      };
    },
    enabled: !!user?.id
  })

  const handleRebuildTree = async () => {
    if (!user?.id) return;
    
    setIsRebuilding(true);
    try {
      const { error } = await supabase.functions.invoke('build-referral-tree', {
        body: { user_id: user.id }
      });
      
      if (error) throw error;
      
      // Refetch all team-related data
      await queryClient.invalidateQueries({ queryKey: ['downline-tree', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['direct-referral-count', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['direct-referrals', user.id] });
      
      toast.success('Tree rebuilt successfully!');
    } catch (error) {
      console.error('Error rebuilding tree:', error);
      toast.error('Failed to rebuild tree. Please try again.');
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleRefresh = async () => {
    if (!user?.id) return;
    
    await queryClient.invalidateQueries({ queryKey: ['downline-tree', user.id] });
    await queryClient.invalidateQueries({ queryKey: ['direct-referral-count', user.id] });
    await queryClient.invalidateQueries({ queryKey: ['direct-referrals', user.id] });
    
    toast.success('Data refreshed!');
  };

  if (isLoading) {
    return (
      <ProgramPageTemplate title="Your Team" subtitle="Network overview">
        <div className="space-y-4 pb-24">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </ProgramPageTemplate>
    )
  }

  if (!data || data.totalMembers === 0) {
    return (
      <ProgramPageTemplate title="Your Team" subtitle="Network overview">
        <div className="pb-24 space-y-6">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              You don't have any team members yet. Share your referral code to start building your network!
            </AlertDescription>
          </Alert>
          <div className="p-8 text-center bg-muted/30 rounded-lg border-2 border-dashed">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Build Your Team</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Once people join using your referral code, you'll see them here. 
              All team members will be displayed, whether they have a badge or not.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                ✅ Direct referrals (Level 1)
              </div>
              <div className="flex items-center gap-2">
                ✅ Multi-level network (up to Level 50)
              </div>
              <div className="flex items-center gap-2">
                ✅ All badge statuses tracked
              </div>
            </div>
          </div>
        </div>
      </ProgramPageTemplate>
    )
  }

  // Prepare level data for selector
  const levelData = data.levelStats.map((stats) => ({
    level: stats.level,
    count: stats.member_count
  })).sort((a, b) => a.level - b.level)

  // Get members for selected level
  const membersAtLevel = data.members.filter(m => m.level === selectedLevel)

  // Calculate VIP counts
  const directVIPCount = data.members.filter(m => {
    if (m.level !== 1) return false
    const badge = m.current_badge?.toUpperCase() || ''
    return badge.includes('VIP') || badge.includes('SMART')
  }).length

  const totalVIPCount = data.members.filter(m => {
    const badge = m.current_badge?.toUpperCase() || ''
    return badge.includes('VIP') || badge.includes('SMART')
  }).length

  return (
    <ProgramPageTemplate 
      title="Your Team" 
      subtitle={`${data.totalMembers} members across ${data.deepestLevel} levels`}
    >
      <div className="space-y-6 pb-24">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReferralHelpDialog />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUsageTracker(!showUsageTracker)}
            >
              <Users className="w-4 h-4 mr-2" />
              {showUsageTracker ? 'Hide' : 'Show'} Code Usage
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleRebuildTree}
              disabled={isRebuilding}
            >
              {isRebuilding ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Rebuilding...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Force Rebuild
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Referral Code Usage Tracker */}
        {showUsageTracker && <ReferralCodeUsageTracker />}

        {/* Overview Dashboard */}
        <TeamOverviewDashboard data={data} />

        {/* VIP Milestone Explainer */}
        <VIPMilestoneExplainer 
          directVIPCount={directVIPCount}
          totalTeamVIPCount={totalVIPCount}
        />

        {/* Level Unlock Visualizer */}
        <LevelUnlockVisualizer userBadge={userBadgeData} />

        {/* Tabs for different views */}
        <Tabs defaultValue="smart-list" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="smart-list" className="gap-2">
              <List className="h-4 w-4" />
              Smart List
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <Users className="h-4 w-4" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="tree" className="gap-2">
              <Network className="h-4 w-4" />
              Tree View
            </TabsTrigger>
            <TabsTrigger value="levels" className="gap-2">
              <Users className="h-4 w-4" />
              Level View
            </TabsTrigger>
          </TabsList>

          {/* Smart List View Tab */}
          <TabsContent value="smart-list" className="space-y-6">
            <SmartListView 
              members={data.members}
              maxLevel={data.deepestLevel}
              onMemberClick={setSelectedMember}
            />
          </TabsContent>

          {/* Table View Tab */}
          <TabsContent value="table" className="space-y-6">
            <DownlineTableView />
          </TabsContent>

          {/* Tree View Tab */}
          <TabsContent value="tree" className="space-y-6">
            <ReferralTreeView />
          </TabsContent>

          {/* Level View Tab */}
          <TabsContent value="levels" className="space-y-6">

        {/* Level Selector */}
        <LevelSelector 
          levels={levelData}
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
        />

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-center">
            <p className="text-2xl font-bold">{data.totalMembers}</p>
            <p className="text-xs text-muted-foreground">Total Members</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Across {data.deepestLevel} levels</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{directVIPCount}</p>
            <p className="text-xs text-muted-foreground">Direct VIP (L1)</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">For milestones</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalVIPCount}</p>
            <p className="text-xs text-muted-foreground">Total VIP</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">All levels</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {data.levelStats.reduce((sum, l) => sum + l.active_count, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Active Team</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Earning members</p>
          </div>
        </div>

        {/* Level Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">
              {data.levelStats.find(l => l.level === selectedLevel)?.member_count || 0}
            </p>
            <p className="text-xs text-muted-foreground">Members L{selectedLevel}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.levelStats.find(l => l.level === selectedLevel)?.active_count || 0}
            </p>
            <p className="text-xs text-muted-foreground">Active L{selectedLevel}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-primary">
              {data.levelStats.find(l => l.level === selectedLevel)?.total_generated.toFixed(0) || 0}
            </p>
            <p className="text-xs text-muted-foreground">BSK from L{selectedLevel}</p>
          </div>
        </div>

            {/* Members Grid */}
            {membersAtLevel.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {membersAtLevel.map((member) => (
                  <MemberCard
                    key={member.user_id}
                    displayName={member.display_name}
                    username={member.username}
                    badge={member.current_badge || undefined}
                    generatedAmount={member.total_generated}
                    isActive={member.total_generated > 0}
                    onClick={() => setSelectedMember(member)}
                  />
                ))}
              </div>
            ) : (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  No members at Level {selectedLevel} yet.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Member Profile Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Profile</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <DownlineMemberProfile 
              member={selectedMember}
              open={!!selectedMember}
              onClose={() => setSelectedMember(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </ProgramPageTemplate>
  )
}
