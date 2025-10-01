import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type FilterGroup } from "./FilterChips";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: FilterGroup[];
  activeFilters: Record<string, any[]>;
  onFiltersChange: (filters: Record<string, any[]>) => void;
  onApply?: () => void;
  className?: string;
}

/**
 * FilterSheet - Bottom sheet for filter selection
 * - Multi-select or single-select per group
 * - Grouped filters with labels
 * - Apply/Clear actions
 */
export function FilterSheet({
  open,
  onOpenChange,
  groups,
  activeFilters,
  onFiltersChange,
  onApply,
  className,
}: FilterSheetProps) {
  const [tempFilters, setTempFilters] = React.useState<Record<string, any[]>>(activeFilters);

  React.useEffect(() => {
    if (open) {
      setTempFilters(activeFilters);
    }
  }, [open, activeFilters]);

  const toggleFilter = (groupId: string, value: any, multiSelect: boolean) => {
    if (multiSelect) {
      const current = tempFilters[groupId] || [];
      const newValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setTempFilters({ ...tempFilters, [groupId]: newValues });
    } else {
      setTempFilters({ ...tempFilters, [groupId]: [value] });
    }
  };

  const handleApply = () => {
    onFiltersChange(tempFilters);
    if (onApply) onApply();
    onOpenChange(false);
  };

  const handleClear = () => {
    setTempFilters({});
  };

  const activeCount = Object.values(tempFilters).flat().length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="filter-sheet"
        side="bottom"
        className={cn(
          "bg-[hsl(230_28%_13%)] border-[hsl(225_24%_22%)]",
          "max-h-[80vh]",
          className
        )}
      >
        <SheetHeader className="pb-4 border-b border-[hsl(225_24%_22%/0.16)]">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-heading text-lg">Filters</SheetTitle>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 text-xs text-muted-foreground"
              >
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(80vh-160px)] mt-4">
          <div className="space-y-6 pr-4">
            {groups.map((group) => {
              const isMulti = group.multiSelect !== false;
              const activeValues = tempFilters[group.id] || [];

              return (
                <div key={group.id} className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">
                    {group.label}
                  </h3>

                  {isMulti ? (
                    <div className="space-y-2">
                      {group.options.map((option) => {
                        const isActive = activeValues.includes(option.value);
                        return (
                          <div
                            key={option.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={option.id}
                              checked={isActive}
                              onCheckedChange={() =>
                                toggleFilter(group.id, option.value, true)
                              }
                            />
                            <Label
                              htmlFor={option.id}
                              className="text-sm cursor-pointer"
                            >
                              {option.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <RadioGroup
                      value={activeValues[0]}
                      onValueChange={(value) =>
                        toggleFilter(group.id, value, false)
                      }
                    >
                      {group.options.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center space-x-2"
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={option.id}
                          />
                          <Label
                            htmlFor={option.id}
                            className="text-sm cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Sticky Apply Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[hsl(230_28%_13%)] border-t border-[hsl(225_24%_22%/0.16)]">
          <Button
            onClick={handleApply}
            className="w-full bg-gradient-to-br from-primary to-secondary hover:opacity-90"
          >
            Apply Filters {activeCount > 0 && `(${activeCount})`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
