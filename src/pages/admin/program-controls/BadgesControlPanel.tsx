import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBadgeManagement } from "@/hooks/useBadgeManagement";
import { Crown, Plus, Users, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BadgesControlPanel() {
  const { badges, userBadges, isLoading } = useBadgeManagement();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const totalHolders = userBadges.length;
  const activeBadges = badges.filter(b => b.is_active).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Badge System Control</h1>
        <p className="text-muted-foreground">Manage badge tiers and user assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tiers</p>
                <p className="text-2xl font-bold">{badges.length}</p>
              </div>
              <Crown className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Tiers</p>
                <p className="text-2xl font-bold">{activeBadges}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Badge Holders</p>
                <p className="text-2xl font-bold">{totalHolders}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="badges" className="space-y-4">
        <TabsList>
          <TabsTrigger value="badges">Badge Tiers</TabsTrigger>
          <TabsTrigger value="holders">Badge Holders</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
        </TabsList>

        {/* Badge Tiers Tab */}
        <TabsContent value="badges">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Badge Tiers</CardTitle>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {badges.map((badge) => (
                  <div key={badge.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-primary" />
                        <p className="font-semibold">{badge.tier_name}</p>
                        <Badge variant="outline">Level {badge.tier_level}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Price: {badge.purchase_price} BSK | Min Downline: {badge.minimum_downline_purchase} BSK
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Commission: L1 {badge.commission_l1_percent}% | L2 {badge.commission_l2_percent}% | L3 {badge.commission_l3_percent}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.is_active ? "default" : "secondary"}>
                        {badge.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button size="sm" variant="ghost">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Badge Holders Tab */}
        <TabsContent value="holders">
          <Card>
            <CardHeader>
              <CardTitle>Badge Holders ({totalHolders})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {userBadges.slice(0, 20).map((holding: any) => (
                  <div key={holding.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{holding.profile?.display_name || holding.profile?.username || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{holding.badge?.tier_name}</p>
                    </div>
                    <Badge>Level {holding.badge?.tier_level}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Qualifications Tab */}
        <TabsContent value="qualifications">
          <Card>
            <CardHeader>
              <CardTitle>Qualification Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Configure qualification thresholds for automatic badge upgrades.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}