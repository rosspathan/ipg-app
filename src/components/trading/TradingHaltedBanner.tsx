import React from "react";
import { AlertTriangle, ShieldOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TradingHaltedBannerProps {
  circuitBreakerActive: boolean;
  autoMatchingEnabled: boolean;
}

const TradingHaltedBanner: React.FC<TradingHaltedBannerProps> = ({
  circuitBreakerActive,
  autoMatchingEnabled,
}) => {
  if (!circuitBreakerActive && autoMatchingEnabled) {
    return null;
  }

  const reason = circuitBreakerActive
    ? "Circuit breaker has been triggered due to unusual market activity."
    : "Order matching is currently disabled.";

  return (
    <Alert variant="destructive" className="mb-4 border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <ShieldOff className="h-4 w-4" />
        Trading Temporarily Halted
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p>{reason}</p>
        <p className="text-xs mt-1 opacity-80">
          Orders placed now will remain pending until trading resumes. Please wait or contact support.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default TradingHaltedBanner;
