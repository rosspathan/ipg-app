import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  ArrowLeft, 
  User, 
  Shield, 
  FileCheck, 
  Bell, 
  Wallet, 
  Lock, 
  Monitor,
  Banknote
} from "lucide-react";

// Profile tab components
import { AccountTab } from "@/components/profile/AccountTab";
import SecurityTab from "@/components/profile/SecurityTab";
import { KYCTab } from "@/components/profile/KYCTab";
import { PreferencesTab } from "@/components/profile/PreferencesTab";
import { NotificationsTab } from "@/components/profile/NotificationsTab";
import { WalletsTab } from "@/components/profile/WalletsTab";
import { BankingTab } from "@/components/profile/BankingTab";
import { ApiKeysTab } from "@/components/profile/ApiKeysTab";
import { PrivacyTab } from "@/components/profile/PrivacyTab";
import { SessionsTab } from "@/components/profile/SessionsTab";

// Hooks
import { useProfile } from "@/hooks/useProfile";

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { userApp } = useProfile();
  const [openSections, setOpenSections] = useState<string[]>(["account"]);

  const handleBack = () => {
    navigate(-1);
  };

  const profileSections = [
    {
      id: "account",
      title: "Account",
      description: "Personal information and preferences",
      icon: User,
      component: <AccountTab />
    },
    {
      id: "security",
      title: "Security",
      description: "PIN, biometrics, and authentication",
      icon: Shield,
      component: <SecurityTab />
    },
    {
      id: "kyc",
      title: "KYC Verification",
      description: "Identity verification status",
      icon: FileCheck,
      component: <KYCTab />
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Push and email preferences",
      icon: Bell,
      component: <NotificationsTab />
    },
    {
      id: "wallets",
      title: "Wallets",
      description: "Cryptocurrency wallet addresses",
      icon: Wallet,
      component: <WalletsTab />
    },
    {
      id: "banking",
      title: "Banking (INR)",
      description: "Bank account details for deposits",
      icon: Banknote,
      component: <BankingTab />
    },
    {
      id: "privacy",
      title: "Privacy & Data",
      description: "Data export and account deletion",
      icon: Lock,
      component: <PrivacyTab />
    },
    {
      id: "sessions",
      title: "Active Sessions",
      description: "Manage device sessions",
      icon: Monitor,
      component: <SessionsTab />
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Mobile Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="h-10 w-10 hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold leading-tight">Profile Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your account</p>
          </div>
          
          <div className="w-10 flex justify-center">
            {userApp?.account_status === 'frozen' && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                Frozen
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Account Frozen Alert */}
        {userApp?.account_status === 'frozen' && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Account frozen. Some features may be limited. Contact support for assistance.
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Sections Accordion */}
        <Accordion 
          type="multiple" 
          value={openSections} 
          onValueChange={setOpenSections}
          className="space-y-3"
        >
          {profileSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border border-border/50 rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-accent/20 transition-colors">
                  <div className="flex items-center gap-3 text-left">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base leading-tight">{section.title}</h3>
                      <p className="text-sm text-muted-foreground leading-tight mt-0.5">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="mt-3 border-t border-border/30 pt-4">
                    {section.component}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Bottom Safe Area */}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default ProfileScreen;