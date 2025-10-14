import { FolderKanban, Plus, Search } from "lucide-react";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/admin/clean/StatusBadge";
import { useNavigate } from "react-router-dom";

export default function AdminProgramsClean() {
  const navigate = useNavigate();

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
              className="pl-10 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
            />
          </div>
        </div>
      </CleanCard>

      {/* Programs Grid */}
      <CleanGrid cols={3} gap="md">
        {/* Sample Program Card */}
        <CleanCard padding="lg" className="hover:bg-[hsl(220_13%_12%)] transition-colors cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-[hsl(262_100%_65%/0.1)]">
              <FolderKanban className="w-5 h-5 text-[hsl(262_100%_65%)]" />
            </div>
            <StatusBadge status="success" label="Active" />
          </div>
          <h3 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-1">
            Staking Program
          </h3>
          <p className="text-sm text-[hsl(220_9%_65%)] mb-4">
            Earn rewards by staking BSK tokens
          </p>
          <div className="flex items-center justify-between text-xs text-[hsl(220_9%_65%)]">
            <span>1,234 participants</span>
            <Button 
              size="sm" 
              variant="ghost"
              className="h-8 text-[hsl(262_100%_65%)]"
            >
              Manage
            </Button>
          </div>
        </CleanCard>

        <CleanCard padding="lg" className="hover:bg-[hsl(220_13%_12%)] transition-colors cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-[hsl(262_100%_65%/0.1)]">
              <FolderKanban className="w-5 h-5 text-[hsl(262_100%_65%)]" />
            </div>
            <StatusBadge status="warning" label="Draft" />
          </div>
          <h3 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-1">
            Lucky Draw
          </h3>
          <p className="text-sm text-[hsl(220_9%_65%)] mb-4">
            Weekly lottery with prize pools
          </p>
          <div className="flex items-center justify-between text-xs text-[hsl(220_9%_65%)]">
            <span>856 participants</span>
            <Button 
              size="sm" 
              variant="ghost"
              className="h-8 text-[hsl(262_100%_65%)]"
            >
              Manage
            </Button>
          </div>
        </CleanCard>

        <CleanCard padding="lg" className="hover:bg-[hsl(220_13%_12%)] transition-colors cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-[hsl(262_100%_65%/0.1)]">
              <FolderKanban className="w-5 h-5 text-[hsl(262_100%_65%)]" />
            </div>
            <StatusBadge status="success" label="Active" />
          </div>
          <h3 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-1">
            Spin Wheel
          </h3>
          <p className="text-sm text-[hsl(220_9%_65%)] mb-4">
            Daily spin rewards for users
          </p>
          <div className="flex items-center justify-between text-xs text-[hsl(220_9%_65%)]">
            <span>2,341 participants</span>
            <Button 
              size="sm" 
              variant="ghost"
              className="h-8 text-[hsl(262_100%_65%)]"
            >
              Manage
            </Button>
          </div>
        </CleanCard>
      </CleanGrid>
    </div>
  );
}
