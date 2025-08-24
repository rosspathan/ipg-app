import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import AdminDashboard from "./AdminDashboard";
import AdminUsers from "./AdminUsers";
import AdminAssets from "./AdminAssets";
import AdminMarkets from "./AdminMarkets";
import AdminFunding from "./AdminFunding";
import AdminInsuranceClaims from "./AdminInsuranceClaims";
import { AdminSubscriptions } from "@/components/AdminSubscriptions";
import { AdminReferrals } from "@/components/AdminReferrals";
import { 
  LayoutDashboard, 
  Users, 
  Coins, 
  TrendingUp, 
  DollarSign, 
  UserPlus, 
  Gift, 
  Layers, 
  Ticket, 
  Shield, 
  Megaphone, 
  Settings,
  FileText,
  AlertTriangle,
  PieChart
} from "lucide-react";

const AdminPanel = () => {
  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="border-b">
          <TabsList className="grid w-full grid-cols-8 lg:grid-cols-16">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="markets" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Markets</span>
            </TabsTrigger>
            <TabsTrigger value="funding" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Funding</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Subs</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Referrals</span>
            </TabsTrigger>
            <TabsTrigger value="staking" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Staking</span>
            </TabsTrigger>
            <TabsTrigger value="lucky-draw" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              <span className="hidden sm:inline">Lucky</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Insurance</span>
            </TabsTrigger>
            <TabsTrigger value="ads" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Ads</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Fees</span>
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Transfers</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Compliance</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="assets">
          <AdminAssets />
        </TabsContent>

        <TabsContent value="markets">
          <AdminMarkets />
        </TabsContent>

        <TabsContent value="funding">
          <AdminFunding />
        </TabsContent>

        <TabsContent value="subscriptions" className="m-6">
          <AdminSubscriptions />
        </TabsContent>

        <TabsContent value="referrals" className="m-6">
          <AdminReferrals />
        </TabsContent>

        <TabsContent value="staking">
          <Card className="m-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Staking Pools Management</h2>
              <p className="text-muted-foreground">Create and manage staking pools with APY and lock periods.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lucky-draw">
          <Card className="m-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Lucky Draw Configuration</h2>
              <p className="text-muted-foreground">Configure lottery draws, prizes, and schedules.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance">
          <AdminInsuranceClaims />
        </TabsContent>

        <TabsContent value="ads">
          <Card className="m-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Ads & CMS</h2>
              <p className="text-muted-foreground">Manage banners, carousels, and promotional content.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card className="m-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Fees & Revenue</h2>
              <p className="text-muted-foreground">Configure platform fee structures and revenue settings.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card className="m-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Internal Transfers Control</h2>
              <p className="text-muted-foreground">Configure user-to-user transfer settings and limits.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card className="m-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Compliance & Risk</h2>
              <p className="text-muted-foreground">Manage AML rules, risk scoring, and compliance cases.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="m-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Reports & Finance</h2>
              <p className="text-muted-foreground">Generate revenue reports and financial statements.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="m-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">System & Roles</h2>
              <p className="text-muted-foreground">Manage roles, permissions, and system configurations.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;