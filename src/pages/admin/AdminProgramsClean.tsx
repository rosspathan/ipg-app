import { FolderKanban, Plus, Search, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/admin/clean/StatusBadge";
import { LoadingState, EmptyState } from "@/components/admin/clean";
import { useProgramModules } from "@/hooks/useProgramRegistry";
import { useNavigate } from "react-router-dom";
import { BulkActionsBar } from "@/components/admin/programs/BulkActionsBar";
import { ProgramFilters } from "@/components/admin/programs/ProgramFilters";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminProgramsClean() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { modules, isLoading } = useProgramModules();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const refetchModules = () => {
    queryClient.invalidateQueries({ queryKey: ['program-modules'] });
  };

  // Calculate status counts
  const statusCounts = useMemo(() => {
    if (!modules) return { all: 0, live: 0, draft: 0, paused: 0, archived: 0 };
    return {
      all: modules.length,
      live: modules.filter(m => m.status === 'live').length,
      draft: modules.filter(m => m.status === 'draft').length,
      paused: modules.filter(m => m.status === 'paused').length,
      archived: modules.filter(m => m.status === 'archived').length,
    };
  }, [modules]);

  // Filter and sort modules
  const filteredModules = useMemo(() => {
    if (!modules) return [];
    
    let filtered = modules.filter(module => 
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "created-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "updated-desc":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [modules, searchQuery, statusFilter, sortBy]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredModules.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredModules.map(m => m.id));
    }
  };

  // Bulk action handlers
  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('program_modules')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `${selectedIds.length} program(s) set to ${newStatus}`,
      });
      
      setSelectedIds([]);
      refetchModules();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update program status",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('program_modules')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Programs deleted",
        description: `${selectedIds.length} program(s) deleted successfully`,
      });
      
      setSelectedIds([]);
      setShowDeleteDialog(false);
      refetchModules();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete programs",
        variant: "destructive",
      });
    }
  };

  const handleBulkExport = () => {
    const selectedModules = modules?.filter(m => selectedIds.includes(m.id));
    const dataStr = JSON.stringify(selectedModules, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `programs-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export complete",
      description: `${selectedIds.length} program(s) exported`,
    });
  };

  const handleBulkDuplicate = async () => {
    try {
      const selectedModules = modules?.filter(m => selectedIds.includes(m.id));
      if (!selectedModules) return;

      const duplicates = selectedModules.map(m => ({
        name: `${m.name} (Copy)`,
        key: `${m.key}_copy_${Date.now()}`,
        description: m.description,
        status: 'draft' as const,
        category: m.category,
        icon: m.icon,
        route: m.route,
        order_index: m.order_index,
        enabled_regions: m.enabled_regions,
        enabled_roles: m.enabled_roles,
      }));

      const { error } = await supabase
        .from('program_modules')
        .insert(duplicates);

      if (error) throw error;

      toast({
        title: "Programs duplicated",
        description: `${selectedIds.length} program(s) duplicated as drafts`,
      });
      
      setSelectedIds([]);
      refetchModules();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate programs",
        variant: "destructive",
      });
    }
  };

  // Map status to badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'live': return 'success';
      case 'draft': return 'warning';
      case 'paused': return 'info';
      case 'archived': return 'danger';
      default: return 'info';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(0_0%_98%)]">Programs</h1>
          <p className="text-sm text-[hsl(220_9%_65%)] mt-1">
            Manage all platform programs and modules
          </p>
        </div>
        <Button 
          onClick={() => navigate("/admin/programs/editor/new")}
          className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_70%)] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Program
        </Button>
      </div>

      {/* Search & Filters */}
      <CleanCard padding="md">
        <div className="flex items-center gap-3">
          {/* Select All Checkbox */}
          {filteredModules && filteredModules.length > 0 && (
            <Checkbox
              checked={selectedIds.length === filteredModules.length && filteredModules.length > 0}
              onCheckedChange={toggleSelectAll}
              className="border-[hsl(220_13%_14%)]"
            />
          )}
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(220_9%_46%)]" />
            <Input
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
            />
          </div>

          <ProgramFilters
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            statusCounts={statusCounts}
          />
        </div>
      </CleanCard>

      {/* Loading State */}
      {isLoading && <LoadingState message="Loading programs..." />}

      {/* Empty State */}
      {!isLoading && filteredModules && filteredModules.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="No programs found"
          description={searchQuery ? "Try adjusting your search query" : "Get started by creating your first program"}
          actionLabel={!searchQuery ? "New Program" : undefined}
          onAction={!searchQuery ? () => navigate("/admin/programs/editor/new") : undefined}
        />
      )}

      {/* Programs Grid */}
      {!isLoading && filteredModules && filteredModules.length > 0 && (
        <CleanGrid cols={3} gap="md">
          {filteredModules.map((module) => (
            <CleanCard 
              key={module.id}
              padding="lg" 
              className="hover:bg-[hsl(220_13%_12%)] transition-colors cursor-pointer relative"
              onClick={() => navigate(`/admin/programs/editor/${module.id}`)}
            >
              {/* Selection Checkbox */}
              <div 
                className="absolute top-3 left-3 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selectedIds.includes(module.id)}
                  onCheckedChange={() => toggleSelection(module.id)}
                  className="border-[hsl(220_13%_14%)] bg-[hsl(220_13%_10%)]"
                />
              </div>

              <div className="flex items-start justify-between mb-3 ml-8">
                <div className="p-2 rounded-lg bg-[hsl(262_100%_65%/0.1)]">
                  <FolderKanban className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                </div>
                <StatusBadge 
                  status={getStatusVariant(module.status)} 
                  label={module.status.charAt(0).toUpperCase() + module.status.slice(1)} 
                />
              </div>
              <h3 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-1">
                {module.name}
              </h3>
              <p className="text-sm text-[hsl(220_9%_65%)] mb-4 line-clamp-2">
                {module.description || 'No description available'}
              </p>
              <div className="flex items-center justify-between text-xs text-[hsl(220_9%_65%)]">
                <span>Key: {module.key}</span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-8 text-[hsl(262_100%_65%)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/programs/editor/${module.id}`);
                  }}
                >
                  Manage
                </Button>
              </div>
            </CleanCard>
          ))}
        </CleanGrid>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.length}
        onChangeStatus={handleBulkStatusChange}
        onDelete={() => setShowDeleteDialog(true)}
        onExport={handleBulkExport}
        onDuplicate={handleBulkDuplicate}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[hsl(0_0%_98%)]">Delete Programs</AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(220_9%_65%)]">
              Are you sure you want to delete {selectedIds.length} program(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[hsl(220_13%_14%)] text-[hsl(0_0%_98%)] hover:bg-[hsl(220_13%_18%)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-[hsl(0_84%_60%)] text-white hover:bg-[hsl(0_84%_65%)]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
