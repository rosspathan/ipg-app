import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CircleDot, TrendingUp, Users, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuickEditSpinWheel } from "@/components/admin/program-control/QuickEditSpinWheel";
import { SpinSegmentEditor } from "@/components/admin/spin-wheel/SpinSegmentEditor";
import { SpinAnalytics } from "@/components/admin/spin-wheel/SpinAnalytics";
import { FraudDetection } from "@/components/admin/spin-wheel/FraudDetection";

export default function SpinWheelControlPanel() {
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
            Spin Wheel Control
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Manage segments, bets, and payouts
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Spins Today</p>
                <p className="text-2xl font-bold">2,345</p>
              </div>
              <CircleDot className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-success mt-2">+18% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">567</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-success mt-2">Peak: 2pm-4pm</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Wagered</p>
                <p className="text-2xl font-bold">45.2K</p>
              </div>
              <DollarSign className="w-8 h-8 text-warning" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">BSK today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">House Edge</p>
                <p className="text-2xl font-bold">5.2%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
            <p className="text-xs text-success mt-2">Healthy margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className={isMobile ? "w-full grid grid-cols-2" : ""}>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="fraud">Fraud</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Betting & Spin Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickEditSpinWheel moduleKey="spin_wheel" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <SpinSegmentEditor />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SpinAnalytics />
        </TabsContent>

        <TabsContent value="fraud" className="space-y-4">
          <FraudDetection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
