import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DrawExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawName: string;
  participants: number;
  onConfirm: () => void;
}

export function DrawExecutionDialog({ 
  open, 
  onOpenChange, 
  drawName, 
  participants,
  onConfirm 
}: DrawExecutionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Execute Draw?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Winners will be randomly selected and prizes distributed immediately.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm"><span className="font-semibold">Draw:</span> {drawName}</p>
            <p className="text-sm"><span className="font-semibold">Participants:</span> {participants}</p>
            <p className="text-sm"><span className="font-semibold">Winners:</span> 3 (1st, 2nd, 3rd place)</p>
          </div>
          
          <p className="text-xs text-muted-foreground">
            ⚠️ Make sure you have reviewed all entries before executing the draw.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}>
            Execute Draw
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}