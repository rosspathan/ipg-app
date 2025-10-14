import { X, Monitor, Smartphone } from "lucide-react";
import { ProgramModule } from "@/hooks/useProgramRegistry";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Button } from "@/components/ui/button";

interface ProgramPreviewModalProps {
  module: ProgramModule;
  onClose: () => void;
}

export function ProgramPreviewModal({ module, onClose }: ProgramPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CleanCard padding="lg" className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[hsl(0_0%_98%)]">
                Program Preview
              </h2>
              <p className="text-sm text-[hsl(220_9%_65%)]">
                How users will see this program
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="border-[hsl(220_13%_14%)]"
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-[hsl(220_13%_14%)]"
              >
                <Smartphone className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-[hsl(220_9%_65%)] hover:text-[hsl(0_0%_98%)]"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="bg-[hsl(220_13%_4%)] rounded-lg p-8 border border-[hsl(220_13%_14%)]">
            <div className="max-w-2xl mx-auto">
              {/* Program Card Preview */}
              <div className="bg-[hsl(220_13%_7%)] rounded-xl border border-[hsl(220_13%_14%/0.4)] p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-lg bg-[hsl(262_100%_65%/0.1)] flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[hsl(0_0%_98%)] mb-2">
                      {module.name}
                    </h3>
                    <p className="text-sm text-[hsl(220_9%_65%)]">
                      {module.description || "No description provided"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      module.status === 'live'
                        ? 'bg-[hsl(142_71%_45%/0.2)] text-[hsl(142_71%_45%)]'
                        : 'bg-[hsl(220_13%_10%)] text-[hsl(220_9%_46%)]'
                    }`}>
                      {module.status}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-[hsl(220_13%_14%)]">
                  <Button className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_70%)] text-white">
                    Participate Now
                  </Button>
                  <Button variant="outline" className="border-[hsl(220_13%_14%)]">
                    Learn More
                  </Button>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 p-4 bg-[hsl(220_13%_10%)] rounded-lg border border-[hsl(220_13%_14%)]">
                <p className="text-xs text-[hsl(220_9%_65%)] text-center">
                  This is a preview of how the program card will appear to eligible users
                </p>
              </div>
            </div>
          </div>
        </CleanCard>
      </div>
    </div>
  );
}
