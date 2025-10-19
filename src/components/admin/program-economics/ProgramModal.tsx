import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProgramWithConfig } from "@/hooks/useProgramEconomics";
import { LuckyDrawForm } from "./forms/LuckyDrawForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface ProgramModalProps {
  program: ProgramWithConfig;
  isOpen: boolean;
  onClose: () => void;
  onRefetch: () => void;
}

export function ProgramModal({ program, isOpen, onClose, onRefetch }: ProgramModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      // Update program config
      const { error: updateError } = await supabase
        .from("program_configs")
        .update({
          config_json: data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", program.currentConfig?.id);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from("program_audit").insert({
        module_id: program.id,
        config_id: program.currentConfig?.id,
        action: "update",
        entity_type: "config",
        operator_id: (await supabase.auth.getUser()).data.user?.id,
        after_json: data,
        notes: `Updated ${program.name} configuration`,
      });

      toast({
        title: "Success",
        description: "Program configuration saved successfully",
      });

      onRefetch();
      onClose();
    } catch (error: any) {
      console.error("Error saving program:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if program has participations (pool size should be locked)
  const hasParticipations = (program.currentConfig?.config_json as any)?.current_participants > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {program.name}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {program.key === "lucky-draw" && (
            <LuckyDrawForm
              initialData={program.currentConfig?.config_json as any || {}}
              onSubmit={handleSave}
              hasParticipations={hasParticipations}
              isSubmitting={isSubmitting}
            />
          )}

          {program.key === "spin-wheel" && (
            <div className="py-6 text-center text-muted-foreground">
              <p>Spin Wheel form will be implemented in Day 3</p>
            </div>
          )}

          {program.key === "ad-mining" && (
            <div className="py-6 text-center text-muted-foreground">
              <p>Ad Mining form will be implemented in Day 3</p>
            </div>
          )}

          {!["lucky-draw", "spin-wheel", "ad-mining"].includes(program.key) && (
            <div className="py-6">
              <p className="text-muted-foreground">
                Editor for this program type is not yet available
              </p>
              <div className="mt-4 p-4 rounded-lg bg-muted/50">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(program.currentConfig?.config_json, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
