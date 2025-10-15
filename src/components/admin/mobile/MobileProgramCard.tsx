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
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1 truncate">{program.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {program.description || 'No description'}
            </p>
          </div>
          <Badge 
            variant={
              program.status === 'live' ? 'default' :
              program.status === 'paused' ? 'secondary' :
              'outline'
            }
            className="ml-2 shrink-0"
          >
            {program.status}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Users</p>
              <p className="text-sm font-semibold">
                {analytics?.activeUsers?.toLocaleString() || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
            <DollarSign className="w-3.5 h-3.5 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-sm font-semibold text-success">
                ${(analytics?.revenue || 0).toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Controls */}
        <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
          <div className="flex items-center gap-2">
            {isLive ? (
              <Play className="w-3.5 h-3.5 text-success" />
            ) : (
              <Pause className="w-3.5 h-3.5 text-warning" />
            )}
            <span className="text-sm font-medium">
              {isLive ? 'Active' : 'Paused'}
            </span>
          </div>
          <Switch
            checked={isLive}
            onCheckedChange={() => onStatusToggle(program.id, program.status)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => setExpanded(!expanded)}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Quick Edit
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
            )}
          </Button>
          <Button
            onClick={() => navigate(`/admin/programs/editor/${program.id}`)}
            size="sm"
            variant="outline"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={() => navigate(program.route)}
            size="sm"
            variant="ghost"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Alerts */}
        {program.maintenance_mode && (
          <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded">
            <AlertCircle className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs text-warning">Maintenance mode</span>
          </div>
        )}
      </div>

      {/* Expandable Quick Edit Panel */}
      {expanded && children && (
        <div className="border-t border-border bg-muted/20 p-3">
          {children}
        </div>
      )}
    </div>
  );
}
