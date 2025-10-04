import * as React from "react"
import { useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CategoryFilter = "all" | "earn" | "games" | "finance" | "network" | "trading"
export type SortOption = "most-used" | "new" | "a-z"

interface FilterToolbarProProps {
  searchValue: string
  onSearchChange: (value: string) => void
  selectedCategory: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  onOpenFilters: () => void
}

const categories: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "earn", label: "Earn" },
  { id: "games", label: "Games" },
  { id: "finance", label: "Finance" },
  { id: "network", label: "Network" },
  { id: "trading", label: "Trading" }
]

const sortOptions: { id: SortOption; label: string }[] = [
  { id: "most-used", label: "Most Used" },
  { id: "new", label: "New" },
  { id: "a-z", label: "A-Z" }
]

export function FilterToolbarPro({
  searchValue,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  onOpenFilters
}: FilterToolbarProProps) {
  const [debouncedValue, setDebouncedValue] = useState(searchValue)
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(debouncedValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [debouncedValue, onSearchChange])
  
  return (
    <div 
      data-testid="programs-toolbar"
      className="sticky top-[73px] z-20 bg-background/95 backdrop-blur-sm border-b border-border/30"
    >
      {/* Search & Refine */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search programs..."
            value={debouncedValue}
            onChange={(e) => setDebouncedValue(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-border/50"
          />
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenFilters}
          className="h-10 w-10 shrink-0"
          aria-label="Refine filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Category Chips */}
      <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-220",
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
      
      {/* Sort Options */}
      <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {sortOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSortChange(opt.id)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-220",
              sortBy === opt.id
                ? "bg-accent/20 text-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
