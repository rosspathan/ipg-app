import { FolderKanban, Plus, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/admin/clean/StatusBadge";
import { LoadingState, EmptyState } from "@/components/admin/clean";
import { useProgramModules } from "@/hooks/useProgramRegistry";
import { useNavigate } from "react-router-dom";

export default function AdminProgramsClean() {
  const navigate = useNavigate();
  const { modules, isLoading } = useProgramModules();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter modules based on search
  const filteredModules = modules?.filter(module => 
    module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(220_9%_46%)]" />
            <Input
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
            />
          </div>
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
              className="hover:bg-[hsl(220_13%_12%)] transition-colors cursor-pointer"
              onClick={() => navigate(`/admin/programs/editor/${module.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
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
    </div>
  );
}
