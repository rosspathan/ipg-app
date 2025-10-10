import { useMemo, useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { extractUsernameFromEmail } from "@/lib/user/username";

/**
 * useDisplayName
 * Consistently derive a user-facing display name across the app.
 * Priority: profile.username > session email > profile.full_name > profile.email > cached verification email > fallback
 * Reacts to verification:email-updated, storage, and window focus events.
 */
export function useDisplayName() {
  const { user } = useAuthUser();
  const { userApp } = useProfile();

  const [storageEmail, setStorageEmail] = useState<string | null>(() => {
    try {
      const ses = typeof window !== 'undefined' ? sessionStorage.getItem('verificationEmail') : null;
      if (ses) return ses;
      const raw = typeof window !== 'undefined' ? localStorage.getItem('ipg_onboarding_state') : null;
      if (raw) {
        try { return JSON.parse(raw)?.email || null; } catch {}
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    const read = () => {
      try {
        const ses = sessionStorage.getItem('verificationEmail');
        if (ses) { setStorageEmail(ses); return; }
        const raw = localStorage.getItem('ipg_onboarding_state');
        if (raw) {
          try { setStorageEmail(JSON.parse(raw)?.email || null); return; } catch {}
        }
        setStorageEmail(null);
      } catch {}
    };

    const onCustom = () => read();
    const onStorage = () => read();
    const onFocus = () => read();

    window.addEventListener('verification:email-updated', onCustom);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('verification:email-updated', onCustom);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const displayName = useMemo(() => {
    // Priority 1: Cached email during verification/onboarding (override everything while onboarding)
    if (storageEmail) return extractUsernameFromEmail(storageEmail, user?.id);

    // Priority 2: Profile username (most reliable after onboarding)
    if (userApp?.username) return userApp.username;

    // Priority 3: Session email (authenticated users)
    if (user?.email) return extractUsernameFromEmail(user.email, user.id);
    
    // Priority 4: Profile full_name (if set)
    if (userApp?.full_name && userApp.full_name !== 'User') return userApp.full_name;
    
    // Priority 5: Profile email
    if (userApp?.email) return extractUsernameFromEmail(userApp.email, user?.id);
    
    // Fallback with user ID if available
    if (user?.id) return `user${user.id.slice(0, 6)}`;
    
    return "User";
  }, [userApp?.username, userApp?.full_name, userApp?.email, user?.email, user?.id, storageEmail]);

  useEffect(() => {
    try {
      console.info('[DISPLAY_NAME_RESOLVE]', {
        result: displayName,
        userId: user?.id,
        userEmail: user?.email,
        profileUsername: userApp?.username,
        profileEmail: userApp?.email,
        storageEmail
      });
    } catch {}
  }, [displayName, user?.id, user?.email, userApp?.username, userApp?.email, storageEmail]);

  return displayName;
}
