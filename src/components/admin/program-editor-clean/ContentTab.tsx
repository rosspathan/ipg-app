import { Image, FileText, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ProgramModule } from "@/hooks/useProgramRegistry";
import { CleanCard } from "@/components/admin/clean/CleanCard";

interface ContentTabProps {
  module?: ProgramModule;
  onChange: () => void;
}

export function ContentTab({ module, onChange }: ContentTabProps) {
  if (!module) {
    return <div className="text-[hsl(220_9%_65%)]">No module data</div>;
  }

  return (
    <div className="space-y-6">
      {/* Long Description */}
      <div>
        <Label className="text-sm text-[hsl(220_9%_65%)] mb-2">
          Long Description
        </Label>
        <Textarea
          placeholder="Detailed description with markdown support..."
          className="bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%)] min-h-[200px] font-mono text-sm"
        />
        <p className="text-xs text-[hsl(220_9%_46%)] mt-1">
          Supports markdown formatting
        </p>
      </div>

      {/* Media Gallery */}
      <CleanCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)]">
            Media Gallery
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="border-[hsl(220_13%_14%)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Media
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Upload Zone */}
          <div className="aspect-video border-2 border-dashed border-[hsl(220_13%_14%)] rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[hsl(262_100%_65%)] transition-colors cursor-pointer">
            <Image className="w-6 h-6 text-[hsl(220_9%_46%)]" />
            <p className="text-xs text-[hsl(220_9%_46%)]">
              Upload image
            </p>
          </div>
        </div>
      </CleanCard>

      {/* FAQs */}
      <CleanCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)]">
            FAQs
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="border-[hsl(220_13%_14%)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add FAQ
          </Button>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-[hsl(220_13%_10%)] rounded-lg border border-[hsl(220_13%_14%)]">
            <p className="text-sm text-[hsl(220_9%_65%)]">
              No FAQs added yet
            </p>
          </div>
        </div>
      </CleanCard>

      {/* Tags */}
      <div>
        <Label className="text-sm text-[hsl(220_9%_65%)] mb-2">
          Tags
        </Label>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 bg-[hsl(220_13%_10%)] text-[hsl(220_9%_65%)] rounded-full text-xs border border-[hsl(220_13%_14%)]">
            + Add tag
          </span>
        </div>
      </div>
    </div>
  );
}
