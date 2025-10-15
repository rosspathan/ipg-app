import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProgramFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  statusCounts?: {
    all: number;
    live: number;
    draft: number;
    paused: number;
    archived: number;
  };
}

export function ProgramFilters({
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  statusCounts
}: ProgramFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[180px] bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]">
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent className="bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%)]">
          <SelectItem value="all" className="text-[hsl(0_0%_98%)]">
            All Programs {statusCounts && `(${statusCounts.all})`}
          </SelectItem>
          <SelectItem value="live" className="text-[hsl(152_64%_48%)]">
            Live {statusCounts && `(${statusCounts.live})`}
          </SelectItem>
          <SelectItem value="draft" className="text-[hsl(33_93%_60%)]">
            Draft {statusCounts && `(${statusCounts.draft})`}
          </SelectItem>
          <SelectItem value="paused" className="text-[hsl(217_91%_60%)]">
            Paused {statusCounts && `(${statusCounts.paused})`}
          </SelectItem>
          <SelectItem value="archived" className="text-[hsl(220_9%_65%)]">
            Archived {statusCounts && `(${statusCounts.archived})`}
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Sort Dropdown */}
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[180px] bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent className="bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%)]">
          <SelectItem value="name-asc" className="text-[hsl(0_0%_98%)]">Name (A-Z)</SelectItem>
          <SelectItem value="name-desc" className="text-[hsl(0_0%_98%)]">Name (Z-A)</SelectItem>
          <SelectItem value="created-desc" className="text-[hsl(0_0%_98%)]">Newest First</SelectItem>
          <SelectItem value="created-asc" className="text-[hsl(0_0%_98%)]">Oldest First</SelectItem>
          <SelectItem value="updated-desc" className="text-[hsl(0_0%_98%)]">Recently Updated</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
