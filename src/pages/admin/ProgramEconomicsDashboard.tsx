import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgramTable } from "@/components/admin/program-economics/ProgramTable";
import { QuickStatsBar } from "@/components/admin/program-economics/QuickStatsBar";
import { useProgramEconomics } from "@/hooks/useProgramEconomics";

export default function ProgramEconomicsDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
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
          <Button size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Create Program
          </Button>
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
        />
      </div>
    </div>
  );
}
