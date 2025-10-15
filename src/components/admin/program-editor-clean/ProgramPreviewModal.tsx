import { X, CheckCircle2, AlertCircle, Calendar, Users, Settings } from "lucide-react";
import { ProgramModule } from "@/hooks/useProgramRegistry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ProgramPreviewModalProps {
  module: ProgramModule;
  onClose: () => void;
}

export function ProgramPreviewModal({ module, onClose }: ProgramPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border w-full max-w-5xl max-h-[90vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {module.icon && (
              <img src={module.icon} alt="" className="w-10 h-10 rounded-lg" />
            )}
            <div>
              <h2 className="text-xl font-semibold">Program Preview</h2>
              <p className="text-sm text-muted-foreground">How users will see this program</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            {module.icon && (
              <img src={module.icon} alt={module.name} className="w-20 h-20 rounded-2xl mx-auto shadow-lg" />
            )}
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <h3 className="text-3xl font-bold">{module.name}</h3>
                <Badge variant={module.status === 'live' ? 'default' : 'secondary'}>
                  {module.status}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {module.description}
              </p>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                {module.featured ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <p className="font-medium">Featured</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {module.featured ? 'Yes' : 'No'}
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <p className="font-medium">Access</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {module.enabled_regions?.length || 0} regions, {module.enabled_roles?.length || 0} roles
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <p className="font-medium">Updated</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {module.updated_at ? format(new Date(module.updated_at), "MMM d, yyyy") : 'N/A'}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configuration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Configuration</h4>
              </div>
              <div className="space-y-2 pl-7">
                <div>
                  <p className="text-sm text-muted-foreground">Module Key</p>
                  <p className="font-mono text-sm">{module.key}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maintenance Mode</p>
                  <Badge variant={module.maintenance_mode ? 'destructive' : 'outline'}>
                    {module.maintenance_mode ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Access Control</h4>
              </div>
              <div className="space-y-2 pl-7">
                <div>
                  <p className="text-sm text-muted-foreground">Enabled Regions</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {module.enabled_regions?.map(region => (
                      <Badge key={region} variant="secondary" className="text-xs">
                        {region}
                      </Badge>
                    )) || <span className="text-sm text-muted-foreground">None</span>}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Allowed Roles</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {module.enabled_roles?.map(role => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    )) || <span className="text-sm text-muted-foreground">None</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {module.description && (
            <div className="p-6 rounded-lg border bg-muted/30">
              <h4 className="font-semibold mb-3">About this Program</h4>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {module.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex justify-end">
          <Button onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  );
}
