import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProgramModules } from "@/hooks/useProgramRegistry";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutGrid, Plus, Copy, Archive, Eye, EyeOff, 
  Play, Pause, Trash2, Download, Upload, Filter,
  ArrowLeft
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProgramControlCenter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { modules, isLoading } = useProgramModules();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneModuleId, setCloneModuleId] = useState<string>("");
  const [cloneName, setCloneName] = useState("");
  const [cloneKey, setCloneKey] = useState("");

  const filteredModules = modules?.filter(module => {
    const matchesStatus = filterStatus === "all" || module.status === filterStatus;
    const matchesCategory = filterCategory === "all" || module.category === filterCategory;
    const matchesSearch = searchQuery === "" || 
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.key.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const categories = [...new Set(modules?.map(m => m.category) || [])];

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredModules?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredModules?.map(m => m.id) || []));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('bulk_update_program_status', {
        p_module_ids: Array.from(selectedIds),
        p_new_status: newStatus,
        p_operator_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Bulk update successful",
        description: `${selectedIds.size} programs updated to ${newStatus}`,
      });
      setSelectedIds(new Set());
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Bulk update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClone = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('clone_program_module', {
        p_module_id: cloneModuleId,
        p_new_name: cloneName,
        p_new_key: cloneKey,
        p_operator_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Program cloned successfully",
        description: `New program "${cloneName}" created`,
      });
      setShowCloneDialog(false);
      setCloneName("");
      setCloneKey("");
      setCloneModuleId("");
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Clone failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportConfig = () => {
    const selectedModules = modules?.filter(m => selectedIds.has(m.id));
    const exportData = JSON.stringify(selectedModules, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `programs-export-${Date.now()}.json`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-success text-success-foreground';
      case 'draft': return 'bg-warning text-warning-foreground';
      case 'paused': return 'bg-muted text-muted-foreground';
      case 'archived': return 'bg-destructive/20 text-destructive';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading programs...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/programs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <LayoutGrid className="h-8 w-8" />
              Program Control Center
            </h1>
            <p className="text-muted-foreground">Bulk operations and advanced program management</p>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/programs/templates')}>
          <Plus className="mr-2 h-4 w-4" />
          Browse Templates
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="p-4 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox checked={selectedIds.size === filteredModules?.length} onCheckedChange={selectAll} />
              <span className="font-medium">{selectedIds.size} selected</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('live')}>
                <Play className="mr-2 h-4 w-4" />
                Go Live
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('paused')}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('archived')}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportConfig}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules?.map(module => (
          <Card key={module.id} className={`p-4 cursor-pointer transition-all hover:shadow-lg ${selectedIds.has(module.id) ? 'ring-2 ring-primary' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.has(module.id)}
                  onCheckedChange={() => toggleSelect(module.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="text-2xl">{module.icon}</div>
                <div>
                  <h3 className="font-semibold">{module.name}</h3>
                  <p className="text-xs text-muted-foreground">{module.key}</p>
                </div>
              </div>
              <Badge className={getStatusColor(module.status)}>{module.status}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <span>{module.category}</span>
              <span>Order: {module.order_index}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/admin/programs/editor/${module.id}`)}>
                Edit
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setCloneModuleId(module.id);
                  setCloneName(`${module.name} (Copy)`);
                  setCloneKey(`${module.key}_copy`);
                  setShowCloneDialog(true);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Clone Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Program</DialogTitle>
            <DialogDescription>Create a copy of this program with a new name and key</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Program Name</label>
              <Input value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="New program name" />
            </div>
            <div>
              <label className="text-sm font-medium">Program Key</label>
              <Input value={cloneKey} onChange={(e) => setCloneKey(e.target.value)} placeholder="new-program-key" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)}>Cancel</Button>
            <Button onClick={handleClone}>Clone Program</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
