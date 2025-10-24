import { useState } from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { LevelSelector } from "@/components/referrals/LevelSelector"
import { MemberCard } from "@/components/referrals/MemberCard"
import { useDownlineTree } from "@/hooks/useDownlineTree"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DownlineMemberProfile } from "@/components/referrals/DownlineMemberProfile"
import type { DownlineMember } from "@/hooks/useDownlineTree"

export default function TeamTreeView() {
  const { data, isLoading } = useDownlineTree()
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [selectedMember, setSelectedMember] = useState<DownlineMember | null>(null)

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

  return (
    <ProgramPageTemplate 
      title="Your Team" 
      subtitle={`${data.totalMembers} members across ${data.deepestLevel} levels`}
    >
      <div className="space-y-6 pb-24">
        {/* Level Selector */}
        <LevelSelector 
          levels={levelData}
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
        />

        {/* Level Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">
              {data.levelStats.find(l => l.level === selectedLevel)?.member_count || 0}
            </p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.levelStats.find(l => l.level === selectedLevel)?.active_count || 0}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-primary">
              {data.levelStats.find(l => l.level === selectedLevel)?.total_generated.toFixed(0) || 0}
            </p>
            <p className="text-xs text-muted-foreground">BSK Earned</p>
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
