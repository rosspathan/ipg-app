import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BulkActionsBarProps {
  selectedCount: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onExport: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

export const BulkActionsBar = ({
  selectedCount,
  onApproveAll,
  onRejectAll,
  onExport,
  onClearSelection,
  isProcessing
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-card border shadow-lg rounded-lg px-6 py-4 flex items-center gap-4">
        <Badge variant="secondary" className="text-base">
          {selectedCount} selected
        </Badge>
        
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={onApproveAll}
            disabled={isProcessing}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve All
          </Button>
          
          <Button
            size="sm"
            variant="destructive"
            onClick={onRejectAll}
            disabled={isProcessing}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject All
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};
