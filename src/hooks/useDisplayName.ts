import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { extractUsernameFromEmail } from "@/lib/user/username";

/**
 * useDisplayName
 * Consistently derive a user-facing display name across the app.
 * Priority: session email local-part > profile.username > profile.full_name > profile.email local-part > verificationEmail > onboarding email > userId fallback > "User"
 */
export function useDisplayName() {
  const { user } = useAuthUser();
  const { userApp } = useProfile();
  const [tick, setTick] = useState(0);

  // Recompute on profile:updated events
  useEffect(() => {
    const onUpd = () => setTick((t) => t + 1);
    window.addEventListener('profile:updated', onUpd);
    return () => window.removeEventListener('profile:updated', onUpd);
  }, []);

  const displayName = useMemo(() => {
    // 1) Session email (most reliable)
    if (user?.email) {
      return extractUsernameFromEmail(user.email, user.id);
    }

    // 2) Profile username (persisted)
    const profileUsername = (userApp as any)?.username as string | undefined;
    if (profileUsername && profileUsername !== 'User') {
      return profileUsername;
    }

    // 3) Profile full_name (if set)
    if (userApp?.full_name && userApp.full_name !== 'User') {
      return userApp.full_name;
    }

    // 4) Profile email
    if (userApp?.email) {
      return extractUsernameFromEmail(userApp.email, user?.id);
    }

    // 5) Email captured during verification (standalone flow)
    try {
      const verifyEmail = sessionStorage.getItem('verificationEmail');
      if (verifyEmail) {
        return extractUsernameFromEmail(verifyEmail, user?.id);
      }
    } catch {}

    // 6) Onboarding email stored locally (pre-auth)
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

    // 7) Fallback with user ID if available
    if (user?.id) {
      return `user${user.id.slice(0, 6)}`;
    }

    return "User";
  }, [user?.email, user?.id, userApp?.email, userApp?.full_name, (userApp as any)?.username, tick]);

  // Debug log
  useEffect(() => {
    const mask = (e?: string | null) => {
      if (!e) return '***@***.***';
      const [n, d] = e.split('@');
      return `${(n||'').slice(0,2)}***@***${d ? d.slice(-3) : ''}`;
    };
    console.info('[USERNAME_HOOK_DEBUG]', {
      maskedEmail: mask(user?.email ?? null),
      profileEmail: mask(userApp?.email ?? null),
      profileUsername: (userApp as any)?.username,
      profileFullName: userApp?.full_name,
      displayName
    });
  }, [displayName, user?.email, userApp?.email, (userApp as any)?.username, userApp?.full_name]);

  return displayName;
}
