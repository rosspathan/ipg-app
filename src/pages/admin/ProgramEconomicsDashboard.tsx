import { useState } from "react";
import { BarChart3, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgramTable } from "@/components/admin/program-economics/ProgramTable";
import { QuickStatsBar } from "@/components/admin/program-economics/QuickStatsBar";
import { ProgramAnalytics } from "@/components/admin/program-economics/ProgramAnalytics";
import { useProgramEconomics } from "@/hooks/useProgramEconomics";
import type { ProgramWithConfig } from "@/hooks/useProgramEconomics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProgramEconomicsDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<ProgramWithConfig | null>(null);
  const { programs, isLoading, refetch } = useProgramEconomics();

  const filteredPrograms = programs.filter((program) =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Program Economics</h1>
            <p className="text-muted-foreground mt-1">
              Manage all BSK-controlled programs from one dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" variant="outline" asChild>
              <Link to="/admin/program-economics-analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Link>
            </Button>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Program
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <QuickStatsBar programs={programs} isLoading={isLoading} />

        {/* Search & Filter */}
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Main Table */}
        <ProgramTable
          programs={filteredPrograms}
          isLoading={isLoading}
          onRefetch={refetch}
          onViewAnalytics={(program) => setSelectedProgram(program)}
        />

        {/* Analytics Modal */}
        <Dialog open={!!selectedProgram} onOpenChange={() => setSelectedProgram(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Program Analytics</DialogTitle>
            </DialogHeader>
            {selectedProgram && (
              <ProgramAnalytics program={selectedProgram} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
