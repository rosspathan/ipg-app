import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";

interface TreeFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterVIPOnly: boolean;
  onVIPFilterChange: (value: boolean) => void;
  filterActiveOnly: boolean;
  onActiveFilterChange: (value: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExpandToLevel: (level: number) => void;
}

export function TreeFilters({
  searchQuery,
  onSearchChange,
  filterVIPOnly,
  onVIPFilterChange,
  filterActiveOnly,
  onActiveFilterChange,
  onExpandAll,
  onCollapseAll,
  onExpandToLevel,
}: TreeFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or username..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="vip-filter"
              checked={filterVIPOnly}
              onCheckedChange={onVIPFilterChange}
            />
            <Label htmlFor="vip-filter" className="text-sm">VIP Only</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active-filter"
              checked={filterActiveOnly}
              onCheckedChange={onActiveFilterChange}
            />
            <Label htmlFor="active-filter" className="text-sm">Active Only</Label>
          </div>
        </div>

        {/* Expand Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onExpandAll}
            className="gap-2"
          >
            <ChevronDown className="h-4 w-4" />
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCollapseAll}
            className="gap-2"
          >
            <ChevronRight className="h-4 w-4" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Quick expand to level */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Expand to level:</span>
        {[1, 2, 3, 5, 10].map((level) => (
          <Button
            key={level}
            variant="outline"
            size="sm"
            onClick={() => onExpandToLevel(level)}
          >
            L{level}
          </Button>
        ))}
      </div>
    </div>
  );
}
