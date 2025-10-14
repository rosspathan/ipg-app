import { Clock, User, FileText } from "lucide-react";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { useProgramAudit } from "@/hooks/useProgramRegistry";

interface HistoryTabProps {
  moduleId?: string;
}

export function HistoryTab({ moduleId }: HistoryTabProps) {
  const { auditLogs, isLoading } = useProgramAudit(moduleId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[hsl(262_100%_65%)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[hsl(220_9%_65%)]">Loading history...</p>
        </div>
      </div>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <CleanCard padding="lg">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-[hsl(220_9%_46%)] mx-auto mb-4" />
          <p className="text-sm text-[hsl(220_9%_65%)]">
            No history available yet
          </p>
        </div>
      </CleanCard>
    );
  }

  return (
    <div className="space-y-6">
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
          Audit Trail
        </h3>

        <div className="space-y-4">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex gap-4 p-4 bg-[hsl(220_13%_10%)] rounded-lg border border-[hsl(220_13%_14%)]"
            >
              <div className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-[hsl(262_100%_65%/0.1)] flex items-center justify-center">
                  <User className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-sm font-medium text-[hsl(0_0%_98%)]">
                      {log.action}
                    </p>
                    <p className="text-xs text-[hsl(220_9%_65%)]">
                      {log.entity_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[hsl(220_9%_46%)]">
                    <Clock className="w-3 h-3" />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>

                {log.notes && (
                  <p className="text-sm text-[hsl(220_9%_65%)]">
                    {log.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CleanCard>

      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
          Version History
        </h3>
        <div className="text-center py-8">
          <p className="text-sm text-[hsl(220_9%_65%)]">
            Version control coming soon
          </p>
        </div>
      </CleanCard>
    </div>
  );
}
