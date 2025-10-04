import * as React from "react"
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProProps {
  onClearFilters: () => void
}

export function EmptyStatePro({ onClearFilters }: EmptyStateProProps) {
  return (
    <div 
      data-testid="programs-empty"
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
        <SearchX className="h-8 w-8 text-muted-foreground opacity-50" />
      </div>
      
      <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
        No Programs Found
      </h3>
      
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
        Try adjusting your search or filters to find what you're looking for
      </p>
      
      <Button
        variant="outline"
        onClick={onClearFilters}
        className="gap-2"
      >
        Clear Filters
      </Button>
    </div>
  )
}
