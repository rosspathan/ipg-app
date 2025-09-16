import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, ArrowUpFromLine, Banknote, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useINRFunding } from "@/hooks/useINRFunding";
import { useBanking } from "@/hooks/useBanking";
import { useKYC } from "@/hooks/useKYC";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const QuickINRActions = () => {
  const { status: fundingStatus, settings } = useINRFunding();
  const { bankingDetails } = useBanking();
  const { kycProfile } = useKYC();

  const isKYCVerified = kycProfile?.status === 'verified';
  const isBankingVerified = bankingDetails?.verified;
  const isINREnabled = fundingStatus === 'ready' && settings?.enabled;

  const canDeposit = isINREnabled;
  const canWithdraw = isKYCVerified && isBankingVerified && isINREnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          INR Operations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isINREnabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              INR operations are currently unavailable. Please contact support.
            </AlertDescription>
          </Alert>
        )}

        {isINREnabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button asChild variant="outline" disabled={!canDeposit}>
                <Link to="/app/deposit/inr" className="flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4" />
                  INR Deposit
                </Link>
              </Button>

              <Button asChild variant="outline" disabled={!canWithdraw}>
                <Link to="/app/withdraw/inr" className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-4 w-4" />
                  INR Withdraw
                </Link>
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>KYC Status:</span>
                <Badge variant={isKYCVerified ? "default" : "secondary"}>
                  {isKYCVerified ? "Verified" : "Pending"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Banking Details:</span>
                <Badge variant={isBankingVerified ? "default" : "secondary"}>
                  {isBankingVerified ? "Verified" : "Pending"}
                </Badge>
              </div>

              {settings && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Min Deposit: ₹{settings.min_deposit?.toLocaleString()} | 
                  Fee: {settings.fee_percent}% + ₹{settings.fee_fixed}
                </div>
              )}
            </div>

            {!canWithdraw && isINREnabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {!isKYCVerified && !isBankingVerified && "Complete KYC verification and add banking details to enable withdrawals."}
                  {!isKYCVerified && isBankingVerified && "Complete KYC verification to enable withdrawals."}
                  {isKYCVerified && !isBankingVerified && "Add and verify banking details to enable withdrawals."}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};