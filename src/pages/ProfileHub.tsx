import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, Shield, CreditCard, Bell, Settings, 
  Users, ChevronRight, ChevronLeft, Gift
} from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useAvatar } from "@/hooks/useAvatar";
import { useUserBadge } from "@/hooks/useUserBadge";
import { useUsername } from "@/hooks/useUsername";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DockNav } from "@/components/navigation/DockNav";
import { QuickSwitch } from "@/components/astra/QuickSwitch";
import { MiniIdCardPreview } from "@/components/profile/MiniIdCardPreview";
import { useUsernameBackfill } from "@/hooks/useUsernameBackfill";
import { supabase } from "@/integrations/supabase/client";

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
    description: "Share your referral code",
    icon: Users,
    route: "/app/profile/referrals",
    testId: "nav-referrals",
    badge: "Earn"
  }
];

export function ProfileHub() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthUser();
  const { userApp } = useProfile();
  const { completion } = useProfileCompletion();
  const { getAvatarUrl } = useAvatar();
  const { badge } = useUserBadge();
  const username = useUsername();
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);
  const [canClaimReferral, setCanClaimReferral] = useState(false);
  const [kycStatus, setKycStatus] = useState<'draft' | 'submitted' | 'approved' | 'rejected' | null>(null);
  
  // Fetch KYC status
  useEffect(() => {
    const fetchKYCStatus = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('kyc_profiles_new')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (!error && data) {
        setKycStatus(data.status as any);
      }
    };
    
    fetchKYCStatus();
  }, [user]);
  
  // Get dynamic KYC badge based on status
  const getKYCBadge = () => {
    if (kycStatus === 'approved') {
      return { text: "Approved", className: "bg-green-500/10 text-green-600 border-green-500/30" };
    }
    if (kycStatus === 'submitted') {
      return { text: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
    }
    if (kycStatus === 'rejected') {
      return { text: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/30" };
    }
    return { text: "Required", className: "" }; // Default for draft/not started
  };
  
  const kycBadgeConfig = getKYCBadge();
  
  // Check if user can claim referral code
  useEffect(() => {
    const checkReferralStatus = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('referral_links_new')
        .select('sponsor_id, locked_at')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (!error && (!data?.sponsor_id || !data?.locked_at)) {
        setCanClaimReferral(true);
      }
    };
    
    checkReferralStatus();
  }, [user]);
  
  // Note: Profile is protected by UserRoute, no need for additional redirect check

  const handleBack = () => {
    navigate("/app/home");
  };

  const handleSignOut = async () => {
    try {
      // 1. Sign out from Supabase
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.auth.signOut();
      
      // 2. Clear ALL onboarding and user-related state
      localStorage.removeItem('ipg_onboarding_state');
      sessionStorage.removeItem('verificationEmail');
      localStorage.removeItem('ipg_user_email');
      localStorage.removeItem('ipg_wallet_address');
      
      console.log('[SIGN_OUT] Cleared all user session data');
      
      // 3. Navigate to root (which redirects to onboarding)
      navigate("/", { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if sign-out fails, clear local state and redirect
      localStorage.removeItem('ipg_onboarding_state');
      sessionStorage.removeItem('verificationEmail');
      localStorage.removeItem('ipg_user_email');
      navigate("/", { replace: true });
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
  useUsernameBackfill();
  const completionScore = completion?.completion_score || 0;
  
  // Diagnostic logging for debugging
  useEffect(() => {
    console.log('[PROFILE_HUB] Mounted', {
      hasUser: !!user,
      authLoading,
      userEmail: user?.email,
      userAppUsername: userApp?.username,
      walletAddress: userApp?.wallet_address,
      storedEmail: localStorage.getItem('ipg_user_email')
    });
  }, [user, authLoading, userApp]);
  
  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }
  

  return (
    <div className="space-y-6" data-testid="page-profile">
        {/* Premium Glassmorphic ID Card Preview */}
        {user && (
          <MiniIdCardPreview
            avatarUrl={avatarUrl || undefined}
            displayName={username}
            email={user.email || ''}
            badge={badge}
            userId={user.id || ''}
          />
        )}

        {/* Claim Referral Code Banner (if eligible) */}
        {canClaimReferral && (
          <Card 
            className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 backdrop-blur-xl border-amber-500/30 cursor-pointer hover:border-amber-500/50 transition-all"
            onClick={() => navigate('/app/profile/claim-referral')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Gift className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1">
                  Claim Your Referral Code
                </h3>
                <p className="text-xs text-muted-foreground">
                  Join a network • 7-day grace period
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </Card>
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
                        {section.id === 'kyc' ? (
                          <Badge variant="outline" className={`text-xs px-2 py-0 h-5 ${kycBadgeConfig.className}`}>
                            {kycBadgeConfig.text}
                          </Badge>
                        ) : section.badge && (
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

      {/* Quick Switch */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={handleQuickSwitchAction}
      />
    </div>
  );
}