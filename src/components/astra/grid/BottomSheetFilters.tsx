import * as React from "react"
import { useState } from "react"
import { X, Filter, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"

export interface FilterState {
  categories: string[]
  regions: string[]
  status: string[]
  minReward: number
  maxReward: number
  volatilityMode: boolean
  activeOnly: boolean
}

interface BottomSheetFiltersProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onReset: () => void
}

const categoryOptions = [
  { id: "earn", label: "Earn", icon: "💰" },
  { id: "games", label: "Games", icon: "🎮" },
  { id: "finance", label: "Finance", icon: "🏦" },
  { id: "trading", label: "Trading", icon: "📈" }
]

const regionOptions = [
  { id: "global", label: "Global", flag: "🌍" },
  { id: "india", label: "India", flag: "🇮🇳" },
  { id: "asia", label: "Asia Pacific", flag: "🌏" }
]

const statusOptions = [
  { id: "active", label: "Active", color: "success" },
  { id: "paused", label: "Paused", color: "warning" },
  { id: "maintenance", label: "Maintenance", color: "muted" }
]

export function BottomSheetFilters({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onReset
}: BottomSheetFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleApply = () => {
    onFiltersChange(localFilters)
    onClose()
  }

  const toggleCategory = (categoryId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }))
  }

  const toggleRegion = (regionId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      regions: prev.regions.includes(regionId)
        ? prev.regions.filter(id => id !== regionId)
        : [...prev.regions, regionId]
    }))
  }

  const toggleStatus = (statusId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      status: prev.status.includes(statusId)
        ? prev.status.filter(id => id !== statusId)
        : [...prev.status, statusId]
    }))
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] rounded-t-2xl border-t border-border/50"
        data-testid="filters-sheet"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Refine Programs
            </SheetTitle>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 overflow-auto flex-1 pb-20">
          {/* Categories */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              {categoryOptions.map((category) => (
                <Button
                  key={category.id}
                  variant={localFilters.categories.includes(category.id) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "justify-start gap-2 h-12",
                    localFilters.categories.includes(category.id)
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "border border-border/40"
                  )}
                >
                  <span className="text-lg">{category.icon}</span>
                  {category.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Regions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Regions</h3>
            <div className="space-y-2">
              {regionOptions.map((region) => (
                <Button
                  key={region.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRegion(region.id)}
                  className={cn(
                    "w-full justify-start gap-3 h-10",
                    localFilters.regions.includes(region.id)
                      ? "bg-accent/20 text-accent"
                      : "hover:bg-card-secondary/60"
                  )}
                >
                  <span className="text-sm">{region.flag}</span>
                  {region.label}
                  {localFilters.regions.includes(region.id) && (
                    <span className="ml-auto text-accent">✓</span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Status</h3>
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <Button
                  key={status.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleStatus(status.id)}
                  className={cn(
                    "w-full justify-start gap-3 h-10",
                    localFilters.status.includes(status.id)
                      ? "bg-success/20 text-success"
                      : "hover:bg-card-secondary/60"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    status.color === "success" && "bg-success",
                    status.color === "warning" && "bg-warning",
                    status.color === "muted" && "bg-muted"
                  )} />
                  {status.label}
                  {localFilters.status.includes(status.id) && (
                    <span className="ml-auto text-success">✓</span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Reward Range */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Reward Range (BSK)</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Minimum</label>
                <Slider
                  value={[localFilters.minReward]}
                  onValueChange={([value]) => setLocalFilters(prev => ({ ...prev, minReward: value }))}
                  max={10000}
                  step={100}
                  className="mt-2"
                />
                <div className="text-xs text-accent font-mono tabular-nums mt-1">
                  {localFilters.minReward.toLocaleString()} BSK
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground">Maximum</label>
                <Slider
                  value={[localFilters.maxReward]}
                  onValueChange={([value]) => setLocalFilters(prev => ({ ...prev, maxReward: value }))}
                  max={100000}
                  step={1000}
                  className="mt-2"
                />
                <div className="text-xs text-accent font-mono tabular-nums mt-1">
                  {localFilters.maxReward.toLocaleString()} BSK
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Advanced Options */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-foreground">Advanced</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Volatility Mode</div>
                <div className="text-xs text-muted-foreground">Higher risk, higher rewards</div>
              </div>
              <Switch
                checked={localFilters.volatilityMode}
                onCheckedChange={(checked) => setLocalFilters(prev => ({ ...prev, volatilityMode: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Active Programs Only</div>
                <div className="text-xs text-muted-foreground">Hide paused or maintenance</div>
              </div>
              <Switch
                checked={localFilters.activeOnly}
                onCheckedChange={(checked) => setLocalFilters(prev => ({ ...prev, activeOnly: checked }))}
              />
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border/50">
          <Button onClick={handleApply} className="w-full h-12">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}