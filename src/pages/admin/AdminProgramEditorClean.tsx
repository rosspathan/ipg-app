import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye, Copy, Archive, Trash2, Check, Loader2 } from "lucide-react";
import { useProgramModules, ProgramModule } from "@/hooks/useProgramRegistry";
import { useProgramAnalytics } from "@/hooks/useProgramAnalytics";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgramStatsCard } from "@/components/admin/program-editor-clean/ProgramStatsCard";
import { QuickConfigPanel } from "@/components/admin/program-editor-clean/QuickConfigPanel";
import { OverviewTab } from "@/components/admin/program-editor-clean/OverviewTab";
import { ContentTab } from "@/components/admin/program-editor-clean/ContentTab";
import { AccessTab } from "@/components/admin/program-editor-clean/AccessTab";
import { HistoryTab } from "@/components/admin/program-editor-clean/HistoryTab";
import { ProgramPreviewModal } from "@/components/admin/program-editor-clean/ProgramPreviewModal";

export default function AdminProgramEditorClean() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { modules, updateModule, isLoading } = useProgramModules();
  const { analytics } = useProgramAnalytics();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [showPreview, setShowPreview] = useState(false);
  const [localModule, setLocalModule] = useState<ProgramModule | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const module = modules?.find(m => m.id === id);
  const moduleAnalytics = analytics?.find(a => a.moduleId === id);
  const isNewModule = id === "new";

  useEffect(() => {
    if (module) {
      setLocalModule(module);
    }
  }, [module]);

  const handleSave = (updates: Partial<ProgramModule>) => {
    if (!localModule) return;
    setLocalModule({ ...localModule, ...updates });
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  // Auto-save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges || !id || !localModule) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await updateModule({ id, updates: localModule });
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        toast({
          title: "Save failed",
          description: "Please try again",
          variant: "destructive"
        });
        setSaveStatus('idle');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [localModule, hasUnsavedChanges, id, updateModule, toast]);

  const handlePublish = async () => {
    if (!localModule || !id) return;
    
    try {
      await updateModule({ 
        id, 
        updates: { ...localModule, status: 'live' } 
      });
      toast({ title: "Program published successfully" });
    } catch (error) {
      toast({ title: "Failed to publish program", variant: "destructive" });
    }
  };

  const handleDuplicate = () => {
    toast({ title: "Duplicate feature coming soon" });
  };

  const handleArchive = () => {
    toast({ title: "Archive feature coming soon" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading program...</p>
        </div>
      </div>
    );
  }

  if (!localModule && !isNewModule) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Program not found</p>
          <Button 
            onClick={() => navigate("/admin/programs")}
            className="mt-4"
          >
            Back to Programs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/programs")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">
                {localModule?.name || "New Program"}
              </h1>
              {saveStatus === 'saving' && (
                <p className="text-xs text-muted-foreground">Saving...</p>
              )}
              {saveStatus === 'saved' && (
                <p className="text-xs text-green-500">All changes saved</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saveStatus === 'saved' && <Check className="h-4 w-4 mr-2" />}
              {saveStatus === 'idle' && <Save className="h-4 w-4 mr-2" />}
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Auto-Save'}
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
            >
              Publish
            </Button>
          </div>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-[1800px] mx-auto">
        {/* Left Sidebar - Stats & Quick Config */}
        <div className="lg:col-span-3 space-y-6">
          <ProgramStatsCard 
            moduleId={id}
            analytics={moduleAnalytics}
          />
          
          <QuickConfigPanel 
            module={localModule}
            onUpdate={handleSave}
          />
        </div>

        {/* Main Content - Tabs */}
        <div className="lg:col-span-6">
          <div className="bg-card rounded-xl border p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="overview" className="space-y-6">
                  <OverviewTab 
                    module={localModule}
                    onChange={handleSave}
                  />
                </TabsContent>

                <TabsContent value="content" className="space-y-6">
                  <ContentTab 
                    module={localModule}
                    onChange={handleSave}
                  />
                </TabsContent>

                <TabsContent value="access" className="space-y-6">
                  <AccessTab 
                    moduleId={id}
                    onChange={() => setHasUnsavedChanges(true)}
                  />
                </TabsContent>

                <TabsContent value="history" className="space-y-6">
                  <HistoryTab moduleId={id} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Actions & Context */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card rounded-xl border p-6">
            <h3 className="text-sm font-semibold mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Program
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleDuplicate}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleArchive}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-destructive/20 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-xl border p-6">
            <h3 className="text-sm font-semibold mb-4">
              Schedule
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p>Immediately</p>
              </div>
              <div>
                <p className="text-muted-foreground">End Date</p>
                <p>No end date</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border p-6">
            <h3 className="text-sm font-semibold mb-4">
              Access Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Regions</p>
                <p>{(localModule?.enabled_regions?.length || 0)} regions</p>
              </div>
              <div>
                <p className="text-muted-foreground">User Roles</p>
                <p>{(localModule?.enabled_roles?.length || 0)} roles</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && localModule && (
        <ProgramPreviewModal
          module={localModule}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
