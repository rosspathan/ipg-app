import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Ticket, Trophy, Users, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuickEditLuckyDraw } from "@/components/admin/program-control/QuickEditLuckyDraw";
import { DrawScheduler } from "@/components/admin/lucky-draw/DrawScheduler";
import { ProgramAnalyticsDashboard } from "@/components/admin/analytics/ProgramAnalyticsDashboard";

export default function LuckyDrawControlPanel() {
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
            Lucky Draw Control
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Manage draws, prizes, and schedules
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Draws</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <Trophy className="w-8 h-8 text-warning" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">2 upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tickets Sold</p>
                <p className="text-2xl font-bold">1,456</p>
              </div>
              <Ticket className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-success mt-2">+45% this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Participants</p>
                <p className="text-2xl font-bold">892</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-success mt-2">Active buyers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Prize Pool</p>
                <p className="text-2xl font-bold">145K</p>
              </div>
              <DollarSign className="w-8 h-8 text-success" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">BSK value</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className={isMobile ? "w-full grid grid-cols-3" : ""}>
          <TabsTrigger value="settings">Quick Settings</TabsTrigger>
          <TabsTrigger value="scheduler">Draw Schedule</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prize & Ticket Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickEditLuckyDraw moduleKey="lucky_draw" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-4">
          <DrawScheduler />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <ProgramAnalyticsDashboard programType="lucky_draw" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
