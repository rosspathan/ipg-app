import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { useAvatar } from "@/hooks/useAvatar";
import { useReferrals } from "@/hooks/useReferrals";
import { BadgeIdCardSheet } from "@/components/badge-id/BadgeIdCardSheet";
import { BadgeTier } from "@/components/badge-id/BadgeIdThemeRegistry";

export function IDCardPage() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { userApp } = useProfile();
  const { uploadAvatar, getAvatarUrl, uploading } = useAvatar();
  const { referralCode } = useReferrals();

  const handleBack = () => navigate("/app/profile");

  if (!user) {
    return null;
  }

  const avatarUrl = getAvatarUrl('1x');
  const displayName = user?.email?.split('@')[0] || 'User';
  
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

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-idcard">
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
    </div>
  );
}