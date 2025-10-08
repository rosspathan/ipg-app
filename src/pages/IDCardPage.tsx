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

export function IDCardPage() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { userApp } = useProfile();
  const { uploadAvatar, getAvatarUrl, uploading } = useAvatar();
  const { referralCode } = useReferrals();

  useUsernameBackfill(); // Backfill username if missing

  const handleBack = () => navigate("/app/profile");

  if (!user) {
    return null;
  }

  const avatarUrl = getAvatarUrl('1x');
  const displayName = useDisplayName();
  
  // For now, default to Gold tier - this should come from user's actual tier
  const currentTier: BadgeTier = 'Gold';
  const qrCode = referralCode?.code || user.id;

  const userData = {
    id: user.id,
    displayName,
    email: user.email || '',
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
            currentTier={currentTier}
            qrCode={qrCode}
            onAvatarUpload={uploadAvatar}
            uploadingAvatar={uploading}
          />
        </div>
      </div>
      <div data-testid="dev-ribbon" className="fixed top-1 right-1 z-50 text-[10px] px-2 py-1 rounded bg-emerald-600/80 text-white" data-version="clean-slate-v1">
        CLEAN-SLATE v1
      </div>
    </div>
  );
}