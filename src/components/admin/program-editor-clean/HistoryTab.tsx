import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Clock, User, FileText } from "lucide-react";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistoryTabProps {
  moduleId?: string;
}

export function HistoryTab({ moduleId }: HistoryTabProps) {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["program-audit", moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      
      const { data, error } = await supabase
        .from("program_audit")
        .select("*")
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });

  if (!moduleId) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Save program first to view history</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No history yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Changes to this program will appear here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4">
        {auditLogs.map((log) => (
          <CleanCard key={log.id} padding="md">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-4 h-4 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={
                    log.action === 'create' ? 'default' :
                    log.action === 'update' ? 'secondary' :
                    log.action === 'delete' ? 'destructive' :
                    log.action === 'publish' ? 'default' :
                    'outline'
                  }>
                    {log.action}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {log.entity_type}
                  </span>
                </div>
                
                <p className="text-sm font-medium mb-1">
                  {log.notes || `${log.action} ${log.entity_type}`}
                </p>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                  {log.operator_role && (
                    <Badge variant="outline" className="text-xs">
                      {log.operator_role}
                    </Badge>
                  )}
                </div>
                
                {log.diff_json && Object.keys(log.diff_json).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      View changes
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(log.diff_json, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </CleanCard>
        ))}
      </div>
    </ScrollArea>
  );
}
