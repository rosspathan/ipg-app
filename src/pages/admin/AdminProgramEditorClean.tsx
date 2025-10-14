import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye, Copy, Archive, Trash2 } from "lucide-react";
import { useProgramModules } from "@/hooks/useProgramRegistry";
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
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const module = modules?.find(m => m.id === id);
  const moduleAnalytics = analytics?.find(a => a.moduleId === id);

  const isNewModule = id === "new";

  const handleSave = async () => {
    if (!module) return;
    
    try {
      await updateModule({ id: module.id, updates: module });
      setUnsavedChanges(false);
      toast({ title: "Program saved successfully" });
    } catch (error) {
      toast({ title: "Failed to save program", variant: "destructive" });
    }
  };

  const handlePublish = async () => {
    if (!module) return;
    
    try {
      await updateModule({ 
        id: module.id, 
        updates: { ...module, status: 'live' } 
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
          <div className="w-8 h-8 border-4 border-[hsl(262_100%_65%)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[hsl(220_9%_65%)]">Loading program...</p>
        </div>
      </div>
    );
  }

  if (!module && !isNewModule) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-[hsl(220_9%_65%)]">Program not found</p>
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
    <div className="min-h-screen bg-[hsl(220_13%_4%)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[hsl(220_13%_7%)] border-b border-[hsl(220_13%_14%/0.4)]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/programs")}
              className="text-[hsl(220_9%_65%)] hover:text-[hsl(0_0%_98%)]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-[hsl(0_0%_98%)]">
                {module?.name || "New Program"}
              </h1>
              {unsavedChanges && (
                <p className="text-xs text-[hsl(38_92%_50%)]">Unsaved changes</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              className="border-[hsl(220_13%_14%)] text-[hsl(220_9%_65%)] hover:text-[hsl(0_0%_98%)]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={!unsavedChanges}
              className="border-[hsl(220_13%_14%)]"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={handlePublish}
              className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_70%)] text-white"
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
            module={module}
            onUpdate={(updates) => {
              if (module) {
                updateModule({ id: module.id, updates });
              }
            }}
          />
        </div>

        {/* Main Content - Tabs */}
        <div className="lg:col-span-6">
          <div className="bg-[hsl(220_13%_7%)] rounded-xl border border-[hsl(220_13%_14%/0.4)] p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 bg-[hsl(220_13%_10%)]">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="overview" className="space-y-6">
                  <OverviewTab 
                    module={module}
                    onChange={() => setUnsavedChanges(true)}
                  />
                </TabsContent>

                <TabsContent value="content" className="space-y-6">
                  <ContentTab 
                    module={module}
                    onChange={() => setUnsavedChanges(true)}
                  />
                </TabsContent>

                <TabsContent value="access" className="space-y-6">
                  <AccessTab 
                    moduleId={id}
                    onChange={() => setUnsavedChanges(true)}
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
          <div className="bg-[hsl(220_13%_7%)] rounded-xl border border-[hsl(220_13%_14%/0.4)] p-6">
            <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-[hsl(220_13%_14%)]"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Program
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-[hsl(220_13%_14%)]"
                onClick={handleDuplicate}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-[hsl(220_13%_14%)]"
                onClick={handleArchive}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-red-500/20 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          <div className="bg-[hsl(220_13%_7%)] rounded-xl border border-[hsl(220_13%_14%/0.4)] p-6">
            <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
              Schedule
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[hsl(220_9%_65%)]">Start Date</p>
                <p className="text-[hsl(0_0%_98%)]">
                  Immediately
                </p>
              </div>
              <div>
                <p className="text-[hsl(220_9%_65%)]">End Date</p>
                <p className="text-[hsl(0_0%_98%)]">
                  No end date
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[hsl(220_13%_7%)] rounded-xl border border-[hsl(220_13%_14%/0.4)] p-6">
            <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
              Access Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[hsl(220_9%_65%)]">Regions</p>
                <p className="text-[hsl(0_0%_98%)]">
                  All regions
                </p>
              </div>
              <div>
                <p className="text-[hsl(220_9%_65%)]">User Roles</p>
                <p className="text-[hsl(0_0%_98%)]">
                  All roles
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && module && (
        <ProgramPreviewModal
          module={module}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
