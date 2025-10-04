import { CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface ExecutionStatus {
  type: "success" | "error" | "processing";
  message: string;
  details?: string;
}

interface ExecStatusBarProps {
  status: ExecutionStatus | null;
  onDismiss: () => void;
}

export function ExecStatusBar({ status, onDismiss }: ExecStatusBarProps) {
  if (!status) return null;

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-success" />,
    error: <XCircle className="h-5 w-5 text-destructive" />,
    processing: <Loader2 className="h-5 w-5 text-primary animate-spin" />
  };

  const bgColors = {
    success: "bg-success/10 border-success/30",
    error: "bg-destructive/10 border-destructive/30",
    processing: "bg-primary/10 border-primary/30"
  };

  return (
    <div 
      data-testid="exec-status"
      className="fixed bottom-20 left-4 right-4 z-40 animate-slide-in-right"
    >
      <Card className={`p-4 ${bgColors[status.type]} border shadow-lg`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {icons[status.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {status.message}
            </p>
            {status.details && (
              <p className="text-xs text-muted-foreground mt-1">
                {status.details}
              </p>
            )}
          </div>
          {status.type !== "processing" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
