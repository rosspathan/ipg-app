import { Card } from "@/components/ui/card";
import { ProgramModule } from "@/hooks/useProgramRegistry";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PreviewTabProps {
  module: ProgramModule;
}

export function PreviewTab({ module }: PreviewTabProps) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const getDeviceClass = () => {
    switch (device) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'max-w-full';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-success text-success-foreground';
      case 'draft':
        return 'bg-warning text-warning-foreground';
      case 'paused':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Device Selector */}
      <Card className="p-4">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setDevice('desktop')}
            className={cn(
              "p-3 rounded-lg transition-colors",
              device === 'desktop' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            <Monitor className="h-5 w-5" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={cn(
              "p-3 rounded-lg transition-colors",
              device === 'tablet' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            <Tablet className="h-5 w-5" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={cn(
              "p-3 rounded-lg transition-colors",
              device === 'mobile' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            <Smartphone className="h-5 w-5" />
          </button>
        </div>
      </Card>

      {/* Preview Container */}
      <div className="flex justify-center">
        <div className={cn("w-full transition-all duration-300", getDeviceClass())}>
          <Card className="p-6 bg-background">
            {/* Program Card Preview */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{module.icon}</div>
                  <div>
                    <h2 className="text-2xl font-bold">{module.name}</h2>
                    <p className="text-sm text-muted-foreground">{module.key}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(module.status)}>
                  {module.status}
                </Badge>
              </div>

              {module.featured && (
                <Badge variant="secondary" className="w-fit">
                  ⭐ Featured
                </Badge>
              )}

              {module.description && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground">{module.description}</p>
                </div>
              )}

              {module.tags && module.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {module.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-medium capitalize">{module.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Order</p>
                  <p className="text-sm font-medium">{module.order_index}</p>
                </div>
              </div>

              {module.enabled_regions && module.enabled_regions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Available Regions</p>
                  <div className="flex flex-wrap gap-2">
                    {module.enabled_regions.map((region, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {module.maintenance_mode && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-destructive">
                    ⚠️ Maintenance Mode Active
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This program is currently under maintenance and not accessible to users
                  </p>
                </div>
              )}

              <div className="pt-4">
                <button className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                  Access Program
                </button>
              </div>
            </div>
          </Card>

          {/* Preview Info */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Preview as seen by users on {device} devices</p>
          </div>
        </div>
      </div>
    </div>
  );
}
