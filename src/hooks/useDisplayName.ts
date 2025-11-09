import { useMemo, useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { extractUsernameFromEmail } from "@/lib/user/username";

/**
 * useDisplayName
 * Consistently derive a user-facing display name across the app.
 * 
 * Priority (Web3-first):
 * 0. Web3 wallet-linked profile username (if wallet connected)
 * 1. Profile username (for auth session)
 * 2. Profile full_name (if set and not default)
 * 3. Storage email during onboarding (only if not authenticated)
 * 4. User ID fallback
 * 
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

  // Clear stale storageEmail if user is authenticated
  useEffect(() => {
    if (user?.id && storageEmail && storageEmail !== user.email) {
      try {
        sessionStorage.removeItem('verificationEmail');
        localStorage.removeItem('ipg_onboarding_state');
        setStorageEmail(null);
        console.log('[DISPLAY_NAME] Cleared stale storageEmail for authenticated user');
      } catch (e) {
        console.error('[DISPLAY_NAME] Failed to clear storage:', e);
      }
    }
  }, [user?.id, user?.email, storageEmail]);

  const displayName = useMemo(() => {
    // Auth-first: Always use user data when authenticated
    if (user?.id) {
      // Priority 1: Profile display_name or username
      if (userApp?.display_name) {
        return userApp.display_name;
      }
      
      if (userApp?.username) {
        return userApp.username;
      }
      
      // Priority 2: Extract from user email
      if (user.email) {
        return extractUsernameFromEmail(user.email, user.id);
      }
      
      // Priority 3: Fallback with user ID
      return `user${user.id.slice(0, 6)}`;
    }

    // Only during onboarding (before auth complete)
    if (storageEmail) {
      return extractUsernameFromEmail(storageEmail, undefined);
    }
    
    return "User";
  }, [user?.id, user?.email, userApp?.display_name, userApp?.username, storageEmail]);

  return displayName;
}
