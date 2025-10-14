import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProgramModules } from "@/hooks/useProgramRegistry";
import { useAuthAdmin } from "@/hooks/useAuthAdmin";
import { Loader2 } from "lucide-react";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Settings, Play, Pause, Archive, Package, Zap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export default function AdminProgramsNova() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuthAdmin();
  const { modules, isLoading } = useProgramModules();
  const [showNewModule, setShowNewModule] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/onboarding", { replace: true });
    } else if (!authLoading && user && !isAdmin) {
      navigate("/app", { replace: true });
    }
  }, [authLoading, user, isAdmin, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const liveModules = modules?.filter(m => m.status === 'live') || [];
  const draftModules = modules?.filter(m => m.status === 'draft') || [];
  const pausedModules = modules?.filter(m => m.status === 'paused') || [];

  const categories = {
    earnings: modules?.filter(m => m.category === 'earnings') || [],
    games: modules?.filter(m => m.category === 'games') || [],
    trading: modules?.filter(m => m.category === 'trading') || [],
    finance: modules?.filter(m => m.category === 'finance') || [],
    rewards: modules?.filter(m => m.category === 'rewards') || [],
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <Play className="w-3 h-3" />;
      case 'paused': return <Pause className="w-3 h-3" />;
      case 'draft': return <Settings className="w-3 h-3" />;
      default: return <Archive className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-success/10 text-success border-success/20';
      case 'paused': return 'bg-warning/10 text-warning border-warning/20';
      case 'draft': return 'bg-muted/10 text-muted-foreground border-muted/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const renderModuleCard = (module: any) => {
    const IconComponent = (Icons as any)[module.icon] || Package;
    
    return (
      <div
        key={module.id}
        onClick={() => navigate(`/admin/programs/${module.id}`)}
        className={cn(
          "min-w-[280px] p-4 rounded-2xl border cursor-pointer",
          "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
          "border-[hsl(225_24%_22%/0.16)]",
          "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
          "transition-all duration-220"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            "bg-primary/10 text-primary"
          )}>
            <IconComponent className="w-5 h-5" />
          </div>
          <Badge 
            variant="outline" 
            className={cn("gap-1", getStatusColor(module.status))}
          >
            {getStatusIcon(module.status)}
            {module.status}
          </Badge>
        </div>

        <h3 className="font-heading font-semibold text-foreground mb-1">
          {module.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {module.key} • Order: {module.order_index}
        </p>

        <div className="flex flex-wrap gap-1">
          {module.enabled_regions.slice(0, 3).map((region: string) => (
            <Badge 
              key={region}
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-accent/10 text-accent border-accent/20"
            >
              {region}
            </Badge>
          ))}
          {module.enabled_regions.length > 3 && (
            <Badge 
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-muted/10 text-muted-foreground border-muted/20"
            >
              +{module.enabled_regions.length - 3}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div data-testid="programs-catalog" className="space-y-4 pb-6">
      {/* KPI Lane */}
      <CardLane title="Program Metrics">
        <KPIStat
          label="Live Programs"
          value={String(liveModules.length)}
          icon={<Zap className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Total Programs"
          value={String(modules?.length || 0)}
          icon={<Package className="w-4 h-4" />}
        />
        <KPIStat
          label="Draft"
          value={String(draftModules.length)}
          icon={<Settings className="w-4 h-4" />}
        />
        <KPIStat
          label="Paused"
          value={String(pausedModules.length)}
          icon={<Pause className="w-4 h-4" />}
          variant={pausedModules.length > 0 ? "warning" : undefined}
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-foreground">
            Program Catalog
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/programs/analytics')}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Button>
            <Button
              size="sm"
              onClick={() => setShowNewModule(true)}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              New Program
            </Button>
          </div>
        </div>

        {/* By Category */}
        {Object.entries(categories).map(([category, mods]) => 
          mods.length > 0 && (
            <div key={category} className="space-y-3">
              <h2 className="text-sm font-medium text-foreground capitalize">
                {category} Programs
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
                {mods.map(renderModuleCard)}
              </div>
            </div>
          )
        )}

        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading programs...
          </div>
        )}

        {!isLoading && modules?.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No programs yet</p>
            <Button
              size="sm"
              onClick={() => setShowNewModule(true)}
              className="mt-4 gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Program
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
