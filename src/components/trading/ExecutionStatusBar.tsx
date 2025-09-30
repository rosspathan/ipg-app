import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface ExecutionStatus {
  type: "success" | "error" | "warning" | "processing";
  message: string;
  details?: string;
}

interface ExecutionStatusBarProps {
  status: ExecutionStatus | null;
  onDismiss?: () => void;
}

export function ExecutionStatusBar({ status, onDismiss }: ExecutionStatusBarProps) {
  if (!status) return null;

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    processing: Loader2
  };

  const Icon = icons[status.type];

  const variants = {
    success: "default",
    error: "destructive",
    warning: "default",
    processing: "default"
  } as const;

  return (
    <div 
      className="fixed bottom-20 left-4 right-4 z-50 animate-slide-in-up"
      data-testid="exec-status"
    >
      <Alert 
        variant={variants[status.type]}
        className={`shadow-lg ${
          status.type === "success" ? "border-green-500 bg-green-500/10" :
          status.type === "error" ? "border-red-500 bg-red-500/10" :
          status.type === "warning" ? "border-yellow-500 bg-yellow-500/10" :
          "border-primary bg-primary/10"
        }`}
      >
        <Icon className={`h-4 w-4 ${
          status.type === "processing" ? "animate-spin" : ""
        }`} />
        <AlertDescription className="ml-2">
          <div className="font-medium">{status.message}</div>
          {status.details && (
            <div className="text-xs text-muted-foreground mt-1">{status.details}</div>
          )}
        </AlertDescription>
        {onDismiss && status.type !== "processing" && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </Alert>
    </div>
  );
}
