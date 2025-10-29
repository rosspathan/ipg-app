import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { useAvatar } from "@/hooks/useAvatar";
import { useReferrals } from "@/hooks/useReferrals";
import { BadgeIdCardSheet } from "@/components/badge-id/BadgeIdCardSheet";
import { BadgeTier } from "@/components/badge-id/BadgeIdThemeRegistry";
import { useDisplayName } from "@/hooks/useDisplayName";
import { useUsernameBackfill } from "@/hooks/useUsernameBackfill";
import { useUserBSKBalance } from "@/hooks/useUserBSKBalance";
import { useUserBadge } from "@/hooks/useUserBadge";

export function IDCardPage() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { userApp } = useProfile();
  const { uploadAvatar, getAvatarUrl, uploading } = useAvatar();
  const { referralCode } = useReferrals();
  const { balance } = useUserBSKBalance();
  const { badge: userBadge, loading: badgeLoading } = useUserBadge();

  useUsernameBackfill(); // Backfill username if missing

  const handleBack = () => navigate("/app/profile");

  // Render even if user is not authenticated; build safe fallbacks
  const isAuthed = !!user;

  const avatarUrl = getAvatarUrl('1x');
  const displayName = useDisplayName();
  
  // Build safe fallbacks for unauthenticated preview
  let email = '';
  try {
    email = user?.email || (userApp?.email as string | undefined) || sessionStorage.getItem('verificationEmail') || '';
  } catch {}
  
  const userId = user?.id || (userApp as any)?.user_id || `guest-${Math.random().toString(36).slice(2, 8)}`;
  
  // Use centralized badge logic from useUserBadge hook
  const currentTier: BadgeTier = (badgeLoading || !userBadge || userBadge === 'None') 
    ? 'Silver' 
    : (userBadge as BadgeTier);
  
  const purchasedBadges: BadgeTier[] = [currentTier];
  
  const qrCode = referralCode?.code || userId;

  const userData = {
    id: userId,
    displayName,
    email,
    avatarUrl: avatarUrl || undefined,
    joinDate: userApp?.created_at || new Date().toISOString(),
  };


  React.useEffect(() => {
    console.info('CLEAN_SLATE_APPLIED');
  }, []);

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-idcard" data-version="clean-slate-v1">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            data-testid="backlink-bar"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Badge ID Card</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-heading mb-2">
              Your i-SMART Badge ID
            </h1>
            <p className="text-sm text-muted-foreground">
              Generate and export your premium membership card
            </p>
            <span data-testid="idcard-username" className="text-sm font-semibold">
              {displayName}
            </span>
          </div>

          <BadgeIdCardSheet
            user={userData}
            currentTier={currentTier || 'Silver'}
            purchasedBadges={purchasedBadges}
            qrCode={qrCode}
            onAvatarUpload={isAuthed ? uploadAvatar : async () => {}}
            uploadingAvatar={isAuthed ? uploading : false}
            balances={{
              withdrawable: balance?.withdrawable || 0,
              holding: balance?.holding || 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}