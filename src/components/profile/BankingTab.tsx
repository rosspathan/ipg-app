import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Banknote, CheckCircle, XCircle, Info } from "lucide-react";
import { useBanking } from "@/hooks/useBanking";
import { Link } from "react-router-dom";

interface BankingFormData {
  account_name: string;
  account_number: string;
  ifsc: string;
  bank_name: string;
  upi_id: string;
}

export const BankingTab = () => {
  const { bankingDetails, loading, updateBankingDetails } = useBanking();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<BankingFormData>({
    defaultValues: {
      account_name: bankingDetails?.account_name || '',
      account_number: bankingDetails?.account_number || '',
      ifsc: bankingDetails?.ifsc || '',
      bank_name: bankingDetails?.bank_name || '',
      upi_id: bankingDetails?.upi_id || '',
    }
  });

  const onSubmit = async (data: BankingFormData) => {
    try {
      setSaving(true);
      await updateBankingDetails(data);
    } catch (error) {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const isVerified = bankingDetails?.verified;
  const hasDetails = bankingDetails && (
    bankingDetails.account_number || 
    bankingDetails.upi_id
  );
  const isLocked = !!hasDetails; // Lock once details are saved

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              <span>INR Banking Details</span>
            </div>
            {hasDetails && (
              <Badge variant={isVerified ? "default" : "secondary"} className={isVerified ? "bg-green-100 text-green-800" : ""}>
                {isVerified ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Pending Verification
                  </>
                )}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isVerified && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your banking details have been verified. You can now make INR deposits and withdrawals.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Holder Name</Label>
                  <Input
                    id="account_name"
                    {...register("account_name", { required: "Account name is required" })}
                    disabled={isLocked}
                  />
                {errors.account_name && (
                  <p className="text-sm text-destructive">{errors.account_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    {...register("account_number", { 
                      required: "Account number is required",
                      pattern: {
                        value: /^\d{9,18}$/,
                        message: "Invalid account number format"
                      }
                    })}
                    disabled={isLocked}
                  />
                {errors.account_number && (
                  <p className="text-sm text-destructive">{errors.account_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifsc">IFSC Code</Label>
                  <Input
                    id="ifsc"
                    {...register("ifsc", { 
                      required: "IFSC code is required",
                      pattern: {
                        value: /^[A-Z]{4}0[A-Z0-9]{6}$/,
                        message: "Invalid IFSC code format"
                      }
                    })}
                    placeholder="e.g., SBIN0001234"
                    disabled={isLocked}
                  />
                {errors.ifsc && (
                  <p className="text-sm text-destructive">{errors.ifsc.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    {...register("bank_name", { required: "Bank name is required" })}
                    placeholder="e.g., State Bank of India"
                    disabled={isLocked}
                  />
                {errors.bank_name && (
                  <p className="text-sm text-destructive">{errors.bank_name.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="upi_id">UPI ID (Optional)</Label>
                  <Input
                    id="upi_id"
                    {...register("upi_id", {
                      pattern: {
                        value: /^[\w.-]+@[\w.-]+$/,
                        message: "Invalid UPI ID format"
                      }
                    })}
                    placeholder="e.g., yourname@paytm"
                    disabled={isLocked}
                  />
                {errors.upi_id && (
                  <p className="text-sm text-destructive">{errors.upi_id.message}</p>
                )}
              </div>
            </div>

            {!hasDetails && (
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Banking Details
              </Button>
            )}
          </form>

          {hasDetails && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Banking details cannot be modified once saved for security reasons. Contact support if you need to make changes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>INR Deposits & Withdrawals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {isVerified ? (
                  <div className="space-y-2">
                    <p>Your banking details are verified. You can now make INR deposits and withdrawals.</p>
                    <div className="flex gap-2">
                      <Link to="/app/deposit/inr" className="text-primary hover:underline">
                        Make a Deposit →
                      </Link>
                      <Link to="/app/withdraw/inr" className="text-primary hover:underline">
                        Make a Withdrawal →
                      </Link>
                    </div>
                  </div>
                ) : (
                  "Complete and verify your banking details to enable INR deposits and withdrawals."
                )}
              </AlertDescription>
            </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">Supported Payment Methods:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Bank Transfer (IMPS/NEFT/RTGS)</li>
              <li>• UPI Payments</li>
              <li>• Net Banking</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Verification Process:</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Enter your banking details accurately</li>
              <li>2. Our team will verify the information</li>
              <li>3. Verification usually takes 1-2 business days</li>
              <li>4. You'll be notified once verification is complete</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};