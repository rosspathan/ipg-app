import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProgramModules } from "@/hooks/useProgramRegistry";
import { useProgramAnalytics } from "@/hooks/useProgramAnalytics";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Activity, 
  Users, 
  DollarSign, 
  CheckCircle,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { MobileStatCard } from "@/components/admin/mobile/MobileStatCard";
import { MobileProgramCard } from "@/components/admin/mobile/MobileProgramCard";
import { QuickEditAdMining } from "@/components/admin/program-control/QuickEditAdMining";
import { QuickEditLuckyDraw } from "@/components/admin/program-control/QuickEditLuckyDraw";
import { QuickEditSpinWheel } from "@/components/admin/program-control/QuickEditSpinWheel";
import { useProgramConfig } from "@/hooks/useProgramConfig";

function ProgramQuickEdit({ program }: { program: any }) {
  const programKeyMap: Record<string, string> = {
    'Ad Mining': 'ad_mining',
    'Lucky Draw': 'lucky_draw',
    'iSmart Spin': 'spin_wheel'
  };

  const moduleKey = programKeyMap[program.name] || program.key;
  const { data } = useProgramConfig(moduleKey);
  const config = data?.config;

  if (program.name === 'Ad Mining') {
    return <QuickEditAdMining moduleKey={moduleKey} currentConfig={config} />;
  }
  
  if (program.name === 'Lucky Draw') {
    return <QuickEditLuckyDraw moduleKey={moduleKey} currentConfig={config} />;
  }
  
  if (program.name === 'iSmart Spin') {
    return <QuickEditSpinWheel moduleKey={moduleKey} currentConfig={config} />;
  }

  return (
    <div className="text-xs text-muted-foreground text-center py-2">
      No quick settings available for this program
    </div>
  );
}

export default function AdminProgramControl() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { modules, updateModule, isLoading } = useProgramModules();
  const { analytics } = useProgramAnalytics();

  const livePrograms = modules?.filter(m => m.status === 'live') || [];
  const totalUsers = analytics?.reduce((sum, a) => sum + (a.activeUsers || 0), 0) || 0;
  const totalRevenue = analytics?.reduce((sum, a) => sum + (a.revenue || 0), 0) || 0;

  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const validateProgramConfig = (moduleKey: string, config: any) => {
    const errors: string[] = [];

    if (moduleKey === 'ad_mining') {
      if (!config?.reward_bsk || config.reward_bsk <= 0) {
        errors.push('Reward BSK must be greater than 0');
      }
      if (config?.required_view_time_seconds < 5) {
        errors.push('View time must be at least 5 seconds');
      }
    }

    if (moduleKey === 'lucky_draw') {
      if (!config?.ticket_price || config.ticket_price <= 0) {
        errors.push('Ticket price must be greater than 0');
      }
      if (!config?.first_prize || config.first_prize <= 0) {
        errors.push('First prize must be greater than 0');
      }
    }

    if (moduleKey === 'spin_wheel') {
      if (config?.min_bet >= config?.max_bet) {
        errors.push('Min bet must be less than max bet');
      }
      if (config?.free_spins_per_day < 0) {
        errors.push('Free spins cannot be negative');
      }
    }

    return { success: errors.length === 0, errors };
  };

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
    <div className="min-h-screen bg-background p-3 pb-20 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="font-bold text-foreground mb-1 text-lg md:text-2xl lg:text-3xl">
          Control Center
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Manage programs with quick settings
        </p>
      </div>

      {/* Overview Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
        <MobileStatCard
          title="Total Programs"
          value={modules?.length || 0}
          icon={Activity}
          variant="default"
        />
        <MobileStatCard
          title="Live Programs"
          value={livePrograms.length}
          icon={CheckCircle}
          variant="success"
        />
        <MobileStatCard
          title="Active Users"
          value={totalUsers.toLocaleString()}
          icon={Users}
          variant="default"
        />
        <MobileStatCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(0)}`}
          icon={DollarSign}
          variant="success"
        />
      </div>

      {/* Program Cards with Quick Edit */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base md:text-lg lg:text-xl">
            Programs
          </h2>
          {!isMobile && (
            <Button 
              onClick={() => navigate('/admin/programs')}
              size="sm"
              variant="outline"
              className="min-h-[44px]"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Program
            </Button>
          )}
        </div>

        {modules && modules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map((program) => {
              const programAnalytics = analytics?.find(a => a.moduleId === program.id);

              return (
                <MobileProgramCard
                  key={program.id}
                  program={program}
                  analytics={programAnalytics}
                  onStatusToggle={handleStatusToggle}
                >
                  <ProgramQuickEdit program={program} />
                </MobileProgramCard>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 md:p-12 text-center">
              <Activity className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                No programs found
              </p>
              <Button 
                onClick={() => navigate('/admin/programs')}
                size="default"
                className="min-h-[44px]"
              >
                Create First Program
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile FAB */}
      {isMobile && (
        <Button
          onClick={() => navigate('/admin/programs')}
          size="lg"
          className="fixed bottom-20 right-4 rounded-full min-w-[56px] min-h-[56px] w-14 h-14 shadow-lg z-[55]"
          aria-label="Create new program"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}
