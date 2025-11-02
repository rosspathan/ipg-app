import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReferralCommissionHistory } from './ReferralCommissionHistory';
import { VIPMilestoneHistory } from './VIPMilestoneHistory';
import { TrendingUp, Users, Award, BarChart } from 'lucide-react';

export function ComprehensiveCommissionDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Commission & Rewards Dashboard</h2>
        <p className="text-muted-foreground">
          Track all your earnings from direct commissions, team income, and VIP milestones
        </p>
      </div>

      <Tabs defaultValue="commissions" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            <span>All Commissions</span>
          </TabsTrigger>
          <TabsTrigger value="vip" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span>VIP Milestones</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commissions">
          <ReferralCommissionHistory />
        </TabsContent>

        <TabsContent value="vip">
          <VIPMilestoneHistory />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="text-center p-12 border-2 border-dashed rounded-lg">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Advanced Analytics Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              Detailed charts and insights about your commission trends
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
