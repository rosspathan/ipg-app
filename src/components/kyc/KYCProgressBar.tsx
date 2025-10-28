import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface KYCProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{ title: string; description: string }>;
}

export const KYCProgressBar = ({ currentStep, totalSteps, steps }: KYCProgressBarProps) => {
  return (
    <div className="w-full mb-8">
      {/* Progress percentage */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-muted-foreground">
          {Math.round((currentStep / totalSteps) * 100)}% Complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden mb-6">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="hidden md:flex justify-between gap-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div
              key={index}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 transition-all duration-300",
                isCurrent && "scale-105"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground shadow-lg",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isUpcoming && "bg-secondary text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
              </div>
              <div className="text-center">
                <div
                  className={cn(
                    "text-xs font-medium transition-colors",
                    (isCurrent || isCompleted) && "text-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </div>
                <div className="text-[10px] text-muted-foreground hidden lg:block">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
