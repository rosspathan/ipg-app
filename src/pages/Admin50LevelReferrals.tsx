import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Admin50LevelEditor } from '@/components/referrals/Admin50LevelEditor';
import { BadgeUnlockLevelsEditor } from '@/components/referrals/BadgeUnlockLevelsEditor';
import { VIPMilestoneEditor } from '@/components/referrals/VIPMilestoneEditor';

export default function Admin50LevelReferrals() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>
        <div>
          <h1 className="text-3xl font-bold">50-Level Team Referrals Configuration</h1>
          <p className="text-muted-foreground">
            Configure the complete 50-level referral system, badge unlocks, and VIP milestones
          </p>
        </div>
      </div>

      <Tabs defaultValue="levels" className="space-y-6">
        <TabsList>
          <TabsTrigger value="levels">50 Level Rewards</TabsTrigger>
          <TabsTrigger value="badges">Badge Unlock Levels</TabsTrigger>
          <TabsTrigger value="vip">VIP Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="levels">
          <Admin50LevelEditor />
        </TabsContent>

        <TabsContent value="badges">
          <BadgeUnlockLevelsEditor />
        </TabsContent>

        <TabsContent value="vip">
          <VIPMilestoneEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
