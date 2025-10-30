import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Award, XCircle, CheckCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  badgeFilter: string;
  onBadgeFilterChange: (value: string) => void;
  levelFilter: string;
  onLevelFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  totalResults: number;
  maxLevel: number;
}

export function TeamFilters({
  searchQuery,
  onSearchChange,
  badgeFilter,
  onBadgeFilterChange,
  levelFilter,
  onLevelFilterChange,
  statusFilter,
  onStatusFilterChange,
  totalResults,
  maxLevel,
}: TeamFiltersProps) {
  const hasActiveFilters = searchQuery || badgeFilter !== "all" || levelFilter !== "all" || statusFilter !== "all";

  const clearAllFilters = () => {
    onSearchChange("");
    onBadgeFilterChange("all");
    onLevelFilterChange("all");
    onStatusFilterChange("all");
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, username, or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Active
              </span>
            </SelectItem>
            <SelectItem value="inactive">
              <span className="flex items-center gap-2">
                <XCircle className="h-3 w-3 text-muted-foreground" />
                Inactive
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Badge Filter */}
        <Select value={badgeFilter} onValueChange={onBadgeFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Badge" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Badges</SelectItem>
            <SelectItem value="vip">
              <span className="flex items-center gap-2">
                <Award className="h-3 w-3 text-primary" />
                VIP Only
              </span>
            </SelectItem>
            <SelectItem value="with-badge">
              <span className="flex items-center gap-2">
                <Award className="h-3 w-3 text-secondary" />
                With Badge
              </span>
            </SelectItem>
            <SelectItem value="no-badge">
              <span className="flex items-center gap-2">
                <XCircle className="h-3 w-3 text-muted-foreground" />
                No Badge
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Level Filter */}
        <Select value={levelFilter} onValueChange={onLevelFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="1">Level 1 (Direct)</SelectItem>
            {[2, 3, 4, 5].map(level => (
              level <= maxLevel && (
                <SelectItem key={level} value={level.toString()}>
                  Level {level}
                </SelectItem>
              )
            ))}
            {maxLevel > 5 && (
              <SelectItem value="6-10">Levels 6-10</SelectItem>
            )}
            {maxLevel > 10 && (
              <SelectItem value="11+">Levels 11+</SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}

        {/* Results Count */}
        <div className="ml-auto">
          <Badge variant="secondary" className="text-xs">
            {totalResults} {totalResults === 1 ? 'member' : 'members'}
          </Badge>
        </div>
      </div>
    </div>
  );
}
