import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, Shield, CreditCard, Bell, Settings, 
  Users, ChevronRight, ChevronLeft
} from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useAvatar } from "@/hooks/useAvatar";
import { useUserBadge } from "@/hooks/useUserBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DockNav } from "@/components/navigation/DockNav";
import { QuickSwitch } from "@/components/astra/QuickSwitch";
import { MiniIdCardPreview } from "@/components/profile/MiniIdCardPreview";

const profileSections = [
  {
    id: "kyc",
    title: "Identity & KYC",
    description: "Verify your identity",
    icon: User,
    route: "/app/profile/kyc",
    testId: "nav-kyc",
    badge: "Required"
  },
  {
    id: "idcard",
    title: "Avatar & Badge ID",
    description: "Your digital identity card",
    icon: CreditCard,
    route: "/app/profile/id-card",
    testId: "nav-idcard"
  },
  {
    id: "security",
    title: "Security",
    description: "PIN, 2FA, devices & sessions",
    icon: Shield,
    route: "/app/profile/security",
    testId: "nav-security"
  },
  {
    id: "notify",
    title: "Notifications",
    description: "Manage your alerts",
    icon: Bell,
    route: "/app/profile/notify",
    testId: "nav-notify"
  },
  {
    id: "settings",
    title: "App Settings",
    description: "Preferences & language",
    icon: Settings,
    route: "/app/profile/settings",
    testId: "nav-settings"
  },
  {
    id: "referrals",
    title: "Referrals & Invite",
    description: "Share your referral link",
    icon: Users,
    route: "/app/profile/referrals",
    testId: "nav-referrals",
    badge: "Earn"
  }
];

export function ProfileHub() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { userApp } = useProfile();
  const { completion } = useProfileCompletion();
  const { getAvatarUrl } = useAvatar();
  const { badge } = useUserBadge();
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);

  const handleBack = () => {
    navigate("/app/home");
  };

  const handleSignOut = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error('Error signing out:', error);
      navigate("/");
    }
  };

  const handleQuickSwitchAction = (action: string) => {
    switch (action) {
      case "deposit": navigate("/app/wallet/deposit"); break;
      case "convert": navigate("/app/swap"); break;
      case "trade": navigate("/app/trade"); break;
      case "programs": navigate("/app/programs"); break;
    }
  };

  const avatarUrl = getAvatarUrl('1x');
  const displayName = "I-SMART EXCHANGE";
  const completionScore = completion?.completion_score || 0;

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-profile">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-primary/10 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <span className="text-sm font-medium text-foreground">{displayName}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6 pt-6 px-4">
        {/* Premium Glassmorphic ID Card Preview */}
        {user && (
          <MiniIdCardPreview
            avatarUrl={avatarUrl || undefined}
            displayName={displayName}
            email={user.email || ''}
            badge={badge}
            userId={user.id || ''}
          />
        )}

        {/* Profile Completion */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Profile Completion
            </span>
            <span className="text-sm font-bold text-primary">{completionScore}%</span>
          </div>
          <Progress value={completionScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Complete your profile to unlock all features
          </p>
        </Card>

        {/* Profile Sections */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
            Account Center
          </h3>
          
          <Card className="bg-card/60 backdrop-blur-xl border-border/40 overflow-hidden">
            {profileSections.map((section, index) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => navigate(section.route)}
                  data-testid={section.testId}
                  className={`
                    w-full flex items-center justify-between p-4 transition-all duration-[120ms]
                    hover:bg-primary/5 active:bg-primary/10
                    ${index !== profileSections.length - 1 ? "border-b border-border/20" : ""}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{section.title}</span>
                        {section.badge && (
                          <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </Card>
        </div>

        {/* Sign Out Button */}
        <div className="pt-4 pb-6">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full h-12 border-danger/30 text-danger hover:bg-danger/10 hover:border-danger/50"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <DockNav
        onNavigate={navigate}
        onCenterPress={() => setShowQuickSwitch(true)}
      />

      {/* Quick Switch */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={handleQuickSwitchAction}
      />
    </div>
  );
}