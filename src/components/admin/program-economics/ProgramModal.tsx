import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProgramWithConfig } from "@/hooks/useProgramEconomics";

interface ProgramModalProps {
  program: ProgramWithConfig;
  isOpen: boolean;
  onClose: () => void;
}

export function ProgramModal({ program, isOpen, onClose }: ProgramModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {program.name}</DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <p className="text-muted-foreground">
            Program editor forms will be implemented in Day 2 & 3
          </p>
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(program.currentConfig?.config_json, null, 2)}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
