import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  Eye, 
  AlertCircle,
  Play,
  Pause,
  DollarSign,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileProgramCardProps {
  program: any;
  analytics?: any;
  onStatusToggle: (id: string, status: string) => void;
  onQuickEdit?: (id: string) => void;
  children?: React.ReactNode; // Quick edit panel
}

export function MobileProgramCard({ 
  program, 
  analytics,
  onStatusToggle,
  onQuickEdit,
  children
}: MobileProgramCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const isLive = program.status === 'live';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:border-border/60">
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1 truncate">{program.name}</h3>
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
            className="shrink-0"
          >
            {program.status}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-lg border border-border/50">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Users</p>
              <p className="text-sm font-bold truncate">
                {analytics?.activeUsers?.toLocaleString() || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-lg border border-border/50">
            <div className="rounded-lg bg-success/10 p-1.5">
              <DollarSign className="w-3.5 h-3.5 text-success" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Revenue</p>
              <p className="text-sm font-bold text-success truncate">
                ${(analytics?.revenue || 0).toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Controls */}
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
          <div className="flex items-center gap-2">
            <div className={cn(
              "rounded-lg p-1.5",
              isLive ? "bg-success/10" : "bg-warning/10"
            )}>
              {isLive ? (
                <Play className="w-3.5 h-3.5 text-success" />
              ) : (
                <Pause className="w-3.5 h-3.5 text-warning" />
              )}
            </div>
            <span className="text-sm font-semibold">
              {isLive ? 'Active' : 'Paused'}
            </span>
          </div>
          <Switch
            checked={isLive}
            onCheckedChange={() => onStatusToggle(program.id, program.status)}
            aria-label={`Toggle ${program.name} status`}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => setExpanded(!expanded)}
            size="sm"
            variant="outline"
            className="flex-1 min-h-[44px]"
            aria-label="Toggle quick edit panel"
            aria-expanded={expanded}
          >
            <Settings className="w-4 h-4 mr-1.5" />
            Quick Edit
            {expanded ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </Button>
          <Button
            onClick={() => {
              const controlPath = program.name === 'Ad Mining' 
                ? '/admin/programs/control/ad-mining'
                : program.name === 'Lucky Draw'
                ? '/admin/programs/control/lucky-draw'
                : program.name === 'iSmart Spin'
                ? '/admin/programs/control/spin-wheel'
                : `/admin/programs/editor/${program.id}`;
              navigate(controlPath);
            }}
            size="sm"
            variant="outline"
            className="min-w-[44px] min-h-[44px]"
            aria-label="Open program control panel"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => navigate(program.route)}
            size="sm"
            variant="ghost"
            className="min-w-[44px] min-h-[44px]"
            aria-label="Preview program"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        {/* Alerts */}
        {program.maintenance_mode && (
          <div className="flex items-center gap-2 p-2.5 bg-warning/10 border border-warning/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-warning shrink-0" />
            <span className="text-sm font-medium text-warning">Maintenance mode</span>
          </div>
        )}
      </div>

      {/* Expandable Quick Edit Panel */}
      {expanded && children && (
        <div className="border-t border-border bg-muted/10 p-4 animate-accordion-down">
          {children}
        </div>
      )}
    </div>
  );
}
