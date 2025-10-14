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
    console.log('[DISPLAY_NAME] Computing display name:', {
      storageEmail,
      'userApp?.username': userApp?.username,
      'user?.email': user?.email,
      'userApp?.email': userApp?.email,
      'user?.id': user?.id
    });

    // Priority 1: Profile username (most reliable for authenticated users)
    if (userApp?.username) {
      console.log('[DISPLAY_NAME] Using userApp.username:', userApp.username);
      return userApp.username;
    }

    // Priority 2: Profile full_name (if set and not default)
    if (userApp?.full_name && userApp.full_name !== 'User') {
      console.log('[DISPLAY_NAME] Using userApp.full_name:', userApp.full_name);
      return userApp.full_name;
    }

    // Priority 3: Cached email during onboarding (ONLY if user is not authenticated yet)
    if (storageEmail && !user?.id) {
      const name = extractUsernameFromEmail(storageEmail, undefined);
      console.log('[DISPLAY_NAME] Using storageEmail (onboarding):', name);
      return name;
    }
    
    // Priority 4: Fallback with user ID (never show email for authenticated users)
    if (user?.id) {
      const fallback = `user${user.id.slice(0, 6)}`;
      console.log('[DISPLAY_NAME] Using user ID fallback:', fallback);
      return fallback;
    }
    
    console.log('[DISPLAY_NAME] Using default: User');
    return "User";
  }, [userApp?.username, userApp?.full_name, user?.id, storageEmail]);

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
