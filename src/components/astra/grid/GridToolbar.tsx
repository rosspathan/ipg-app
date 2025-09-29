import * as React from "react"
import { useState } from "react"
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type SortOption = "most-used" | "new" | "a-z"
export type CategoryFilter = "all" | "earn" | "games" | "finance" | "trading"

interface GridToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  selectedCategory: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  onOpenFilters: () => void
  className?: string
}

const categories = [
  { id: "all" as const, label: "All", count: 12 },
  { id: "earn" as const, label: "Earn", count: 4 },
  { id: "games" as const, label: "Games", count: 3 },
  { id: "finance" as const, label: "Finance", count: 3 },
  { id: "trading" as const, label: "Trading", count: 2 }
]

const sortOptions = [
  { id: "most-used" as const, label: "Most Used" },
  { id: "new" as const, label: "New" },
  { id: "a-z" as const, label: "A-Z" }
]

export function GridToolbar({
  searchValue,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  onOpenFilters,
  className
}: GridToolbarProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  return (
    <div 
      className={cn("p-4 space-y-3", className)}
      data-testid="grid-toolbar"
    >
      {/* Search & Sort Row */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center bg-card-secondary/60 rounded-xl border border-border/40 transition-all duration-220",
          isSearchExpanded ? "flex-1" : "w-10 h-10"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className="h-10 w-10 p-0 rounded-xl"
          >
            <Search className="h-4 w-4" />
          </Button>
          
          {isSearchExpanded && (
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search programs..."
              className="border-0 bg-transparent text-sm px-2 focus-visible:ring-0"
              autoFocus
            />
          )}
        </div>
        
        {/* Sort Dropdown */}
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 h-10 px-3 bg-card-secondary/60 border border-border/40 rounded-xl"
        >
          <span className="text-sm font-medium">
            {sortOptions.find(opt => opt.id === sortBy)?.label}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
        
        {/* Refine Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenFilters}
          className="h-10 px-3 bg-accent/10 border border-accent/30 rounded-xl text-accent hover:bg-accent/20"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Refine
        </Button>
      </div>
      
      {/* Category Filter Chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "flex items-center gap-2 flex-shrink-0 rounded-xl transition-all duration-220",
              selectedCategory === category.id
                ? "bg-primary/20 text-primary border-primary/40"
                : "text-text-secondary hover:text-text-primary hover:bg-card-secondary/60"
            )}
          >
            {category.label}
            {category.count > 0 && (
              <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded-full">
                {category.count}
              </span>
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}