import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProgramModules } from "@/hooks/useProgramRegistry";
import { useProgramAnalytics } from "@/hooks/useProgramAnalytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Activity, 
  Users, 
  DollarSign, 
  TrendingUp,
  Settings,
  Eye,
  AlertCircle,
  CheckCircle,
  Pause,
  Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminProgramControl() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { modules, updateModule, isLoading } = useProgramModules();
  const { analytics } = useProgramAnalytics();

  const livePrograms = modules?.filter(m => m.status === 'live') || [];
  const totalUsers = analytics?.reduce((sum, a) => sum + (a.activeUsers || 0), 0) || 0;
  const totalRevenue = analytics?.reduce((sum, a) => sum + (a.revenue || 0), 0) || 0;

  const handleStatusToggle = async (moduleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'live' ? 'paused' : 'live';
    
    try {
      await updateModule({ 
        id: moduleId, 
        updates: { status: newStatus as any }
      });
      
      queryClient.invalidateQueries({ queryKey: ['program-modules'] });
      
      toast({
        title: newStatus === 'live' ? "Program activated" : "Program paused",
        description: `Successfully ${newStatus === 'live' ? 'activated' : 'paused'} the program`
      });
    } catch (error) {
      toast({
        title: "Failed to update program",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading control center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Program Control Center</h1>
        <p className="text-muted-foreground">
          Manage all programs, view metrics, and control access
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Programs</p>
                <p className="text-2xl font-bold">{modules?.length || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Live Programs</p>
                <p className="text-2xl font-bold text-success">{livePrograms.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Users</p>
                <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Program Control Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Program Controls</h2>
          <Button onClick={() => navigate('/admin/programs')}>
            View All Programs
          </Button>
        </div>

        {modules && modules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((program) => {
              const programAnalytics = analytics?.find(a => a.moduleId === program.id);
              const isLive = program.status === 'live';

              return (
                <Card key={program.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{program.name}</CardTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {program.description || 'No description'}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          program.status === 'live' ? 'default' :
                          program.status === 'paused' ? 'secondary' :
                          'outline'
                        }
                        className="ml-2"
                      >
                        {program.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Users</p>
                        <p className="text-lg font-bold">
                          {programAnalytics?.activeUsers?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                        <p className="text-lg font-bold text-success">
                          ${(programAnalytics?.revenue || 0).toFixed(0)}
                        </p>
                      </div>
                    </div>

                    {/* Quick Controls */}
                    <div className="space-y-3">
                      {/* Live Toggle */}
                      <div className="flex items-center justify-between p-2 hover:bg-muted/30 rounded transition-colors">
                        <div className="flex items-center gap-2">
                          {isLive ? (
                            <Play className="w-4 h-4 text-success" />
                          ) : (
                            <Pause className="w-4 h-4 text-warning" />
                          )}
                          <span className="text-sm font-medium">
                            {isLive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <Switch
                          checked={isLive}
                          onCheckedChange={() => handleStatusToggle(program.id, program.status)}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigate(`/admin/programs/editor/${program.id}`)}
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                        <Button
                          onClick={() => navigate(program.route)}
                          size="sm"
                          variant="ghost"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Alerts */}
                    {program.maintenance_mode && (
                      <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded text-xs text-warning">
                        <AlertCircle className="w-4 h-4" />
                        <span>Maintenance mode active</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No programs found</p>
              <Button onClick={() => navigate('/admin/programs')}>
                Create First Program
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* System Alerts */}
      {livePrograms.some(p => p.maintenance_mode) && (
        <Card className="mt-6 border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="w-5 h-5" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {livePrograms.filter(p => p.maintenance_mode).length} program(s) in maintenance mode
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
