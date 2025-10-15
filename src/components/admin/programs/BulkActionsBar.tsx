import { Trash2, Archive, FileDown, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  selectedCount: number;
  onChangeStatus: (status: string) => void;
  onDelete: () => void;
  onExport: () => void;
  onDuplicate: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onChangeStatus,
  onDelete,
  onExport,
  onDuplicate,
  onClearSelection
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
      "bg-[hsl(220_13%_10%)] border border-[hsl(220_13%_14%)] rounded-lg shadow-lg",
      "px-4 py-3 flex items-center gap-4",
      "animate-in slide-in-from-bottom-4 duration-200"
    )}>
      <span className="text-sm text-[hsl(0_0%_98%)] font-medium">
        {selectedCount} program{selectedCount !== 1 ? 's' : ''} selected
      </span>
      
      <div className="h-6 w-px bg-[hsl(220_13%_14%)]" />
      
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChangeStatus('live')}
          className="text-[hsl(152_64%_48%)] hover:bg-[hsl(152_64%_48%/0.1)]"
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Set Live
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChangeStatus('draft')}
          className="text-[hsl(33_93%_60%)] hover:bg-[hsl(33_93%_60%/0.1)]"
        >
          Set Draft
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChangeStatus('archived')}
          className="text-[hsl(220_9%_65%)] hover:bg-[hsl(220_13%_14%)]"
        >
          <Archive className="w-4 h-4 mr-1" />
          Archive
        </Button>
        
        <div className="h-6 w-px bg-[hsl(220_13%_14%)]" />
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onDuplicate}
          className="hover:bg-[hsl(220_13%_14%)]"
        >
          <Copy className="w-4 h-4 mr-1" />
          Duplicate
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onExport}
          className="hover:bg-[hsl(220_13%_14%)]"
        >
          <FileDown className="w-4 h-4 mr-1" />
          Export
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-[hsl(0_84%_60%)] hover:bg-[hsl(0_84%_60%/0.1)]"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>
      
      <div className="h-6 w-px bg-[hsl(220_13%_14%)]" />
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onClearSelection}
        className="text-[hsl(220_9%_65%)] hover:bg-[hsl(220_13%_14%)]"
      >
        Clear
      </Button>
    </div>
  );
}
