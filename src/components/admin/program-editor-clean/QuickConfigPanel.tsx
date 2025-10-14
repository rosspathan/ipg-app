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
import { ProgramModule } from "@/hooks/useProgramRegistry";

interface QuickConfigPanelProps {
  module?: ProgramModule;
  onUpdate: (updates: Partial<ProgramModule>) => void;
}

export function QuickConfigPanel({ module, onUpdate }: QuickConfigPanelProps) {
  if (!module) {
    return null;
  }

  return (
    <CleanCard padding="lg">
      <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
        Quick Controls
      </h3>
      
      <div className="space-y-4">
        {/* Status */}
        <div>
          <Label className="text-xs text-[hsl(220_9%_65%)] mb-2 block">
            Status
          </Label>
          <Select
            value={module.status}
            onValueChange={(value) => onUpdate({ status: value as any })}
          >
            <SelectTrigger className="bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="live">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[hsl(142_71%_45%)]" />
                  Live
                </div>
              </SelectItem>
              <SelectItem value="paused">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[hsl(38_92%_50%)]" />
                  Paused
                </div>
              </SelectItem>
              <SelectItem value="draft">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[hsl(220_9%_46%)]" />
                  Draft
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Featured Toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[hsl(38_92%_50%)]" />
            <Label className="text-sm text-[hsl(0_0%_98%)] cursor-pointer">
              Featured
            </Label>
          </div>
          <Switch
            checked={false}
            disabled
          />
        </div>

        {/* Kill Switch */}
        <div className="border-t border-[hsl(220_13%_14%)] pt-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <div>
                <Label className="text-sm text-[hsl(0_0%_98%)] block cursor-pointer">
                  Kill Switch
                </Label>
                <p className="text-xs text-[hsl(220_9%_65%)]">
                  Instant disable
                </p>
              </div>
            </div>
            <Switch
              checked={false}
              disabled
            />
          </div>
        </div>
      </div>
    </CleanCard>
  );
}
