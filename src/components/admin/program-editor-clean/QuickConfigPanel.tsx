import { Power, Star, AlertTriangle } from "lucide-react";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProgramModule } from "@/hooks/useProgramRegistry";
import { useState } from "react";

interface QuickConfigPanelProps {
  module?: ProgramModule;
  onUpdate: (updates: Partial<ProgramModule>) => void;
}

export function QuickConfigPanel({ module, onUpdate }: QuickConfigPanelProps) {
  const [showKillSwitchDialog, setShowKillSwitchDialog] = useState(false);

  if (!module) {
    return null;
  }

  const handleKillSwitch = (enabled: boolean) => {
    if (enabled) {
      setShowKillSwitchDialog(true);
    } else {
      onUpdate({ maintenance_mode: false });
    }
  };

  const confirmKillSwitch = () => {
    onUpdate({ 
      maintenance_mode: true,
      status: 'paused'
    });
    setShowKillSwitchDialog(false);
  };

  return (
    <>
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold mb-4">
          Quick Controls
        </h3>
        
        <div className="space-y-4">
          {/* Status */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Status
            </Label>
            <Select
              value={module.status}
              onValueChange={(value) => onUpdate({ status: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Live
                  </div>
                </SelectItem>
                <SelectItem value="paused">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    Paused
                  </div>
                </SelectItem>
                <SelectItem value="draft">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    Draft
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <Label className="text-sm cursor-pointer">
                Featured
              </Label>
            </div>
            <Switch
              checked={module.featured || false}
              onCheckedChange={(checked) => onUpdate({ featured: checked })}
            />
          </div>

          {/* Kill Switch */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <div>
                  <Label className="text-sm block cursor-pointer">
                    Kill Switch
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Instant disable
                  </p>
                </div>
              </div>
            <Switch
              checked={module.maintenance_mode || false}
              onCheckedChange={handleKillSwitch}
            />
            </div>
          </div>
        </div>
      </CleanCard>

      <AlertDialog open={showKillSwitchDialog} onOpenChange={setShowKillSwitchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Enable Kill Switch?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately pause the program and prevent all user access. 
              This action should only be used in emergency situations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmKillSwitch} className="bg-destructive">
              Enable Kill Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
