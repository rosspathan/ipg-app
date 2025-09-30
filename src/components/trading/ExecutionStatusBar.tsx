import { CheckCircle2, XCircle, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ExecutionStatus {
  type: "success" | "error" | "processing";
  message: string;
  details?: string;
}

interface ExecutionStatusBarProps {
  status: ExecutionStatus | null;
  onDismiss: () => void;
}

export function ExecutionStatusBar({ status, onDismiss }: ExecutionStatusBarProps) {
  if (!status) return null;

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-success" />,
    error: <XCircle className="h-5 w-5 text-destructive" />,
    processing: <Clock className="h-5 w-5 text-primary animate-pulse" />
  };

  const bgColors = {
    success: "bg-success/10 border-success/30",
    error: "bg-destructive/10 border-destructive/30",
    processing: "bg-primary/10 border-primary/30"
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-24 left-4 right-4 z-50"
        data-testid="exec-status"
      >
        <div className={`rounded-xl border p-4 backdrop-blur-lg shadow-lg ${bgColors[status.type]}`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{icons[status.type]}</div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">
                {status.message}
              </p>
              {status.details && (
                <p className="text-xs text-muted-foreground mt-1">
                  {status.details}
                </p>
              )}
            </div>

            {status.type !== "processing" && (
              <button
                onClick={onDismiss}
                className="hover:bg-background/20 rounded-lg p-1 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
