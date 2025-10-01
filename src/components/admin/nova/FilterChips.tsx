import * as React from "react";
import { useState } from "react";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface FilterOption {
  id: string;
  label: string;
  value: any;
  group?: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

interface FilterChipsProps {
  groups: FilterGroup[];
  activeFilters: Record<string, any[]>;
  onFiltersChange: (filters: Record<string, any[]>) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onOpenSheet?: () => void;
  className?: string;
}

/**
 * FilterChips - Searchable chip filters
 * - Search input
 * - Active filter chips with remove
 * - Filter button to open FilterSheet
 * - Compact, mobile-optimized
 */
export function FilterChips({
  groups,
  activeFilters,
  onFiltersChange,
  searchValue = "",
  onSearchChange,
  onOpenSheet,
  className,
}: FilterChipsProps) {
  const activeFilterCount = Object.values(activeFilters).flat().length;

  const removeFilter = (groupId: string, value: any) => {
    const newFilters = {
      ...activeFilters,
      [groupId]: (activeFilters[groupId] || []).filter((v) => v !== value),
    };
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    if (onSearchChange) onSearchChange("");
  };

  const getFilterLabel = (groupId: string, value: any): string => {
    const group = groups.find((g) => g.id === groupId);
    const option = group?.options.find((o) => o.value === value);
    return option?.label || String(value);
  };

  return (
    <div
      data-testid="filter-chips"
      className={cn("space-y-3", className)}
    >
      {/* Search & Filter Button */}
      <div className="flex items-center gap-2">
        {onSearchChange && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn(
                "pl-9 h-10 bg-[hsl(229_30%_16%/0.5)] border-[hsl(225_24%_22%/0.16)]",
                "focus:border-primary focus:ring-1 focus:ring-primary"
              )}
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {onOpenSheet && (
          <Button
            variant="outline"
            size="default"
            onClick={onOpenSheet}
            className={cn(
              "shrink-0 gap-2 bg-[hsl(229_30%_16%/0.5)] border-[hsl(225_24%_22%/0.16)]",
              "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
              activeFilterCount > 0 && "border-primary/50"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs bg-primary text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(activeFilters).map(([groupId, values]) =>
            values.map((value) => (
              <Badge
                key={`${groupId}-${value}`}
                variant="outline"
                className={cn(
                  "gap-1.5 pr-1 bg-primary/10 text-primary border-primary/20",
                  "hover:bg-primary/20 transition-colors"
                )}
              >
                <span className="text-xs">{getFilterLabel(groupId, value)}</span>
                <button
                  onClick={() => removeFilter(groupId, value)}
                  className="hover:text-primary-foreground rounded-full p-0.5 hover:bg-primary/20"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
