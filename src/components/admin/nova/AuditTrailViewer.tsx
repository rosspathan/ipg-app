import * as React from "react";
import { Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuditEntry {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  changes?: {
    field: string;
    before: any;
    after: any;
  }[];
  metadata?: Record<string, any>;
}

interface AuditTrailViewerProps {
  entries: AuditEntry[];
  onExport?: (format: "csv" | "json") => void;
  onRevert?: (entryId: string) => void;
  className?: string;
}

/**
 * AuditTrailViewer - Diff view of changes
 * - Timeline of modifications
 * - Before/After comparison
 * - Export as CSV/JSON
 * - Operator/time tracking
 * - Undo/revert where supported
 */
export function AuditTrailViewer({
  entries,
  onExport,
  onRevert,
  className,
}: AuditTrailViewerProps) {
  const [selectedEntry, setSelectedEntry] = React.useState<AuditEntry | null>(null);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <>
      <div
        data-testid="audit-trail"
        className={cn("space-y-4", className)}
      >
        {/* Export Actions */}
        {onExport && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Audit Trail</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("csv")}
                className="gap-2 bg-transparent border-[hsl(225_24%_22%/0.16)]"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("json")}
                className="gap-2 bg-transparent border-[hsl(225_24%_22%/0.16)]"
              >
                <Download className="w-4 h-4" />
                JSON
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                className={cn(
                  "relative pl-6 pb-3",
                  idx !== entries.length - 1 && "border-l-2 border-[hsl(225_24%_22%/0.16)]"
                )}
              >
                {/* Timeline Dot */}
                <div
                  className={cn(
                    "absolute left-0 top-1 w-3 h-3 rounded-full border-2",
                    "bg-[hsl(230_28%_13%)] border-primary"
                  )}
                />

                {/* Entry Card */}
                <div
                  className={cn(
                    "p-3 rounded-lg",
                    "bg-[hsl(229_30%_16%/0.5)] border border-[hsl(225_24%_22%/0.16)]",
                    "hover:bg-[hsl(229_30%_16%)] transition-colors"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {entry.action}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {entry.operator} • {entry.timestamp}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {entry.changes && entry.changes.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntry(entry)}
                          className="h-6 px-2 text-xs gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </Button>
                      )}
                      {onRevert && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRevert(entry.id)}
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Revert
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Quick Changes Preview */}
                  {entry.changes && entry.changes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.changes.slice(0, 3).map((change, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs bg-accent/10 text-accent border-accent/20"
                        >
                          {change.field}
                        </Badge>
                      ))}
                      {entry.changes.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-muted/10 text-muted-foreground border-muted/20"
                        >
                          +{entry.changes.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Diff Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="bg-[hsl(230_28%_13%)] border-[hsl(225_24%_22%)] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {selectedEntry?.action}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {selectedEntry?.changes?.map((change, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[hsl(229_30%_16%/0.5)] border border-[hsl(225_24%_22%/0.16)]"
                >
                  <p className="text-sm font-medium text-foreground mb-2">
                    {change.field}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Before</p>
                      <div className="p-2 rounded bg-danger/10 border border-danger/20">
                        <code className="text-xs text-danger break-all">
                          {formatValue(change.before)}
                        </code>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">After</p>
                      <div className="p-2 rounded bg-success/10 border border-success/20">
                        <code className="text-xs text-success break-all">
                          {formatValue(change.after)}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
