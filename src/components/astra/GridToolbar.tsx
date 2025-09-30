import * as React from "react"
import { useState } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type CategoryFilter = "all" | "earn" | "games" | "finance" | "trading" | "network"
export type SortOption = "most-used" | "a-z" | "new"

interface GridToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  selectedCategory: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  onOpenFilters?: () => void
  className?: string
}

const categories: { id: CategoryFilter; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "⚡" },
  { id: "earn", label: "Earn", emoji: "💰" },
  { id: "games", label: "Games", emoji: "🎮" },
  { id: "finance", label: "Finance", emoji: "🏦" },
  { id: "trading", label: "Trading", emoji: "📈" },
  { id: "network", label: "Network", emoji: "👥" }
]

const sortOptions: { id: SortOption; label: string }[] = [
  { id: "most-used", label: "Most Used" },
  { id: "a-z", label: "A-Z" },
  { id: "new", label: "New" }
]

/**
 * GridToolbar - Search, category chips, sort options
 * Purple Nova DS - glass header with purple highlights
 */
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
  const [showSortMenu, setShowSortMenu] = useState(false)

  return (
    <div
      className={cn(
        "sticky top-0 z-40 bg-card/40 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(24px)',
        backdropFilter: 'blur(24px)'
      }}
      data-testid="grid-toolbar"
    >
      <div className="p-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search programs..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 h-11 bg-background/50 border-border/40 focus:border-primary/50 transition-colors duration-[120ms]"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-background/50 rounded-lg transition-colors duration-[120ms]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap",
                "transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                "border",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 scale-105"
                  : "bg-card/50 text-foreground border-border/40 hover:bg-card hover:border-primary/30"
              )}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Sort & Filters */}
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-xl",
                "bg-card/50 border border-border/40 text-sm font-medium",
                "hover:bg-card hover:border-primary/30 transition-all duration-[120ms]"
              )}
            >
              <span className="text-muted-foreground">Sort:</span>
              <span className="text-foreground">
                {sortOptions.find(s => s.id === sortBy)?.label}
              </span>
            </button>

            {showSortMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/40 rounded-xl shadow-2xl overflow-hidden z-50">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      onSortChange(option.id)
                      setShowSortMenu(false)
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left transition-colors duration-[120ms]",
                      sortBy === option.id
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-background/50 text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refine Button */}
          {onOpenFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenFilters}
              className="flex items-center gap-2 border-border/40 hover:border-accent/50 hover:text-accent"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Refine</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
