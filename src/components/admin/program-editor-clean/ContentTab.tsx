import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProgramModule } from "@/hooks/useProgramRegistry";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { MediaGallery } from "./MediaGallery";
import { FAQManager } from "./FAQManager";
import { TagsManager } from "./TagsManager";

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
        <MediaGallery
          moduleId={module.id}
          images={module.media_gallery || []}
          onChange={(images) => onChange({ media_gallery: images })}
        />
      </CleanCard>

      {/* FAQs */}
      <CleanCard padding="lg">
        <FAQManager
          faqs={module.faqs || []}
          onChange={(faqs) => onChange({ faqs })}
        />
      </CleanCard>

      {/* Tags */}
      <CleanCard padding="lg">
        <TagsManager
          tags={module.tags || []}
          onChange={(tags) => onChange({ tags })}
        />
      </CleanCard>
    </div>
  );
}
