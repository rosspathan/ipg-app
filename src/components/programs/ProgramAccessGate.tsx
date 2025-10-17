import { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock, AlertTriangle } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { useProgramAccess } from "@/hooks/useProgramAccess";
import { Skeleton } from "@/components/ui/skeleton";

interface ProgramAccessGateProps {
  programKey: string;
  requiredBalance?: number;
  children: ReactNode;
  title?: string;
}

/**
 * Component that blocks access to programs if user has insufficient balance
 * Shows loading state, error message with "Add Funds" CTA
 */
export function ProgramAccessGate({
  programKey,
  requiredBalance,
  children,
  title = "Program Access"
}: ProgramAccessGateProps) {
  const { navigate } = useNavigation();
  const { hasAccess, reason, requiredBalance: configRequired, userBalance, loading } = useProgramAccess(
    programKey,
    requiredBalance
  );

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-md w-full space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Insufficient Balance
            </AlertTitle>
            <AlertDescription className="space-y-4 mt-4">
              <div>
                <p className="text-sm mb-2">{reason}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-destructive/10 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Your Balance</p>
                    <p className="font-bold">{userBalance?.toFixed(2)} BSK</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Required</p>
                    <p className="font-bold">{configRequired?.toFixed(2)} BSK</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate("/app/wallet/deposit")}
                  className="flex-1"
                >
                  Add Funds
                </Button>
                <Button 
                  onClick={() => navigate("/app/home")}
                  variant="outline"
                  className="flex-1"
                >
                  Go Back
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          <div className="text-center text-sm text-muted-foreground">
            <p>Need help? Contact support for assistance.</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
