import { CheckCircle2, Circle, Clock, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export type TransactionStatus = 
  | 'pending'
  | 'confirming'
  | 'processing'
  | 'completed'
  | 'failed';

interface StatusStep {
  label: string;
  status: TransactionStatus;
  description?: string;
}

interface TransactionStatusTrackerProps {
  currentStatus: TransactionStatus;
  confirmations?: number;
  requiredConfirmations?: number;
  txHash?: string;
  explorerUrl?: string;
  estimatedTime?: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
}

const getSteps = (type: 'deposit' | 'withdrawal' | 'transfer'): StatusStep[] => {
  if (type === 'deposit') {
    return [
      { label: 'Transaction Detected', status: 'pending', description: 'Found on blockchain' },
      { label: 'Confirming', status: 'confirming', description: 'Waiting for confirmations' },
      { label: 'Processing', status: 'processing', description: 'Crediting your account' },
      { label: 'Completed', status: 'completed', description: 'Balance updated' },
    ];
  }
  if (type === 'withdrawal') {
    return [
      { label: 'Request Submitted', status: 'pending', description: 'Processing your request' },
      { label: 'Signing Transaction', status: 'processing', description: 'Preparing blockchain tx' },
      { label: 'Broadcasting', status: 'confirming', description: 'Sent to network' },
      { label: 'Completed', status: 'completed', description: 'Funds sent' },
    ];
  }
  return [
    { label: 'Initiated', status: 'pending', description: 'Starting transfer' },
    { label: 'Completed', status: 'completed', description: 'Transfer complete' },
  ];
};

const statusOrder: TransactionStatus[] = ['pending', 'confirming', 'processing', 'completed'];

export function TransactionStatusTracker({
  currentStatus,
  confirmations = 0,
  requiredConfirmations = 12,
  txHash,
  explorerUrl,
  estimatedTime,
  type
}: TransactionStatusTrackerProps) {
  const steps = getSteps(type);
  const currentStepIndex = statusOrder.indexOf(currentStatus);
  const isFailed = currentStatus === 'failed';

  return (
    <div className="space-y-4">
      {/* Progress Steps */}
      <div className="relative">
        {steps.map((step, index) => {
          const stepIndex = statusOrder.indexOf(step.status);
          const isComplete = !isFailed && currentStepIndex > stepIndex;
          const isCurrent = !isFailed && currentStepIndex === stepIndex;
          const isPending = !isFailed && currentStepIndex < stepIndex;

          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-start gap-3 pb-4 last:pb-0",
                index !== steps.length - 1 && "border-l-2 ml-3 pl-6 -translate-x-3",
                isComplete && "border-primary",
                isCurrent && "border-primary/50",
                isPending && "border-muted"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center -ml-6",
                isComplete && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary/20 text-primary",
                isPending && "bg-muted text-muted-foreground",
                isFailed && index === currentStepIndex && "bg-destructive/20 text-destructive"
              )}>
                <AnimatePresence mode="wait">
                  {isComplete && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </motion.div>
                  )}
                  {isCurrent && !isFailed && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-4 h-4" />
                    </motion.div>
                  )}
                  {isPending && <Circle className="w-4 h-4" />}
                  {isFailed && index === currentStepIndex && <XCircle className="w-4 h-4" />}
                </AnimatePresence>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium",
                  isComplete && "text-foreground",
                  isCurrent && "text-foreground",
                  isPending && "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                
                {/* Confirmation progress for confirming step */}
                {isCurrent && step.status === 'confirming' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(confirmations / requiredConfirmations) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {confirmations}/{requiredConfirmations}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Transaction Details */}
      {(txHash || estimatedTime) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-3 border-t border-border space-y-2"
        >
          {txHash && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Transaction ID</span>
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline"
                >
                  {txHash.slice(0, 8)}...{txHash.slice(-6)}
                </a>
              ) : (
                <span className="font-mono text-foreground">
                  {txHash.slice(0, 8)}...{txHash.slice(-6)}
                </span>
              )}
            </div>
          )}
          {estimatedTime && currentStatus !== 'completed' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Est. Time
              </span>
              <span className="text-foreground">{estimatedTime}</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
