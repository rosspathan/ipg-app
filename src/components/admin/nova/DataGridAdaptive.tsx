import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RecordCard } from "./RecordCard";
import { Checkbox } from "@/components/ui/checkbox";

interface DataGridColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

interface DataGridAdaptiveProps<T> {
  data: T[];
  columns: DataGridColumn<T>[];
  keyExtractor: (item: T) => string;
  renderCard: (item: T, selected: boolean, onSelect: (id: string) => void) => React.ReactNode;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * DataGridAdaptive - Responsive data grid
 * - Table view on desktop (≥768px)
 * - Card grid on mobile (<768px)
 * - Bulk selection support
 * - Virtualization ready
 */
export function DataGridAdaptive<T>({
  data,
  columns,
  keyExtractor,
  renderCard,
  onRowClick,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  loading = false,
  emptyMessage = "No records found",
  className,
}: DataGridAdaptiveProps<T>) {
  const [internalSelection, setInternalSelection] = useState<string[]>([]);
  const selection = onSelectionChange ? selectedIds : internalSelection;
  const setSelection = onSelectionChange || setInternalSelection;

  const toggleSelection = (id: string) => {
    const newSelection = selection.includes(id)
      ? selection.filter((s) => s !== id)
      : [...selection, id];
    setSelection(newSelection);
  };

  const toggleSelectAll = () => {
    if (selection.length === data.length) {
      setSelection([]);
    } else {
      setSelection(data.map(keyExtractor));
    }
  };

  if (loading) {
    return (
      <div data-testid="data-grid" className={cn("space-y-3", className)}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-[hsl(229_30%_16%/0.5)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        data-testid="data-grid"
        className={cn(
          "flex items-center justify-center p-12 rounded-2xl",
          "bg-[hsl(229_30%_16%/0.5)] border border-[hsl(225_24%_22%/0.16)]",
          className
        )}
      >
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div data-testid="data-grid" className={cn("space-y-3", className)}>
      {/* Mobile Card Grid */}
      <div className="md:hidden grid gap-3">
        {data.map((item) => {
          const id = keyExtractor(item);
          const selected = selection.includes(id);
          return (
            <div key={id} className="relative">
              {selectable && (
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleSelection(id)}
                    className="bg-[hsl(229_30%_16%)]"
                  />
                </div>
              )}
              {renderCard(item, selected, toggleSelection)}
            </div>
          );
        })}
      </div>

      {/* Desktop Table (future implementation) */}
      <div className="hidden md:block">
        <div className="rounded-2xl border border-[hsl(225_24%_22%/0.16)] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[hsl(229_30%_16%)] border-b border-[hsl(225_24%_22%/0.16)]">
              <tr>
                {selectable && (
                  <th className="w-12 p-4">
                    <Checkbox
                      checked={selection.length === data.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "p-4 text-left text-sm font-medium text-muted-foreground",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right"
                    )}
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const id = keyExtractor(item);
                const selected = selection.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "border-b border-[hsl(225_24%_22%/0.08)] transition-colors",
                      "hover:bg-[hsl(229_30%_16%/0.5)]",
                      selected && "bg-[hsl(229_30%_16%)]",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {selectable && (
                      <td className="p-4">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleSelection(id)}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "p-4 text-sm",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.render ? col.render(item) : String((item as any)[col.key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
