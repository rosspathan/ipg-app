import React from 'react';
import { Check } from 'lucide-react';

interface PasswordResetProgressProps {
  currentStep: 1 | 2 | 3;
}

export const PasswordResetProgress: React.FC<PasswordResetProgressProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Email' },
    { number: 2, label: 'Verify' },
    { number: 3, label: 'Reset' },
  ];

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step.number < currentStep
                    ? 'bg-green-500 text-white'
                    : step.number === currentStep
                    ? 'bg-white text-primary ring-4 ring-white/30'
                    : 'bg-white/20 text-white/50'
                }`}
              >
                {step.number < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-xs mt-2 font-medium ${
                  step.number <= currentStep ? 'text-white' : 'text-white/50'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded transition-all ${
                  step.number < currentStep ? 'bg-green-500' : 'bg-white/20'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
