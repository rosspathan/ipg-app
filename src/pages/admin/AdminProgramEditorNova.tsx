import * as React from "react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProgramModules, useProgramConfigs, useProgramAudit } from "@/hooks/useProgramRegistry";
import { SchemaForm } from "@/components/admin/nova/SchemaForm";
import { AuditTrailViewer } from "@/components/admin/nova/AuditTrailViewer";
import { VisualTab } from "@/components/admin/program-editor/VisualTab";
import { ContentTab } from "@/components/admin/program-editor/ContentTab";
import { RulesTab } from "@/components/admin/program-editor/RulesTab";
import { PreviewTab } from "@/components/admin/program-editor/PreviewTab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Save, Eye, History, Flag, Calendar, 
  Play, Pause, Settings, Rocket, Image, FileText, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminProgramEditorNova() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { modules, updateModule } = useProgramModules();
  const { configs, createConfig, updateConfig, publishConfig } = useProgramConfigs(moduleId);
  const { auditLogs } = useProgramAudit(moduleId);
  
  const [activeTab, setActiveTab] = useState("settings");
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const module = modules?.find(m => m.id === moduleId);
  const currentConfig = configs?.find(c => c.is_current);
  const draftConfig = configs?.find(c => c.status === 'draft');

  React.useEffect(() => {
    if (currentConfig) {
      setFormData(currentConfig.config_json);
    }
  }, [currentConfig]);

  if (!module) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Module not found</p>
          <Button
            size="sm"
            onClick={() => navigate('/admin/programs')}
            className="mt-4"
          >
            Back to Programs
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (draftConfig) {
      updateConfig({
        id: draftConfig.id,
        updates: { config_json: formData }
      });
    } else if (currentConfig) {
      // Create new draft version
      createConfig({
        module_id: moduleId,
        version: (currentConfig.version || 0) + 1,
        config_json: formData,
        schema_json: currentConfig.schema_json,
        status: 'draft'
      });
    }
  };

  const handlePublish = () => {
    const configToPublish = draftConfig || currentConfig;
    if (configToPublish) {
      publishConfig(configToPublish.id);
    }
  };

  const handleModuleUpdate = (updates: any) => {
    if (moduleId) {
      updateModule({ id: moduleId, updates });
      toast({ title: "Module updated successfully" });
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

  return (
    <div data-testid="program-editor" className="pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-[hsl(245_35%_7%)] to-[hsl(234_38%_13%)] border-b border-[hsl(225_24%_22%/0.16)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate('/admin/programs')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-heading font-bold text-foreground truncate">
                {module.name}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {module.key} • v{currentConfig?.version || 1}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(getStatusColor(module.status))}>
              {module.status}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              className="gap-2 bg-transparent border-[hsl(225_24%_22%/0.16)]"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Rocket className="w-4 h-4" />
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 mt-4">
        <TabsList className="grid w-full grid-cols-8 bg-[hsl(229_30%_16%/0.5)]">
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="visual" className="gap-2">
            <Image className="w-4 h-4" />
            <span className="hidden sm:inline">Visual</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Content</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Rules</span>
          </TabsTrigger>
          <TabsTrigger value="flags" className="gap-2" data-testid="program-flags">
            <Flag className="w-4 h-4" />
            <span className="hidden sm:inline">Flags</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2" data-testid="program-schedule">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2" data-testid="program-preview">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2" data-testid="program-history">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          {currentConfig && (
            <SchemaForm
              schema={currentConfig.schema_json}
              value={formData}
              onChange={setFormData}
            />
          )}
        </TabsContent>

        <TabsContent value="visual" className="mt-4">
          {moduleId && <VisualTab moduleId={moduleId} />}
        </TabsContent>

        <TabsContent value="content" className="mt-4">
          {module && <ContentTab module={module} onUpdate={handleModuleUpdate} />}
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          {moduleId && <RulesTab moduleId={moduleId} />}
        </TabsContent>

        <TabsContent value="flags" className="mt-4">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-[hsl(225_24%_22%/0.16)] bg-[hsl(229_30%_16%/0.5)]">
              <h3 className="text-sm font-medium text-foreground mb-3">Enabled Regions</h3>
              <div className="flex flex-wrap gap-2">
                {module.enabled_regions.map((region: string) => (
                  <Badge 
                    key={region}
                    variant="outline"
                    className="bg-accent/10 text-accent border-accent/20"
                  >
                    {region}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[hsl(225_24%_22%/0.16)] bg-[hsl(229_30%_16%/0.5)]">
              <h3 className="text-sm font-medium text-foreground mb-3">Enabled Roles</h3>
              <div className="flex flex-wrap gap-2">
                {module.enabled_roles.map((role: string) => (
                  <Badge 
                    key={role}
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[hsl(225_24%_22%/0.16)] bg-[hsl(229_30%_16%/0.5)]">
              <h3 className="text-sm font-medium text-foreground mb-2">Kill Switch</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Instantly pause this module for all users
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 bg-transparent border-warning/20 text-warning"
              >
                <Pause className="w-4 h-4" />
                Pause Module
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <div className="p-4 rounded-2xl border border-[hsl(225_24%_22%/0.16)] bg-[hsl(229_30%_16%/0.5)]">
            <h3 className="text-sm font-medium text-foreground mb-2">Scheduling</h3>
            <p className="text-xs text-muted-foreground">
              Schedule when configuration changes go live
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Effective From</label>
                <input 
                  type="datetime-local"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[hsl(229_30%_16%/0.5)] border border-[hsl(225_24%_22%/0.16)] text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Effective To (Optional)</label>
                <input 
                  type="datetime-local"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[hsl(229_30%_16%/0.5)] border border-[hsl(225_24%_22%/0.16)] text-sm"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          {module && <PreviewTab module={module} />}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Version History</h3>
            {configs && configs.length > 0 ? (
              <div className="space-y-2">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className="p-3 rounded-xl border border-[hsl(225_24%_22%/0.16)] bg-[hsl(229_30%_16%/0.5)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          v{config.version}
                        </Badge>
                        {config.is_current && (
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                            Current
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn("text-xs", getStatusColor(config.status))}>
                          {config.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(config.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    {config.notes && (
                      <p className="text-xs text-muted-foreground">{config.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No version history</p>
            )}
            
            {auditLogs && auditLogs.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-foreground mb-3">Audit Trail</h3>
                <AuditTrailViewer 
                  entries={auditLogs.map(log => ({
                    id: log.id,
                    timestamp: new Date(log.created_at).toLocaleString(),
                    operator: log.operator_id,
                    action: log.action,
                    changes: log.diff_json ? [log.diff_json] : []
                  }))}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
