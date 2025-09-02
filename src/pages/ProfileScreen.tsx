import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

// Profile tab components
import { AccountTab } from "@/components/profile/AccountTab";
import { SecurityTab } from "@/components/profile/SecurityTab";
import { KYCTab } from "@/components/profile/KYCTab";
import { PreferencesTab } from "@/components/profile/PreferencesTab";
import { NotificationsTab } from "@/components/profile/NotificationsTab";
import { WalletsTab } from "@/components/profile/WalletsTab";
import { BeneficiariesTab } from "@/components/profile/BeneficiariesTab";
import { BankingTab } from "@/components/profile/BankingTab";
import { ApiKeysTab } from "@/components/profile/ApiKeysTab";
import { PrivacyTab } from "@/components/profile/PrivacyTab";
import { SessionsTab } from "@/components/profile/SessionsTab";

// Hooks
import { useProfile } from "@/hooks/useProfile";

const ProfileScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "account";
  const { userApp } = useProfile();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const tabs = [
    { value: "account", label: "Account" },
    { value: "security", label: "Security" },
    { value: "kyc", label: "KYC" },
    { value: "preferences", label: "Preferences" },
    { value: "notifications", label: "Notifications" },
    { value: "wallets", label: "Wallets" },
    { value: "beneficiaries", label: "Beneficiaries" },
    { value: "banking", label: "Banking (INR)" },
    { value: "api-keys", label: "API Keys" },
    { value: "privacy", label: "Privacy & Data" },
    { value: "sessions", label: "Sessions" }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and security settings</p>
        </div>
        <div className="flex items-center gap-2">
          {userApp?.account_frozen && (
            <Badge variant="destructive">Account Frozen</Badge>
          )}
        </div>
      </div>

      {userApp?.account_frozen && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your account is currently frozen. Some features may be limited. Contact support for assistance.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid grid-cols-6 lg:grid-cols-11 w-full h-auto gap-1">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap text-xs px-2 py-1"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </CardHeader>

            <div className="p-6">
              <TabsContent value="account" className="mt-0">
                <AccountTab />
              </TabsContent>

              <TabsContent value="security" className="mt-0">
                <SecurityTab />
              </TabsContent>

              <TabsContent value="kyc" className="mt-0">
                <KYCTab />
              </TabsContent>

              <TabsContent value="preferences" className="mt-0">
                <PreferencesTab />
              </TabsContent>

              <TabsContent value="notifications" className="mt-0">
                <NotificationsTab />
              </TabsContent>

              <TabsContent value="wallets" className="mt-0">
                <WalletsTab />
              </TabsContent>

              <TabsContent value="beneficiaries" className="mt-0">
                <BeneficiariesTab />
              </TabsContent>

              <TabsContent value="banking" className="mt-0">
                <BankingTab />
              </TabsContent>

              <TabsContent value="api-keys" className="mt-0">
                <ApiKeysTab />
              </TabsContent>

              <TabsContent value="privacy" className="mt-0">
                <PrivacyTab />
              </TabsContent>

              <TabsContent value="sessions" className="mt-0">
                <SessionsTab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileScreen;