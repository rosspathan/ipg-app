import { useMemo } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { extractUsernameFromEmail } from "@/lib/user/username";

/**
 * useDisplayName
 * Consistently derive a user-facing display name across the app.
 * Priority: session email local-part > profile.full_name > profile.email local-part > "User"
 * 
 * Enhanced: Now uses extractUsernameFromEmail for proper sanitization
 */
export function useDisplayName() {
  const { user } = useAuthUser();
  const { userApp } = useProfile();

  const displayName = useMemo(() => {
    // Priority 1: Session email (most reliable)
    if (user?.email) {
      return extractUsernameFromEmail(user.email, user.id);
    }

    // Priority 2: Profile username (persisted)
    const profileUsername = (userApp as any)?.username as string | undefined;
    if (profileUsername && profileUsername !== 'User') {
      return profileUsername;
    }
    
    // Priority 3: Profile full_name (if set)
    if (userApp?.full_name && userApp.full_name !== 'User') {
      return userApp.full_name;
    }
    
    // Priority 4: Profile email
    if (userApp?.email) {
      return extractUsernameFromEmail(userApp.email, user?.id);
    }

    // Priority 5: Email captured during verification (standalone flow)
    try {
      const verifyEmail = sessionStorage.getItem('verificationEmail');
      if (verifyEmail) {
        return extractUsernameFromEmail(verifyEmail, user?.id);
      }
    } catch {}

    // Priority 6: Onboarding email stored locally (pre-auth)
    try {
      const raw = localStorage.getItem('ipg_onboarding_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        const onboardingEmail = parsed?.email as string | undefined;
        if (onboardingEmail) {
          return extractUsernameFromEmail(onboardingEmail, user?.id);
        }
      }
    } catch {}
    
    // Fallback with user ID if available
    if (user?.id) {
      return `user${user.id.slice(0, 6)}`;
    }
    
    return "User";
  }, [user?.email, user?.id, userApp?.email, userApp?.full_name, (userApp as any)?.username]);

  return displayName;
}
