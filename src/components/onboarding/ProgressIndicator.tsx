import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepName?: string;
  showBar?: boolean;
  className?: string;
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  stepName,
  showBar = true,
  className
}: ProgressIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Step Text */}
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>
          Step {currentStep} of {totalSteps}
          {stepName && `: ${stepName}`}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>

      {/* Progress Bar */}
      {showBar && (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Step Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              "rounded-full transition-all duration-300",
              index < currentStep
                ? "w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500"
                : index === currentStep - 1
                ? "w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500"
                : "w-2 h-2 bg-white/20"
            )}
            initial={false}
            animate={{
              scale: index === currentStep - 1 ? 1.2 : 1
            }}
          />
        ))}
      </div>
    </div>
  );
}
