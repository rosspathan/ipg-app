import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, Users, DollarSign, Activity } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuickEditAdMining } from "@/components/admin/program-control/QuickEditAdMining";
import { AdInventoryManager } from "@/components/admin/ad-mining/AdInventoryManager";
import { ProgramAnalyticsDashboard } from "@/components/admin/analytics/ProgramAnalyticsDashboard";

export default function AdMiningControlPanel() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={() => navigate('/admin/programs/control')}
          variant="ghost"
          size={isMobile ? "sm" : "default"}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            Ad Mining Control
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Manage ads, rewards, and analytics
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ads Today</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-success mt-2">+12% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">856</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-success mt-2">+8% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">BSK Paid</p>
                <p className="text-2xl font-bold">12,340</p>
              </div>
              <DollarSign className="w-8 h-8 text-success" />
            </div>
            <p className="text-xs text-warning mt-2">Within budget</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Watch</p>
                <p className="text-2xl font-bold">28s</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-success mt-2">93% completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className={isMobile ? "w-full grid grid-cols-3" : ""}>
          <TabsTrigger value="settings">Quick Settings</TabsTrigger>
          <TabsTrigger value="inventory">Ad Inventory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reward Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickEditAdMining moduleKey="ad_mining" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <AdInventoryManager />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <ProgramAnalyticsDashboard programType="ad_mining" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
