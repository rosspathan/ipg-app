import { useState } from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { LevelSelector } from "@/components/referrals/LevelSelector"
import { MemberCard } from "@/components/referrals/MemberCard"
import { useDownlineTree } from "@/hooks/useDownlineTree"
import { LevelUnlockVisualizer } from "@/components/referrals/LevelUnlockVisualizer"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DownlineMemberProfile } from "@/components/referrals/DownlineMemberProfile"
import type { DownlineMember } from "@/hooks/useDownlineTree"
import { supabase } from "@/integrations/supabase/client"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useQuery } from "@tanstack/react-query"
import { ReferralCodeUsageTracker } from "@/components/referrals/ReferralCodeUsageTracker"
import { ReferralHelpDialog } from "@/components/referrals/ReferralHelpDialog"
import { VIPMilestoneExplainer } from "@/components/referrals/VIPMilestoneExplainer"

export default function TeamTreeView() {
  const { user } = useAuthUser()
  const { data, isLoading } = useDownlineTree()
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [selectedMember, setSelectedMember] = useState<DownlineMember | null>(null)
  const [showUsageTracker, setShowUsageTracker] = useState(false)

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
        <div className="pb-24">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              You don't have any team members yet. Share your referral code to start building your network!
            </AlertDescription>
          </Alert>
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
        {/* Help Button */}
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
        </div>

        {/* Referral Code Usage Tracker */}
        {showUsageTracker && <ReferralCodeUsageTracker />}

        {/* VIP Milestone Explainer */}
        <VIPMilestoneExplainer 
          directVIPCount={directVIPCount}
          totalTeamVIPCount={totalVIPCount}
        />

        {/* Level Unlock Visualizer */}
        <LevelUnlockVisualizer userBadge={userBadgeData} />

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
