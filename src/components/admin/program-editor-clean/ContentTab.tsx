import { Image, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ProgramModule } from "@/hooks/useProgramRegistry";
import { CleanCard } from "@/components/admin/clean/CleanCard";

interface ContentTabProps {
  module?: ProgramModule;
  onChange: (updates: Partial<ProgramModule>) => void;
}

export function ContentTab({ module, onChange }: ContentTabProps) {
  if (!module) {
    return <div className="text-muted-foreground">No module data</div>;
  }

  return (
    <div className="space-y-6">
      {/* Long Description */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2">
          Long Description
        </Label>
        <Textarea
          value={module.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Detailed description with markdown support..."
          className="min-h-[200px] font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Supports markdown formatting
        </p>
      </div>

      {/* Media Gallery */}
      <CleanCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">
            Media Gallery
          </h3>
          <Button
            size="sm"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Media
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Upload Zone */}
          <div className="aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors cursor-pointer">
            <Image className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Upload image
            </p>
          </div>
        </div>
      </CleanCard>

      {/* FAQs */}
      <CleanCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">
            FAQs
          </h3>
          <Button
            size="sm"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add FAQ
          </Button>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-muted rounded-lg border">
            <p className="text-sm text-muted-foreground">
              No FAQs added yet
            </p>
          </div>
        </div>
      </CleanCard>

      {/* Tags */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2">
          Tags
        </Label>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs border cursor-pointer hover:bg-muted/80">
            + Add tag
          </span>
        </div>
      </div>
    </div>
  );
}
