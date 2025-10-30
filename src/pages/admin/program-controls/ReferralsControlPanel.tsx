import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReferralManagement } from "@/hooks/useReferralManagement";
import { Users, DollarSign, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ReferralsControlPanel() {
  const { commissionRates, referralStats, isLoading } = useReferralManagement();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Referral System Control</h1>
        <p className="text-muted-foreground">Manage commission rates and referral analytics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Commissions</p>
                <p className="text-2xl font-bold">{referralStats?.totalCommissions?.toFixed(2) || 0} BSK</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Referrers</p>
                <p className="text-2xl font-bold">{referralStats?.uniqueReferrers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commission Levels</p>
                <p className="text-2xl font-bold">{commissionRates.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rates">Commission Rates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tree">Referral Tree</TabsTrigger>
        </TabsList>

        {/* Commission Rates Tab */}
        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle>Commission Rates by Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissionRates.map((rate) => (
                  <div key={rate.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold">Level {rate.level}</p>
                      <p className="text-xs text-muted-foreground">{rate.description || `${rate.level} level deep referral`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        defaultValue={rate.commission_percent}
                        className="w-24"
                        step="0.1"
                      />
                      <span className="text-sm">%</span>
                      <Button size="sm">Update</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Referral Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Commission distribution and top referrers analytics coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referral Tree Tab */}
        <TabsContent value="tree">
          <Card>
            <CardHeader>
              <CardTitle>Referral Network Tree</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Visual referral tree explorer coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}