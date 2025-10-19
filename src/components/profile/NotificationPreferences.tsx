import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function NotificationPreferences() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  const preferenceOptions = [
    {
      key: "email_on_kyc_decision" as const,
      label: "KYC Decisions",
      description: "Receive emails when your KYC verification is approved or requires attention",
    },
    {
      key: "email_on_withdrawal_decision" as const,
      label: "Withdrawal Updates",
      description: "Get notified when your withdrawal requests are processed",
    },
    {
      key: "email_on_deposit_confirmation" as const,
      label: "Deposit Confirmations",
      description: "Receive confirmation emails when deposits are credited to your account",
    },
    {
      key: "email_on_loan_decision" as const,
      label: "Loan Decisions",
      description: "Get updates on your loan applications and approvals",
    },
    {
      key: "email_on_insurance_claim" as const,
      label: "Insurance Claims",
      description: "Receive notifications about your insurance claim decisions",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Manage your email notification preferences for various account activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {preferenceOptions.map((option) => (
          <div key={option.key} className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor={option.key} className="text-base font-medium cursor-pointer">
                {option.label}
              </Label>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </div>
            <Switch
              id={option.key}
              checked={preferences[option.key]}
              onCheckedChange={(checked) => {
                updatePreferences({ [option.key]: checked });
              }}
              disabled={isUpdating}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
