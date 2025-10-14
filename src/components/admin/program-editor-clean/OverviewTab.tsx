import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProgramModule } from "@/hooks/useProgramRegistry";
import { CleanCard } from "@/components/admin/clean/CleanCard";

interface OverviewTabProps {
  module?: ProgramModule;
  onChange: () => void;
}

export function OverviewTab({ module, onChange }: OverviewTabProps) {
  if (!module) {
    return <div className="text-[hsl(220_9%_65%)]">No module data</div>;
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm text-[hsl(220_9%_65%)] mb-2">
            Program Name *
          </Label>
          <Input
            value={module.name}
            placeholder="Enter program name"
            className="bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%)]"
          />
        </div>

        <div>
          <Label className="text-sm text-[hsl(220_9%_65%)] mb-2">
            Program Key *
          </Label>
          <Input
            value={module.key}
            placeholder="program-key-slug"
            className="bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%)] font-mono"
          />
          <p className="text-xs text-[hsl(220_9%_46%)] mt-1">
            Unique identifier for this program
          </p>
        </div>

        <div>
          <Label className="text-sm text-[hsl(220_9%_65%)] mb-2">
            Description
          </Label>
          <Textarea
            value={module.description || ""}
            placeholder="Describe what this program does..."
            className="bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%)] min-h-[100px]"
          />
        </div>
      </div>

      {/* Visual Assets */}
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
          Visual Assets
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Icon Upload */}
          <div>
            <Label className="text-xs text-[hsl(220_9%_65%)] mb-2 block">
              Program Icon
            </Label>
            <div className="aspect-square border-2 border-dashed border-[hsl(220_13%_14%)] rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[hsl(262_100%_65%)] transition-colors cursor-pointer">
              <Upload className="w-6 h-6 text-[hsl(220_9%_46%)]" />
              <p className="text-xs text-[hsl(220_9%_46%)]">
                Click to upload
              </p>
              <p className="text-xs text-[hsl(220_9%_46%)]">
                1:1 ratio
              </p>
            </div>
          </div>

          {/* Banner Upload */}
          <div>
            <Label className="text-xs text-[hsl(220_9%_65%)] mb-2 block">
              Banner Image
            </Label>
            <div className="aspect-square border-2 border-dashed border-[hsl(220_13%_14%)] rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[hsl(262_100%_65%)] transition-colors cursor-pointer">
              <Upload className="w-6 h-6 text-[hsl(220_9%_46%)]" />
              <p className="text-xs text-[hsl(220_9%_46%)]">
                Click to upload
              </p>
              <p className="text-xs text-[hsl(220_9%_46%)]">
                16:9 ratio
              </p>
            </div>
          </div>
        </div>
      </CleanCard>

      {/* Region & Role Settings */}
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
          Availability
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-[hsl(220_9%_65%)] mb-2 block">
              Enabled Regions
            </Label>
            <div className="flex flex-wrap gap-2">
              {['India', 'USA', 'UK', 'Global'].map((region) => (
                <button
                  key={region}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-[hsl(262_100%_65%/0.2)] text-[hsl(262_100%_65%)] border border-[hsl(262_100%_65%/0.4)]"
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-[hsl(220_9%_65%)] mb-2 block">
              Enabled Roles
            </Label>
            <div className="flex flex-wrap gap-2">
              {['User', 'VIP', 'Premium'].map((role) => (
                <button
                  key={role}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-[hsl(142_71%_45%/0.2)] text-[hsl(142_71%_45%)] border border-[hsl(142_71%_45%/0.4)]"
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CleanCard>
    </div>
  );
}
